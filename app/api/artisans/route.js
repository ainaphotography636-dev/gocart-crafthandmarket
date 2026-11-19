import { NextResponse } from "next/server"
import { isR2Configured, listArtisanProfilesFromR2 } from "@/lib/r2"
import { storesDummyData } from "@/assets/assets"
import { isSupabaseConfigured } from "@/lib/supabase/config"
import { tryCreateServiceClient } from "@/utils/supabase/admin"
import { ensureClaimableLuxuryCatalog } from "@/app/actions/seed-claimable-artisans"
import { CLAIMABLE_ARTISAN_SEED } from "@/lib/claimableArtisanSeed"

export const runtime = "nodejs"

const CLAIMABLE_CODES = new Set(
  CLAIMABLE_ARTISAN_SEED.map((entry) => entry.artisanCode.toUpperCase())
)

function normalize(entry = {}, source = "local") {
  const artisanCode = String(
    entry.artisanCode ||
      `ART-${String(entry.username || entry.id || "000")
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "")
        .slice(0, 6)}`
  ).toUpperCase()

  return {
    id: entry.id || `artisan_${artisanCode}`,
    artisanCode,
    name: entry.name || "Untitled workshop",
    username: entry.username || "",
    description: entry.description || "",
    email: entry.email || "",
    contact: entry.contact || "",
    address: entry.address || "",
    region: entry.region || "",
    status: entry.status || "approved",
    isActive: entry.isActive !== false,
    claimable: Boolean(entry.claimable) || CLAIMABLE_CODES.has(artisanCode),
    logo: entry.logoUrl || entry.logo || "",
    logoUrl:
      entry.logoUrl ||
      (typeof entry.logo === "string" && entry.logo.startsWith("http")
        ? entry.logo
        : ""),
    profileUrl: entry.profileUrl || "",
    source: entry.source || source,
    syncedAt: entry.syncedAt || entry.updatedAt || entry.createdAt || "",
  }
}

async function listSupabaseArtisans() {
  if (!isSupabaseConfigured()) return []
  const supabase = tryCreateServiceClient()
  if (!supabase) return []

  const { data, error } = await supabase
    .from("artisans")
    .select(
      `
      id,
      artisan_code,
      workshop_name,
      username,
      description,
      logo_url,
      contact_phone,
      address,
      region,
      gi_tags,
      verification_status,
      is_active,
      updated_at,
      profiles:profile_id (
        email,
        full_name
      )
    `
    )
    .order("artisan_code", { ascending: true })

  if (error || !Array.isArray(data)) {
    console.error("Supabase artisan list failed:", error?.message || error)
    return []
  }

  return data.map((row) => {
    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles
    const code = String(row.artisan_code || "").toUpperCase()
    const verified =
      row.verification_status === "verified" && row.is_active !== false
    return normalize(
      {
        id: row.id,
        artisanCode: code,
        name: row.workshop_name || profile?.full_name || "Workshop",
        username: row.username || "",
        description: row.description || "",
        email: profile?.email || "",
        contact: row.contact_phone || "",
        address: row.address || row.region || "",
        region: row.region || "",
        status: verified ? "approved" : row.verification_status || "pending",
        isActive: row.is_active !== false,
        claimable: CLAIMABLE_CODES.has(code),
        logoUrl: row.logo_url || "",
        syncedAt: row.updated_at || "",
      },
      CLAIMABLE_CODES.has(code) ? "claimable" : "supabase"
    )
  })
}

export async function GET() {
  try {
    // Keep claimable demo profiles present for admin + public directory.
    await ensureClaimableLuxuryCatalog().catch(() => null)

    const byCode = new Map()
    const upsert = (raw, source) => {
      const artisan = normalize(raw, source)
      const existing = byCode.get(artisan.artisanCode)
      if (!existing) {
        byCode.set(artisan.artisanCode, artisan)
        return
      }
      const prefer =
        artisan.source === "claimable" ||
        artisan.source === "supabase" ||
        artisan.source === "r2"
          ? artisan
          : existing
      const other = prefer === artisan ? existing : artisan
      byCode.set(artisan.artisanCode, {
        ...other,
        ...prefer,
        logo: prefer.logo || other.logo,
        logoUrl: prefer.logoUrl || other.logoUrl,
        profileUrl: prefer.profileUrl || other.profileUrl,
        email: prefer.email || other.email,
        contact: prefer.contact || other.contact,
        claimable: prefer.claimable || other.claimable,
        source: prefer.source || other.source,
      })
    }

    let r2Configured = isR2Configured()
    let r2Count = 0

    const supabaseArtisans = await listSupabaseArtisans()
    supabaseArtisans.forEach((artisan) => upsert(artisan, artisan.source))

    if (r2Configured) {
      try {
        const profiles = await listArtisanProfilesFromR2()
        r2Count = profiles.length
        profiles.forEach((profile) => upsert(profile, "r2"))
      } catch (error) {
        r2Configured = false
        console.error("R2 artisan list failed:", error?.message || error)
      }
    }

    storesDummyData.forEach((store, index) =>
      upsert(
        {
          ...store,
          artisanCode: store.artisanCode || `ART${String(index + 1).padStart(3, "0")}`,
        },
        "demo"
      )
    )

    const artisans = [...byCode.values()].sort((a, b) =>
      a.name.localeCompare(b.name)
    )
    const claimableCount = artisans.filter((a) => a.claimable).length
    const supabaseCount = artisans.filter(
      (a) => a.source === "supabase" || a.source === "claimable"
    ).length

    return NextResponse.json({
      ok: true,
      r2Configured,
      r2Count,
      supabaseCount,
      claimableCount,
      source: supabaseCount
        ? "supabase"
        : r2Count
          ? "mixed"
          : "demo",
      artisans,
    })
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error?.message || "Failed to list artisans." },
      { status: 500 }
    )
  }
}
