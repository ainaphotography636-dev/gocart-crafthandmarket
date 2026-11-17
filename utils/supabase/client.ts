import { createBrowserClient } from "@supabase/ssr"
import {
  getSupabasePublishableKey,
  getSupabaseUrl,
} from "@/lib/supabase/config"

/**
 * Browser Supabase client (Client Components).
 * Uses the publishable key — never import the service role key into client code.
 */
export function createClient() {
  const url = getSupabaseUrl()
  const key = getSupabasePublishableKey()

  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY. Add them to .env.local."
    )
  }

  return createBrowserClient(url, key)
}
