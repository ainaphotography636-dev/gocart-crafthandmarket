'use client'

import { listStores } from "@/lib/storeRegistry"
import { storesDummyData } from "@/assets/assets"
function normalizeArtisan(entry = {}, source = "local") {
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
    claimable: Boolean(entry.claimable),
    logo: entry.logoUrl || entry.logo || "",
    logoUrl: entry.logoUrl || (typeof entry.logo === "string" && entry.logo.startsWith("http") ? entry.logo : ""),
    profileUrl: entry.profileUrl || "",
    source: entry.source || source,
    syncedAt: entry.syncedAt || entry.updatedAt || entry.createdAt || "",
  }
}

/**
 * Merge R2 profiles with local registry + demo stores for a complete directory.
 */
export function mergeArtisanDirectories({ r2Profiles = [], includeDemo = true } = {}) {
  const byCode = new Map()

  const upsert = (raw, source) => {
    const artisan = normalizeArtisan(raw, source)
    if (!artisan.artisanCode) return
    const existing = byCode.get(artisan.artisanCode)
    if (!existing) {
      byCode.set(artisan.artisanCode, artisan)
      return
    }
    // Prefer R2 for media URLs, keep richest metadata.
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

  // Server payload may already include supabase/claimable/r2/demo rows.
  r2Profiles.forEach((profile) => upsert(profile, profile.source || "r2"))
  listStores().forEach((store) => upsert(store, "local"))
  if (includeDemo) {
    storesDummyData.forEach((store, index) =>
      upsert(
        {
          ...store,
          artisanCode: store.artisanCode || `ART${String(index + 1).padStart(3, "0")}`,
        },
        "demo"
      )
    )
  }

  return [...byCode.values()].sort((a, b) => a.name.localeCompare(b.name))
}

export async function fetchArtisanDirectory() {
  try {
    const response = await fetch("/api/artisans", { cache: "no-store" })
    const payload = await response.json().catch(() => ({}))
    if (response.ok && payload.ok && Array.isArray(payload.artisans)) {
      const r2Profiles = payload.artisans.filter((item) => item.source === "r2")
      const demoOrRemote = payload.artisans
      // Merge server artisans with browser-local workshop registrations.
      const artisans = mergeArtisanDirectories({
        r2Profiles: demoOrRemote,
        includeDemo: false,
      })
      // Keep demo entries if directory would otherwise be empty.
      const finalArtisans =
        artisans.length > 0
          ? artisans
          : mergeArtisanDirectories({ r2Profiles, includeDemo: true })

      return {
        artisans: finalArtisans,
        source: payload.source || "mixed",
        r2Configured: Boolean(payload.r2Configured),
        r2Count: payload.r2Count || 0,
      }
    }
  } catch {
    // Fall through to local merge.
  }

  return {
    artisans: mergeArtisanDirectories({ r2Profiles: [], includeDemo: true }),
    source: "local",
    r2Configured: false,
    r2Count: 0,
  }
}

export async function syncArtisanToR2(store) {
  const response = await fetch("/api/artisans/sync", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ store }),
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok || !payload.ok) {
    throw new Error(payload.error || "Could not sync artisan profile to Cloudflare R2.")
  }
  return payload.artisan
}
