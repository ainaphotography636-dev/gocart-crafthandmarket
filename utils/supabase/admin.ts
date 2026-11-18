import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { isSupabaseServiceConfigured } from "@/lib/supabase/config"

function getServiceRoleKey() {
  return (
    process.env.SUPABASE_SECRET_KEY?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    ""
  )
}

/**
 * Service-role Supabase client for trusted server-only operations
 * (webhooks, admin tooling, bypassing RLS). Never expose to the browser.
 */
export function createServiceClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const serviceRoleKey = getServiceRoleKey()

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY for the service client."
    )
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

export function tryCreateServiceClient(): SupabaseClient | null {
  if (!isSupabaseServiceConfigured()) return null
  try {
    return createServiceClient()
  } catch {
    return null
  }
}
