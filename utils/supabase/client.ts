import { createBrowserClient } from "@supabase/ssr"

/**
 * Browser Supabase client (Client Components).
 * Uses the anon key — never import the service role key into client code.
 */
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !anonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. Add them to .env.local."
    )
  }

  return createBrowserClient(url, anonKey)
}
