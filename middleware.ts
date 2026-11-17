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
  isSupabaseConfigured,
  isSupabaseProtectedPath,
} from "@/lib/supabase/config"
import { updateSession } from "@/utils/supabase/middleware"

/**
 * Edge middleware:
 * 1) Refresh Supabase Auth cookies when configured
 * 2) Protect artisan/buyer routes that need a signed-in user
 * 3) Keep existing cookie-based admin RBAC for /admin/*
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const { supabaseResponse, user } = await updateSession(request)

  // --- Supabase-protected marketplace routes ---
  if (isSupabaseConfigured() && isSupabaseProtectedPath(pathname) && !user) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = "/auth/login"
    redirectUrl.searchParams.set("next", pathname)
    const redirect = NextResponse.redirect(redirectUrl)
    // Preserve refreshed auth cookies on the redirect response.
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirect.cookies.set(cookie.name, cookie.value)
    })
    return redirect
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
    const redirect = NextResponse.redirect(url)
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirect.cookies.set(cookie.name, cookie.value)
    })
    return redirect
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except static assets and images.
     * Required so Supabase can refresh sessions on navigations.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff2)$|ffmpeg/).*)",
  ],
}
