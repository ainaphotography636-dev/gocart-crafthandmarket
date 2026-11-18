"use server"

import { revalidatePath } from "next/cache"
import { isSupabaseConfigured } from "@/lib/supabase/config"
import { tryCreateServiceClient } from "@/utils/supabase/admin"
import { createClient } from "@/utils/supabase/server"

export type SyncProductMediaResult =
  | { ok: true; updated: number }
  | { ok: false; error: string }

/**
 * Attach R2 image/video URLs to existing storefront products by SKU.
 * Used when a workshop has media in the browser catalog but the Supabase
 * row was created without images (e.g. earlier schema/insert failures).
 */
export async function syncProductMediaBySku(
  items: Array<{
    sku?: string | null
    images?: string[] | null
    video?: string | null
    logoUrl?: string | null
    username?: string | null
  }>
): Promise<SyncProductMediaResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Supabase is not configured." }
  }

  const rows = Array.isArray(items) ? items : []
  if (!rows.length) return { ok: true, updated: 0 }

  const admin = tryCreateServiceClient()
  const supabase = admin || (await createClient())

  let updated = 0

  for (const row of rows) {
    const sku = String(row.sku || "").trim()
    const images = Array.isArray(row.images)
      ? row.images.map((url) => String(url || "").trim()).filter(Boolean)
      : []
    const video = row.video ? String(row.video).trim() : null
    const logoUrl = row.logoUrl ? String(row.logoUrl).trim() : null
    const username = row.username ? String(row.username).trim().toLowerCase() : ""

    if (sku && images.length) {
      let { data: existing, error: lookupError } = await supabase
        .from("products")
        .select("id, images, image_urls, video_proof_url, item_video_url")
        .eq("sku", sku)
        .maybeSingle()

      if (lookupError && /column .* does not exist/i.test(lookupError.message)) {
        const retry = await supabase
          .from("products")
          .select("id, images, video_proof_url")
          .eq("sku", sku)
          .maybeSingle()
        existing = retry.data
          ? {
              ...retry.data,
              image_urls: null,
              item_video_url: null,
            }
          : null
      }

      if (existing?.id) {
        const currentImages = [
          ...(Array.isArray(existing.images) ? existing.images : []),
          ...(Array.isArray(existing.image_urls) ? existing.image_urls : []),
        ].filter(Boolean)
        const needsImages = currentImages.length === 0
        const needsVideo =
          !existing.video_proof_url &&
          !existing.item_video_url &&
          Boolean(video)
        if (needsImages || needsVideo) {
          const patch: Record<string, unknown> = {
            updated_at: new Date().toISOString(),
          }
          if (needsImages) {
            patch.images = images
            patch.image_urls = images
          }
          if (needsVideo) {
            patch.video_proof_url = video
            patch.item_video_url = video
          }
          let { error } = await supabase
            .from("products")
            .update(patch)
            .eq("id", existing.id)
          if (error && /column .* does not exist/i.test(error.message)) {
            const compatPatch: Record<string, unknown> = {
              updated_at: patch.updated_at,
            }
            if (needsImages) compatPatch.images = images
            if (needsVideo) compatPatch.video_proof_url = video
            const retry = await supabase
              .from("products")
              .update(compatPatch)
              .eq("id", existing.id)
            error = retry.error
          }
          if (!error) {
            updated += 1
            revalidatePath("/")
            revalidatePath("/shop")
            revalidatePath(`/product/${existing.id}`)
          }
        }
      }
    }

    if (username && logoUrl) {
      const { data: artisan } = await supabase
        .from("artisans")
        .select("id, logo_url")
        .eq("username", username)
        .maybeSingle()

      if (artisan?.id && !artisan.logo_url) {
        const { error } = await supabase
          .from("artisans")
          .update({ logo_url: logoUrl, updated_at: new Date().toISOString() })
          .eq("id", artisan.id)
        if (!error) {
          updated += 1
          revalidatePath("/")
          revalidatePath("/artisans")
          revalidatePath(`/shop/${username}`)
        }
      }
    }
  }

  return { ok: true, updated }
}
