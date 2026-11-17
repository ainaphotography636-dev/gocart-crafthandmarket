import { NextResponse } from "next/server"
import { createClient } from "@/utils/supabase/server"
import { defaultPathForRole, normalizeMarketplaceRole } from "@/lib/supabase/roles"

/**
 * OAuth / email-confirm callback — exchanges the auth code for a session cookie.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const intent = searchParams.get("intent")
  const requestedNext = searchParams.get("next")

  const safeNext =
    requestedNext && requestedNext.startsWith("/") ? requestedNext : null

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      const role = normalizeMarketplaceRole(user?.user_metadata?.role)
      const fallback =
        intent === "artisan"
          ? "/store"
          : intent === "client"
            ? "/cart"
            : defaultPathForRole(role)

      return NextResponse.redirect(`${origin}${safeNext || fallback}`)
    }
  }

  return NextResponse.redirect(
    `${origin}/auth/login?error=auth_callback&intent=${intent || "client"}`
  )
}
