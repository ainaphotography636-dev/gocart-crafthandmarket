/**
 * Shared helpers for detecting whether Supabase Auth is configured.
 */

export function isSupabaseConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
  )
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
