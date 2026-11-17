/**
 * Public site origin used for Auth email redirects.
 * Prefer NEXT_PUBLIC_APP_URL in production (crafthandmarket.com / Vercel URL).
 */
export function getAppSiteUrl() {
  const fromEnv = (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    ""
  )
    .trim()
    .replace(/\/$/, "")

  if (fromEnv) return fromEnv

  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin
  }

  return ""
}

export function buildAuthEmailRedirect({
  nextPath = "/shop",
  intent,
}: {
  nextPath?: string
  intent?: "client" | "artisan"
} = {}) {
  const origin = getAppSiteUrl()
  if (!origin) return undefined

  const params = new URLSearchParams()
  params.set("next", nextPath.startsWith("/") ? nextPath : `/${nextPath}`)
  if (intent) params.set("intent", intent)

  return `${origin}/auth/callback?${params.toString()}`
}
