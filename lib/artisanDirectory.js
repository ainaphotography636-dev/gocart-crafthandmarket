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
    status: entry.status || "approved",
    isActive: entry.isActive !== false,
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

  r2Profiles.forEach((profile) => upsert(profile, "r2"))
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
