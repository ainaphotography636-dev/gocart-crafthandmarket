import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import {
  getSupabasePublishableKey,
  getSupabaseUrl,
} from "@/lib/supabase/config"

/**
 * Server Supabase client for Server Components, Route Handlers, and Server Actions.
 * Refreshes the Auth session via cookies when needed.
 */
export async function createClient() {
  const url = getSupabaseUrl()
  const key = getSupabasePublishableKey()

  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY. Add them to .env.local."
    )
  }

  const cookieStore = await cookies()

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        } catch {
          // Called from a Server Component — middleware will refresh the session.
        }
      },
    },
  })
}
