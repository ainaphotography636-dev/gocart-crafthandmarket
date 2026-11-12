import { NextResponse } from "next/server"
import {
  ADMIN_ROLE_COOKIE,
  canAccessPath,
  isValidAdminRole,
  normalizeAdminRole,
} from "@/lib/adminPermissions"

/**
 * Edge middleware: gate /admin/* by the crafthand_admin_role cookie.
 * Until Clerk/NextAuth is wired to Prisma User.role, the cookie is the
 * active session role (set from the admin role switcher / staff page).
 */
export function middleware(request) {
  const { pathname } = request.nextUrl

  if (!pathname.startsWith("/admin")) {
    return NextResponse.next()
  }

  // Allow Next internals / static assets under admin if any
  if (pathname.startsWith("/admin/_next")) {
    return NextResponse.next()
  }

  const rawRole = request.cookies.get(ADMIN_ROLE_COOKIE)?.value
  const role = isValidAdminRole(rawRole) ? rawRole : normalizeAdminRole(rawRole)

  // Seed cookie on first visit so local/preview admin remains usable.
  const response = NextResponse.next()
  if (!isValidAdminRole(rawRole)) {
    response.cookies.set(ADMIN_ROLE_COOKIE, role, {
      path: "/",
      sameSite: "lax",
      httpOnly: false,
    })
  }

  if (!canAccessPath(role, pathname)) {
    const url = request.nextUrl.clone()
    url.pathname = "/admin"
    url.searchParams.set("denied", pathname)
    return NextResponse.redirect(url)
  }

  return response
}

export const config = {
  matcher: ["/admin/:path*"],
}
