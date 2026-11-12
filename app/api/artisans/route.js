import { NextResponse } from "next/server"
import { isR2Configured, listArtisanProfilesFromR2 } from "@/lib/r2"
import { storesDummyData } from "@/assets/assets"

export const runtime = "nodejs"

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
    status: entry.status || "approved",
    isActive: entry.isActive !== false,
    logo: entry.logoUrl || entry.logo || "",
    logoUrl:
      entry.logoUrl ||
      (typeof entry.logo === "string" && entry.logo.startsWith("http") ? entry.logo : ""),
    profileUrl: entry.profileUrl || "",
    source: entry.source || source,
    syncedAt: entry.syncedAt || entry.updatedAt || entry.createdAt || "",
  }
}

export async function GET() {
  try {
    const byCode = new Map()
    const upsert = (raw, source) => {
      const artisan = normalize(raw, source)
      const existing = byCode.get(artisan.artisanCode)
      if (!existing) {
        byCode.set(artisan.artisanCode, artisan)
        return
      }
      byCode.set(artisan.artisanCode, {
        ...existing,
        ...artisan,
        logo: artisan.logo || existing.logo,
        logoUrl: artisan.logoUrl || existing.logoUrl,
        profileUrl: artisan.profileUrl || existing.profileUrl,
        source:
          existing.source === "r2" || artisan.source === "r2"
            ? "r2"
            : artisan.source || existing.source,
      })
    }

    let r2Configured = isR2Configured()
    let r2Count = 0

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

    const artisans = [...byCode.values()].sort((a, b) => a.name.localeCompare(b.name))

    return NextResponse.json({
      ok: true,
      r2Configured,
      r2Count,
      source: r2Count ? "mixed" : "demo",
      artisans,
    })
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error?.message || "Failed to list artisans." },
      { status: 500 }
    )
  }
}
