import { NextResponse, type NextRequest } from "next/server"
import {
  ADMIN_PERMISSIONS_COOKIE,
  ADMIN_ROLE_COOKIE,
  canAccessPath,
  decodePermissionsCookie,
  isValidAdminRole,
  normalizeAdminRole,
} from "@/lib/adminPermissions"
import {
  isArtisanDashboardPath,
  isClientCheckoutPath,
  isSupabaseConfigured,
  isSupabasePublicException,
  roleGateRedirectPath,
} from "@/lib/supabase/config"
import { updateSession } from "@/utils/supabase/middleware"

function withAuthCookies(
  source: NextResponse,
  target: NextResponse
) {
  source.cookies.getAll().forEach((cookie) => {
    target.cookies.set(cookie.name, cookie.value)
  })
  return target
}

/**
 * Edge middleware:
 * 1) Refresh Supabase Auth cookies when configured
 * 2) Protect artisan dashboards by role; protect client order history
 * 3) Keep `/cart` and shop browsing public (auth is cart/checkout modal-driven)
 * 4) Keep existing cookie-based admin RBAC for /admin/*
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const { supabaseResponse, user } = await updateSession(request)

  if (isSupabaseConfigured() && !isSupabasePublicException(pathname)) {
    // Artisan / store dashboards — must be signed in as artisan.
    if (isArtisanDashboardPath(pathname)) {
      if (!user) {
        const redirectUrl = request.nextUrl.clone()
        redirectUrl.pathname = "/artisan/join"
        redirectUrl.searchParams.set("next", pathname)
        return withAuthCookies(
          supabaseResponse,
          NextResponse.redirect(redirectUrl)
        )
      }

      const roleRedirect = roleGateRedirectPath(
        pathname,
        user.user_metadata?.role
      )
      if (roleRedirect) {
        const redirectUrl = request.nextUrl.clone()
        const [path, query = ""] = roleRedirect.split("?")
        redirectUrl.pathname = path
        redirectUrl.search = query ? `?${query}` : ""
        return withAuthCookies(
          supabaseResponse,
          NextResponse.redirect(redirectUrl)
        )
      }
    }

    // Client order history — any signed-in user; modal handles cart/checkout.
    if (isClientCheckoutPath(pathname) && !user) {
      const redirectUrl = request.nextUrl.clone()
      redirectUrl.pathname = "/auth/login"
      redirectUrl.searchParams.set("intent", "client")
      redirectUrl.searchParams.set("next", pathname)
      return withAuthCookies(
        supabaseResponse,
        NextResponse.redirect(redirectUrl)
      )
    }
  }

  // --- Legacy admin cookie RBAC (unchanged behavior) ---
  if (!pathname.startsWith("/admin") || pathname.startsWith("/admin/_next")) {
    return supabaseResponse
  }

  const rawRole = request.cookies.get(ADMIN_ROLE_COOKIE)?.value
  const role = isValidAdminRole(rawRole) ? rawRole : normalizeAdminRole(rawRole)
  const permissions = decodePermissionsCookie(
    request.cookies.get(ADMIN_PERMISSIONS_COOKIE)?.value || ""
  )

  if (!isValidAdminRole(rawRole)) {
    supabaseResponse.cookies.set(ADMIN_ROLE_COOKIE, role, {
      path: "/",
      sameSite: "lax",
      httpOnly: false,
    })
  }

  if (!canAccessPath(role, pathname, permissions)) {
    const url = request.nextUrl.clone()
    url.pathname = "/admin"
    url.searchParams.set("denied", pathname)
    return withAuthCookies(supabaseResponse, NextResponse.redirect(url))
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff2)$|ffmpeg/).*)",
  ],
}
