import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
import {
  getSupabasePublishableKey,
  getSupabaseUrl,
} from "@/lib/supabase/config"

/**
 * Refresh the Supabase Auth session on every matched request and return
 * the updated response (with refreshed cookies) for the rest of middleware.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const url = getSupabaseUrl()
  const key = getSupabasePublishableKey()

  // Allow local/dev builds without Supabase until keys are configured.
  if (!url || !key) {
    return { supabaseResponse, user: null, supabase: null }
  }

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value)
        })
        supabaseResponse = NextResponse.next({
          request,
        })
        cookiesToSet.forEach(({ name, value, options }) => {
          supabaseResponse.cookies.set(name, value, options)
        })
      },
    },
  })

  // Important: avoid writing logic between createServerClient and getUser().
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return { supabaseResponse, user, supabase }
}
