/** Placeholder when an R2 / product image is missing or fails to load. */
export const MEDIA_PLACEHOLDER =
  "data:image/svg+xml," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="640" viewBox="0 0 640 640" fill="none">
      <rect width="640" height="640" fill="#FAF6F1"/>
      <rect x="48" y="48" width="544" height="544" rx="24" stroke="#B45309" stroke-opacity="0.25" stroke-width="2"/>
      <path d="M180 420 L280 300 L360 380 L420 320 L480 420 Z" fill="#047857" fill-opacity="0.18"/>
      <circle cx="250" cy="250" r="36" fill="#B45309" fill-opacity="0.25"/>
      <text x="320" y="500" text-anchor="middle" font-family="Georgia, serif" font-size="28" fill="#292524" fill-opacity="0.45">Crafthand</text>
    </svg>`
  )

export function getPublicR2BaseUrl() {
  const value =
    process.env.NEXT_PUBLIC_CLOUDFLARE_R2_PUBLIC_URL ||
    process.env.CLOUDFLARE_R2_PUBLIC_URL ||
    ""
  return value.trim().replace(/\/$/, "")
}

/**
 * Normalize a stored media value (full URL, R2 object key, or empty) into a
 * browser-loadable URL. Returns null when nothing usable is available.
 */
export function resolveMediaUrl(value?: string | null): string | null {
  const raw = String(value || "").trim()
  if (!raw) return null

  if (
    raw.startsWith("http://") ||
    raw.startsWith("https://") ||
    raw.startsWith("data:") ||
    raw.startsWith("blob:") ||
    raw.startsWith("/")
  ) {
    return raw
  }

  const base = getPublicR2BaseUrl()
  if (!base) return null
  return `${base}/${raw.replace(/^\//, "")}`
}

export function resolveMediaUrls(values?: Array<string | null | undefined> | null) {
  if (!Array.isArray(values)) return [] as string[]
  return values
    .map((value) => resolveMediaUrl(value))
    .filter((value): value is string => Boolean(value))
}

export function withMediaFallback(url?: string | null) {
  return resolveMediaUrl(url) || MEDIA_PLACEHOLDER
}
