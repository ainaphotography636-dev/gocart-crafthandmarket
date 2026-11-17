"use server"

import { revalidatePath } from "next/cache"
import {
  isArtisanRole,
  normalizeMarketplaceRole,
  type AuthIntent,
  signupRoleForIntent,
} from "@/lib/supabase/roles"
import { isSupabaseConfigured } from "@/lib/supabase/config"
import { createClient } from "@/utils/supabase/server"

export type EnsureProfileResult =
  | { ok: true; role: string }
  | { ok: false; error: string }

/**
 * After client/artisan auth, ensure `profiles.role` matches the entry-point intent.
 * Never demotes artisans/admins when they authenticate through the client modal.
 */
export async function ensureProfileRole(
  intent: AuthIntent
): Promise<EnsureProfileResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Supabase is not configured." }
  }

  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { ok: false, error: "You must be signed in." }
  }

  const desired = signupRoleForIntent(intent)
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .maybeSingle()

  if (profileError) {
    return { ok: false, error: profileError.message }
  }

  const current = normalizeMarketplaceRole(profile?.role)
  let nextRole: "client" | "artisan" | "admin" = desired

  if (intent === "client" && isArtisanRole(current)) {
    // Keep maker privileges if an artisan uses client checkout auth.
    nextRole = current === "admin" ? "admin" : "artisan"
  }

  if (!profile) {
    const { error: insertError } = await supabase.from("profiles").insert({
      id: user.id,
      email: user.email,
      full_name:
        typeof user.user_metadata?.full_name === "string"
          ? user.user_metadata.full_name
          : "",
      role: nextRole,
    })
    if (insertError) {
      return { ok: false, error: insertError.message }
    }
  } else if (current !== nextRole) {
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ role: nextRole })
      .eq("id", user.id)
    if (updateError) {
      return { ok: false, error: updateError.message }
    }
  }

  // Keep JWT metadata aligned for middleware role checks.
  await supabase.auth.updateUser({
    data: {
      role: nextRole,
      full_name:
        typeof user.user_metadata?.full_name === "string"
          ? user.user_metadata.full_name
          : undefined,
    },
  })

  revalidatePath("/", "layout")
  return { ok: true, role: nextRole }
}
