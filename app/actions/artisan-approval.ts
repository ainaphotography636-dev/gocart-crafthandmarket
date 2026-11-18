"use server"

import { revalidatePath } from "next/cache"
import { isSupabaseConfigured } from "@/lib/supabase/config"
import { tryCreateServiceClient } from "@/utils/supabase/admin"
import { createClient } from "@/utils/supabase/server"

export type ArtisanApprovalResult =
  | {
      ok: true
      artisan: {
        id: string
        username: string
        workshopName: string
        verificationStatus: string
        isActive: boolean
      }
      source: "supabase"
    }
  | {
      ok: false
      code: "SUPABASE_UNAVAILABLE" | "NOT_FOUND" | "UPDATE" | "UNAUTHORIZED"
      error: string
    }

/**
 * Mark a workshop verified + active in Supabase so it (and its published
 * products) appear on the public storefront. Prefer matching by username.
 */
export async function approveArtisanInSupabase(input: {
  username?: string | null
  artisanCode?: string | null
  email?: string | null
  status?: "approved" | "rejected"
}): Promise<ArtisanApprovalResult> {
  if (!isSupabaseConfigured()) {
    return {
      ok: false,
      code: "SUPABASE_UNAVAILABLE",
      error: "Supabase is not configured.",
    }
  }

  const status = input.status || "approved"
  const username = String(input.username || "")
    .trim()
    .toLowerCase()
  const artisanCode = String(input.artisanCode || "")
    .trim()
    .toUpperCase()
  const email = String(input.email || "")
    .trim()
    .toLowerCase()

  if (!username && !artisanCode && !email) {
    return {
      ok: false,
      code: "NOT_FOUND",
      error: "Provide a workshop username, artisan code, or email.",
    }
  }

  // Prefer service role so admin tooling works even without an auth session.
  const admin = tryCreateServiceClient()
  const supabase = admin || (await createClient())

  if (!admin) {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return {
        ok: false,
        code: "UNAUTHORIZED",
        error: "Sign in as admin, or configure the Supabase service role key.",
      }
    }
  }

  let query = supabase.from("artisans").select(
    "id, username, workshop_name, verification_status, is_active, artisan_code, profile_id"
  )

  if (username) {
    query = query.eq("username", username)
  } else if (artisanCode) {
    query = query.eq("artisan_code", artisanCode)
  }

  let { data: artisan, error } = await query.maybeSingle()

  if ((!artisan || error) && email) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", email)
      .maybeSingle()

    if (profile?.id) {
      const byProfile = await supabase
        .from("artisans")
        .select(
          "id, username, workshop_name, verification_status, is_active, artisan_code, profile_id"
        )
        .eq("profile_id", profile.id)
        .maybeSingle()
      artisan = byProfile.data
      error = byProfile.error
    }
  }

  if (error || !artisan) {
    return {
      ok: false,
      code: "NOT_FOUND",
      error:
        error?.message ||
        "No matching Supabase artisan workshop found. Ask the artisan to sign in and save a product once first.",
    }
  }

  const nextStatus =
    status === "approved"
      ? { verification_status: "verified", is_active: true }
      : { verification_status: "rejected", is_active: false }

  const { data: updated, error: updateError } = await supabase
    .from("artisans")
    .update(nextStatus)
    .eq("id", artisan.id)
    .select("id, username, workshop_name, verification_status, is_active")
    .single()

  if (updateError || !updated) {
    return {
      ok: false,
      code: "UPDATE",
      error: updateError?.message || "Could not update artisan verification.",
    }
  }

  // When approving, publish any draft products that already have enough photos.
  if (status === "approved") {
    const { data: drafts } = await supabase
      .from("products")
      .select("id, images")
      .eq("artisan_id", artisan.id)
      .eq("is_published", false)

    const readyIds = (drafts || [])
      .filter((row) => Array.isArray(row.images) && row.images.length >= 4)
      .map((row) => row.id)

    if (readyIds.length) {
      await supabase
        .from("products")
        .update({ is_published: true, in_stock: true })
        .in("id", readyIds)
    }
  }

  revalidatePath("/")
  revalidatePath("/shop")
  revalidatePath("/artisans")
  revalidatePath(`/shop/${updated.username}`)

  return {
    ok: true,
    source: "supabase",
    artisan: {
      id: updated.id,
      username: updated.username,
      workshopName: updated.workshop_name,
      verificationStatus: updated.verification_status,
      isActive: updated.is_active,
    },
  }
}
