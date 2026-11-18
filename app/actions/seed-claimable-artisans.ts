"use server"

import { CLAIMABLE_ARTISAN_SEED } from "@/lib/claimableArtisanSeed"
import { tryCreateServiceClient } from "@/utils/supabase/admin"
import type { SupabaseClient } from "@supabase/supabase-js"

export type SeedClaimableResult = {
  ok: boolean
  seeded: number
  results: Array<{
    key: string
    email: string
    sku: string
    ok: boolean
    createdUser?: boolean
    error?: string
  }>
  error?: string
}

async function resolveOrCreateArtisanUser(
  supabase: SupabaseClient,
  email: string,
  fullName: string
): Promise<{ id: string; created: boolean } | { error: string }> {
  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("id")
    .ilike("email", email)
    .maybeSingle()
  if (existingProfile?.id) {
    return { id: existingProfile.id, created: false }
  }

  const { data: created, error: createError } =
    await supabase.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        role: "artisan",
        claimable: true,
      },
    })

  if (created?.user?.id) {
    return { id: created.user.id, created: true }
  }

  const { data: listed } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  })
  const match = (listed?.users || []).find(
    (user) => (user.email || "").toLowerCase() === email.toLowerCase()
  )
  if (match?.id) {
    return { id: match.id, created: false }
  }

  return {
    error: createError?.message || `Could not create Auth user for ${email}`,
  }
}

async function ensureArtisanRow(
  supabase: SupabaseClient,
  profileId: string,
  entry: (typeof CLAIMABLE_ARTISAN_SEED)[number]
): Promise<{ id: string } | { error: string }> {
  const payload = {
    profile_id: profileId,
    workshop_name: entry.workshopName,
    username: entry.username,
    artisan_code: entry.artisanCode,
    description: entry.description,
    address: entry.address,
    region: entry.region,
    gi_tags: [...entry.giTags],
    verification_status: "verified",
    is_active: true,
    logo_url: entry.product.images[0] || null,
  }

  const { data: byProfile } = await supabase
    .from("artisans")
    .select("id")
    .eq("profile_id", profileId)
    .maybeSingle()

  if (byProfile?.id) {
    const { data, error } = await supabase
      .from("artisans")
      .update(payload)
      .eq("id", byProfile.id)
      .select("id")
      .single()
    if (error || !data?.id) {
      return { error: error?.message || "Artisan update failed." }
    }
    return { id: data.id }
  }

  const { data: byUsername } = await supabase
    .from("artisans")
    .select("id, profile_id")
    .eq("username", entry.username)
    .maybeSingle()

  if (byUsername?.id) {
    const { data, error } = await supabase
      .from("artisans")
      .update({
        workshop_name: entry.workshopName,
        artisan_code: entry.artisanCode,
        description: entry.description,
        address: entry.address,
        region: entry.region,
        gi_tags: [...entry.giTags],
        verification_status: "verified",
        is_active: true,
        logo_url: entry.product.images[0] || null,
      })
      .eq("id", byUsername.id)
      .select("id")
      .single()
    if (error || !data?.id) {
      return { error: error?.message || "Artisan username update failed." }
    }
    return { id: data.id }
  }

  const { data, error } = await supabase
    .from("artisans")
    .insert(payload)
    .select("id")
    .single()

  if (error || !data?.id) {
    return { error: error?.message || "Artisan insert failed." }
  }
  return { id: data.id }
}

function productPayload(
  artisanId: string,
  product: (typeof CLAIMABLE_ARTISAN_SEED)[number]["product"]
) {
  return {
    artisan_id: artisanId,
    title: product.title,
    description: product.description,
    category: product.category,
    material: product.material,
    gi_tag: product.giTag,
    craft_technique: product.craftTechnique,
    dimensions: product.dimensions,
    weight: product.weight,
    region_origin: product.regionOrigin,
    care_instructions: product.careInstructions,
    specs: product.specs,
    sku: product.sku,
    price_inr: product.priceInr,
    mrp_inr: product.mrpInr,
    price_usd: product.priceUsd,
    mrp_usd: product.mrpUsd,
    currency_default: "INR",
    images: [...product.images],
    image_urls: [...product.images],
    in_stock: true,
    is_published: true,
  }
}

async function upsertProduct(
  supabase: SupabaseClient,
  artisanId: string,
  product: (typeof CLAIMABLE_ARTISAN_SEED)[number]["product"]
): Promise<{ ok: true } | { ok: false; error: string }> {
  const full = productPayload(artisanId, product)
  const { data: existing } = await supabase
    .from("products")
    .select("id")
    .eq("sku", product.sku)
    .maybeSingle()

  if (existing?.id) {
    const { error } = await supabase
      .from("products")
      .update(full)
      .eq("id", existing.id)
    if (!error) return { ok: true as const }
    if (/column|schema cache|PGRST204/i.test(error.message)) {
      return await upsertCompat(supabase, artisanId, product, existing.id)
    }
    return { ok: false as const, error: error.message }
  }

  const { error } = await supabase.from("products").insert(full)
  if (!error) return { ok: true as const }
  if (/column|schema cache|PGRST204/i.test(error.message)) {
    return await upsertCompat(supabase, artisanId, product, null)
  }
  return { ok: false as const, error: error.message }
}

async function upsertCompat(
  supabase: SupabaseClient,
  artisanId: string,
  product: (typeof CLAIMABLE_ARTISAN_SEED)[number]["product"],
  existingId: string | null
): Promise<{ ok: true } | { ok: false; error: string }> {
  const full = productPayload(artisanId, product)
  const {
    price_inr: _pi,
    mrp_inr: _mi,
    image_urls: _iu,
    weight: _w,
    region_origin: _ro,
    care_instructions: _ci,
    specs: _sp,
    craft_technique: _ct,
    dimensions: _d,
    ...compat
  } = full

  if (existingId) {
    const retry = await supabase.from("products").update(compat).eq("id", existingId)
    if (!retry.error) return { ok: true as const }
    return { ok: false as const, error: retry.error.message }
  }

  const retry = await supabase.from("products").insert(compat)
  if (!retry.error) return { ok: true as const }
  return { ok: false as const, error: retry.error.message }
}

/**
 * Idempotently seed three claimable artisans and their Featured Luxury pieces.
 * Safe to call from the homepage.
 */
export async function ensureClaimableLuxuryCatalog(): Promise<SeedClaimableResult> {
  const supabase = tryCreateServiceClient()
  if (!supabase) {
    return {
      ok: false,
      seeded: 0,
      results: [],
      error: "Supabase service role is not configured.",
    }
  }

  const results: SeedClaimableResult["results"] = []
  let seeded = 0

  for (const entry of CLAIMABLE_ARTISAN_SEED) {
    const email = entry.email.toLowerCase()
    try {
      const resolved = await resolveOrCreateArtisanUser(
        supabase,
        email,
        entry.fullName
      )
      if ("error" in resolved) {
        results.push({
          key: entry.key,
          email,
          sku: entry.product.sku,
          ok: false,
          error: resolved.error,
        })
        continue
      }

      await supabase.from("profiles").upsert(
        {
          id: resolved.id,
          email,
          full_name: entry.fullName,
          role: "artisan",
        },
        { onConflict: "id" }
      )

      const artisan = await ensureArtisanRow(supabase, resolved.id, entry)
      if ("error" in artisan) {
        results.push({
          key: entry.key,
          email,
          sku: entry.product.sku,
          ok: false,
          createdUser: resolved.created,
          error: artisan.error,
        })
        continue
      }

      const productResult = await upsertProduct(
        supabase,
        artisan.id,
        entry.product
      )
      if ("error" in productResult) {
        results.push({
          key: entry.key,
          email,
          sku: entry.product.sku,
          ok: false,
          createdUser: resolved.created,
          error: productResult.error,
        })
        continue
      }
      results.push({
        key: entry.key,
        email,
        sku: entry.product.sku,
        ok: true,
        createdUser: resolved.created,
      })
      seeded += 1
    } catch (error) {
      results.push({
        key: entry.key,
        email,
        sku: entry.product.sku,
        ok: false,
        error: error instanceof Error ? error.message : "Unknown seed error.",
      })
    }
  }

  return {
    ok: results.every((row) => row.ok),
    seeded,
    results,
    error: results.find((row) => !row.ok)?.error,
  }
}
