import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

/**
 * Connect-style helper: build a Supabase server client bound to the request
 * and return the response that carries refreshed auth cookies.
 *
 * Prefer `updateSession()` from the root middleware — it also calls
 * `supabase.auth.getUser()` so sessions stay refreshed (required by @supabase/ssr).
 */
export function createClient(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  if (!supabaseUrl || !supabaseKey) {
    return { supabase: null, supabaseResponse }
  }

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
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

  return { supabase, supabaseResponse }
}

/**
 * Refresh the Supabase Auth session on every matched request and return
 * the updated response (with refreshed cookies) for the rest of middleware.
 */
export async function updateSession(request: NextRequest) {
  const { supabase, supabaseResponse } = createClient(request)

  if (!supabase) {
    return { supabaseResponse, user: null, supabase: null }
  }

  // Important: avoid writing logic between createServerClient and getUser().
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return { supabaseResponse, user, supabase }
}
