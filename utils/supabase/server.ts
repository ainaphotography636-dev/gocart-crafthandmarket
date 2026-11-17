import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

type CookieStore = Awaited<ReturnType<typeof cookies>>

/**
 * Server Supabase client for Server Components, Route Handlers, and Server Actions.
 * Matches Supabase Connect → Next.js App Router.
 *
 * Prefer `await createClient()` (reads cookies internally).
 * `createClient(cookieStore)` is also supported for Connect-style call sites.
 */
export async function createClient(cookieStore?: CookieStore) {
  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY. Add them to .env.local."
    )
  }

  const store = cookieStore ?? (await cookies())

  return createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return store.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            store.set(name, value, options)
          })
        } catch {
          // Called from a Server Component — middleware will refresh the session.
        }
      },
    },
  })
}
