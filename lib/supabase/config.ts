/**
 * Shared helpers for detecting whether Supabase Auth is configured,
 * plus role-aware route protection rules.
 */

import { isArtisanRole, normalizeMarketplaceRole } from "@/lib/supabase/roles"

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
    isSupabaseConfigured() &&
      (process.env.SUPABASE_SECRET_KEY?.trim() ||
        process.env.SUPABASE_SERVICE_ROLE_KEY?.trim())
  )
}

/** Routes that require any signed-in Supabase user. */
export const SUPABASE_AUTH_REQUIRED_PREFIXES = ["/orders"] as const

/**
 * Artisan dashboard prefixes — require artisan (or admin) role.
 * Public join/login entry points are listed in exceptions.
 */
export const SUPABASE_ARTISAN_PREFIXES = ["/artisan", "/store"] as const

/** Public exceptions under otherwise-protected prefixes. */
export const SUPABASE_PUBLIC_EXCEPTIONS = [
  "/store/login",
  "/create-store",
  "/artisan/join",
  "/artisan/login",
] as const

/** @deprecated Prefer specific helpers below — kept for older imports. */
export const SUPABASE_PROTECTED_PREFIXES = [
  ...SUPABASE_AUTH_REQUIRED_PREFIXES,
  ...SUPABASE_ARTISAN_PREFIXES,
] as const

function matchesPrefix(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`)
}

export function isSupabasePublicException(pathname: string) {
  return SUPABASE_PUBLIC_EXCEPTIONS.some((path) => matchesPrefix(pathname, path))
}

export function isSupabaseProtectedPath(pathname: string) {
  if (isSupabasePublicException(pathname)) return false
  return SUPABASE_PROTECTED_PREFIXES.some((prefix) => matchesPrefix(pathname, prefix))
}

export function isArtisanDashboardPath(pathname: string) {
  if (isSupabasePublicException(pathname)) return false
  return SUPABASE_ARTISAN_PREFIXES.some((prefix) => matchesPrefix(pathname, prefix))
}

export function isClientCheckoutPath(pathname: string) {
  return SUPABASE_AUTH_REQUIRED_PREFIXES.some((prefix) =>
    matchesPrefix(pathname, prefix)
  )
}

/**
 * Decide middleware redirect for a signed-in user hitting a role-gated path.
 * Returns null when access is allowed.
 */
export function roleGateRedirectPath(
  pathname: string,
  roleMetadata: unknown
): string | null {
  const role = normalizeMarketplaceRole(roleMetadata)

  if (isArtisanDashboardPath(pathname)) {
    if (!isArtisanRole(role)) {
      return `/artisan/join?next=${encodeURIComponent(pathname)}`
    }
  }

  return null
}
