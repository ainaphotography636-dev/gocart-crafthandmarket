/**
 * Marketplace auth roles for Crafthand Market.
 * `client` is the shopper role; `buyer` is kept as a legacy synonym.
 */

export const MARKETPLACE_ROLES = ["client", "buyer", "artisan", "admin"] as const

export type MarketplaceRole = (typeof MARKETPLACE_ROLES)[number]

export type AuthIntent = "client" | "artisan"

export function normalizeMarketplaceRole(
  value: unknown
): MarketplaceRole | null {
  const role = String(value || "")
    .trim()
    .toLowerCase()
  if (role === "client" || role === "buyer" || role === "artisan" || role === "admin") {
    return role
  }
  return null
}

export function isClientRole(role: unknown) {
  const normalized = normalizeMarketplaceRole(role)
  return normalized === "client" || normalized === "buyer"
}

export function isArtisanRole(role: unknown) {
  const normalized = normalizeMarketplaceRole(role)
  return normalized === "artisan" || normalized === "admin"
}

export function defaultPathForRole(role: unknown) {
  if (isArtisanRole(role)) return "/store"
  if (isClientRole(role)) return "/cart"
  return "/shop"
}

/** Role written into Auth user_metadata + profiles on signup. */
export function signupRoleForIntent(intent: AuthIntent): "client" | "artisan" {
  return intent === "artisan" ? "artisan" : "client"
}
