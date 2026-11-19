"use server"

import {
  CLAIMABLE_ARTISAN_SEED,
  type ClaimableArtisanSeed,
  type ClaimableProductSeed,
} from "@/lib/claimableArtisanSeed"
import { stripSkuTitlePrefix } from "@/lib/productCodes"
import { tryCreateServiceClient } from "@/utils/supabase/admin"
import type { SupabaseClient } from "@supabase/supabase-js"

export type SeedClaimableResult = {
  ok: boolean
  seeded: number
  results: Array<{
    key: string
    email: string
    artisanCode: string
    sku?: string
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
  entry: ClaimableArtisanSeed
): Promise<{ id: string; artisanCode: string } | { error: string }> {
  const logo = entry.logoUrl || entry.product?.images?.[0] || null
  // artisan_code is DB-owned (trigger). Never send client codes on insert/update.
  const payload = {
    profile_id: profileId,
    workshop_name: entry.workshopName,
    username: entry.username,
    description: entry.description,
    address: entry.address,
    region: entry.region,
    contact_phone: entry.phone,
    gi_tags: [...entry.giTags],
    verification_status: "verified",
    is_active: true,
    logo_url: logo,
  }

  const { data: byProfile } = await supabase
    .from("artisans")
    .select("id, artisan_code")
    .eq("profile_id", profileId)
    .maybeSingle()

  if (byProfile?.id) {
    const { data, error } = await supabase
      .from("artisans")
      .update(payload)
      .eq("id", byProfile.id)
      .select("id, artisan_code")
      .single()
    if (error || !data?.id) {
      return { error: error?.message || "Artisan update failed." }
    }
    return { id: data.id, artisanCode: data.artisan_code }
  }

  const { data: byUsername } = await supabase
    .from("artisans")
    .select("id, artisan_code")
    .eq("username", entry.username)
    .maybeSingle()

  if (byUsername?.id) {
    const { data, error } = await supabase
      .from("artisans")
      .update({
        workshop_name: entry.workshopName,
        description: entry.description,
        address: entry.address,
        region: entry.region,
        contact_phone: entry.phone,
        gi_tags: [...entry.giTags],
        verification_status: "verified",
        is_active: true,
        logo_url: logo,
      })
      .eq("id", byUsername.id)
      .select("id, artisan_code")
      .single()
    if (error || !data?.id) {
      return { error: error?.message || "Artisan username update failed." }
    }
    return { id: data.id, artisanCode: data.artisan_code }
  }

  let { data, error } = await supabase
    .from("artisans")
    .insert(payload)
    .select("id, artisan_code")
    .single()

  // Pre-migration fallback when artisan_code is still NOT NULL without default.
  if (error && /artisan_code|null value/i.test(error.message || "")) {
    const retry = await supabase
      .from("artisans")
      .insert({ ...payload, artisan_code: entry.artisanCode })
      .select("id, artisan_code")
      .single()
    data = retry.data
    error = retry.error
  }

  if (error || !data?.id) {
    return { error: error?.message || "Artisan insert failed." }
  }
  return { id: data.id, artisanCode: data.artisan_code }
}

function productPayload(artisanId: string, product: ClaimableProductSeed) {
  const specs = { ...(product.specs || {}) }
  const title =
    stripSkuTitlePrefix(product.title) || String(product.title || "").trim()
  // sku is DB-owned (trigger). Never send client SKUs on insert/update.
  return {
    artisan_id: artisanId,
    title,
    description: product.description,
    category: product.category,
    material: product.material,
    gi_tag: product.giTag,
    craft_technique: product.craftTechnique,
    dimensions: product.dimensions,
    weight: product.weight,
    region_origin: product.regionOrigin,
    care_instructions: product.careInstructions,
    specs,
    price_inr: product.priceInr,
    mrp_inr: product.mrpInr,
    price_usd: product.priceUsd,
    mrp_usd: product.mrpUsd,
    currency_default: "INR",
    images: [...product.images],
    image_urls: [...product.images],
    in_stock: true,
    is_published: true,
    is_featured: Boolean(specs.isFeatured),
    featured_order: Number(specs.featuredOrder || 0) || 0,
    badge_left: String(specs.badge || "") || null,
    badge_right: String(specs.series || "") || null,
    catalog_status: String(specs.catalogStatus || "approved"),
  }
}

async function upsertCompat(
  supabase: SupabaseClient,
  artisanId: string,
  product: ClaimableProductSeed,
  existingId: string | null
): Promise<{ ok: true; sku?: string } | { ok: false; error: string }> {
  const full = productPayload(artisanId, product)
  const {
    price_inr: _pi,
    mrp_inr: _mi,
    image_urls: _iu,
    weight: _w,
    region_origin: _ro,
    care_instructions: _ci,
    craft_technique: _ct,
    dimensions: _d,
    is_featured: _f,
    featured_order: _fo,
    badge_left: _bl,
    badge_right: _br,
    catalog_status: _cs,
    ...compat
  } = full

  if (existingId) {
    const retry = await supabase
      .from("products")
      .update(compat)
      .eq("id", existingId)
      .select("sku")
      .single()
    if (!retry.error) return { ok: true as const, sku: retry.data?.sku }
    return { ok: false as const, error: retry.error.message }
  }

  const retry = await supabase.from("products").insert(compat).select("sku").single()
  if (!retry.error) return { ok: true as const, sku: retry.data?.sku }
  return { ok: false as const, error: retry.error.message }
}

async function upsertProduct(
  supabase: SupabaseClient,
  artisanId: string,
  product: ClaimableProductSeed
): Promise<{ ok: true; sku?: string } | { ok: false; error: string }> {
  const full = productPayload(artisanId, product)
  const cleanTitle = full.title

  // Prefer matching an existing piece for this artisan by title (SKU is DB-owned).
  const { data: existing } = await supabase
    .from("products")
    .select("id, sku")
    .eq("artisan_id", artisanId)
    .ilike("title", cleanTitle)
    .maybeSingle()

  if (existing?.id) {
    const { data, error } = await supabase
      .from("products")
      .update(full)
      .eq("id", existing.id)
      .select("sku")
      .single()
    if (!error) return { ok: true as const, sku: data?.sku || existing.sku }
    if (/column|schema cache|PGRST204/i.test(error.message)) {
      return await upsertCompat(supabase, artisanId, product, existing.id)
    }
    return { ok: false as const, error: error.message }
  }

  let { data, error } = await supabase
    .from("products")
    .insert(full)
    .select("sku")
    .single()

  // Pre-migration fallback when sku is still NOT NULL without default/trigger.
  if (error && /sku|null value/i.test(error.message || "")) {
    const retry = await supabase
      .from("products")
      .insert({ ...full, sku: product.sku })
      .select("sku")
      .single()
    data = retry.data
    error = retry.error
  }

  if (!error) return { ok: true as const, sku: data?.sku }
  if (/column|schema cache|PGRST204/i.test(error.message)) {
    return await upsertCompat(supabase, artisanId, product, null)
  }
  return { ok: false as const, error: error.message }
}

/**
 * Idempotently seed ten claimable artisans (and optional luxury products).
 * Codes/SKUs are assigned by Postgres triggers — never by this seed.
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
          artisanCode: entry.artisanCode,
          sku: entry.product?.sku,
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
          artisanCode: entry.artisanCode,
          sku: entry.product?.sku,
          ok: false,
          createdUser: resolved.created,
          error: artisan.error,
        })
        continue
      }

      let sku: string | undefined
      if (entry.product) {
        const productResult = await upsertProduct(
          supabase,
          artisan.id,
          entry.product
        )
        if (productResult.ok === false) {
          results.push({
            key: entry.key,
            email,
            artisanCode: artisan.artisanCode,
            sku: entry.product.sku,
            ok: false,
            createdUser: resolved.created,
            error: productResult.error,
          })
          continue
        }
        sku = productResult.sku
      }

      results.push({
        key: entry.key,
        email,
        artisanCode: artisan.artisanCode,
        sku,
        ok: true,
        createdUser: resolved.created,
      })
      seeded += 1
    } catch (error) {
      results.push({
        key: entry.key,
        email,
        artisanCode: entry.artisanCode,
        sku: entry.product?.sku,
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
