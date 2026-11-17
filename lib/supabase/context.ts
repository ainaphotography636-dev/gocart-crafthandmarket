import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import {
  createAdminClient,
  createContextClient,
  verifyCredentials,
} from "@supabase/server/core"
import type {
  AuthModeWithKey,
  SupabaseContext,
  SupabaseEnv,
} from "@supabase/server"

/**
 * Bridge Next.js / Connect env names into Partial<SupabaseEnv> for
 * `@supabase/server` core primitives.
 *
 * Prefer Connect server names (`SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`,
 * `SUPABASE_SECRET_KEY`) and fall back to the App Router public aliases.
 */
function resolveNextEnv(): Partial<SupabaseEnv> {
  const url =
    process.env.SUPABASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()

  const publishableKey =
    process.env.SUPABASE_PUBLISHABLE_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()

  const secretKey =
    process.env.SUPABASE_SECRET_KEY?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()

  return {
    url: url || undefined,
    publishableKeys: publishableKey ? { default: publishableKey } : {},
    secretKeys: secretKey ? { default: secretKey } : {},
  }
}

let cachedJwks: SupabaseEnv["jwks"] = null

async function getJwks(supabaseUrl: string): Promise<SupabaseEnv["jwks"]> {
  if (cachedJwks) return cachedJwks

  const jwksUrl =
    process.env.SUPABASE_JWKS_URL?.trim() ||
    `${supabaseUrl.replace(/\/$/, "")}/auth/v1/.well-known/jwks.json`

  try {
    const res = await fetch(jwksUrl)
    if (!res.ok) return null
    cachedJwks = (await res.json()) as SupabaseEnv["jwks"]
    return cachedJwks
  } catch {
    return null
  }
}

/**
 * Next.js adapter: compose `@supabase/ssr` cookie session with
 * `@supabase/server` JWT verification + typed clients.
 *
 * Requires root middleware to refresh the Auth cookie via `updateSession()`.
 */
export async function createSupabaseContext(
  options: { auth?: AuthModeWithKey | AuthModeWithKey[] } = { auth: "user" }
): Promise<
  { data: SupabaseContext; error: null } | { data: null; error: Error }
> {
  const nextEnv = resolveNextEnv()

  if (!nextEnv.url || !nextEnv.publishableKeys?.default) {
    return {
      data: null,
      error: new Error(
        "Missing SUPABASE_URL / NEXT_PUBLIC_SUPABASE_URL or SUPABASE_PUBLISHABLE_KEY / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"
      ),
    }
  }

  const cookieStore = await cookies()
  const ssrClient = createServerClient(
    nextEnv.url,
    nextEnv.publishableKeys.default,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options: cookieOptions }) => {
              cookieStore.set(name, value, cookieOptions)
            })
          } catch {
            // Server Components can't write cookies — middleware handles it.
          }
        },
      },
    }
  )

  const {
    data: { session },
  } = await ssrClient.auth.getSession()
  const token = session?.access_token ?? null

  const jwks = await getJwks(nextEnv.url)
  const env: Partial<SupabaseEnv> = { ...nextEnv, jwks }

  const { data: auth, error } = await verifyCredentials(
    { token, apikey: null },
    { auth: options.auth ?? "user", env }
  )

  if (error) {
    return { data: null, error }
  }

  const supabase = createContextClient({
    auth: { token: auth!.token },
    env,
  })
  const supabaseAdmin = createAdminClient({ env })

  return {
    data: {
      supabase,
      supabaseAdmin,
      userClaims: auth!.userClaims,
      jwtClaims: auth!.jwtClaims,
      authMode: auth!.authMode,
    },
    error: null,
  }
}
