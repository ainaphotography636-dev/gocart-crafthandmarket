/**
 * Shared helpers for detecting whether Supabase Auth is configured.
 *
 * Supabase Connect (Next.js App Router) uses NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.
 * NEXT_PUBLIC_SUPABASE_ANON_KEY remains supported as a legacy alias.
 */

export function getSupabaseUrl() {
  return process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || ""
}

/** Publishable (or legacy anon) public client key — safe for the browser. */
export function getSupabasePublishableKey() {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
    ""
  )
}

export function isSupabaseConfigured() {
  return Boolean(getSupabaseUrl() && getSupabasePublishableKey())
}

export function isSupabaseServiceConfigured() {
  return Boolean(
    isSupabaseConfigured() && process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  )
}

/** Routes that require a signed-in Supabase user when Auth is enabled. */
export const SUPABASE_PROTECTED_PREFIXES = [
  "/store",
  "/artisan",
  "/orders",
  "/cart",
] as const

/** Public exceptions under otherwise-protected prefixes. */
export const SUPABASE_PUBLIC_EXCEPTIONS = [
  "/store/login",
  "/create-store",
] as const

export function isSupabaseProtectedPath(pathname: string) {
  if (SUPABASE_PUBLIC_EXCEPTIONS.some((path) => pathname === path || pathname.startsWith(`${path}/`))) {
    return false
  }
  return SUPABASE_PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  )
}
