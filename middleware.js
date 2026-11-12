import { NextResponse } from "next/server"
import {
  ADMIN_PERMISSIONS_COOKIE,
  ADMIN_ROLE_COOKIE,
  canAccessPath,
  decodePermissionsCookie,
  isValidAdminRole,
  normalizeAdminRole,
} from "@/lib/adminPermissions"

/**
 * Edge middleware: gate /admin/* by role + optional custom permission cookie.
 */
export function middleware(request) {
  const { pathname } = request.nextUrl

  if (!pathname.startsWith("/admin")) {
    return NextResponse.next()
  }

  if (pathname.startsWith("/admin/_next")) {
    return NextResponse.next()
  }

  const rawRole = request.cookies.get(ADMIN_ROLE_COOKIE)?.value
  const role = isValidAdminRole(rawRole) ? rawRole : normalizeAdminRole(rawRole)
  const permissions = decodePermissionsCookie(
    request.cookies.get(ADMIN_PERMISSIONS_COOKIE)?.value || ""
  )

  const response = NextResponse.next()
  if (!isValidAdminRole(rawRole)) {
    response.cookies.set(ADMIN_ROLE_COOKIE, role, {
      path: "/",
      sameSite: "lax",
      httpOnly: false,
    })
  }

  if (!canAccessPath(role, pathname, permissions)) {
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
