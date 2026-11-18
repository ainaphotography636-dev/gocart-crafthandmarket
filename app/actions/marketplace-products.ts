"use server"

import { revalidatePath } from "next/cache"
import {
  allocateArtisanCode,
  mintProductSku,
  normalizeArtisanCode,
} from "@/lib/productCodes"
import { isSupabaseConfigured } from "@/lib/supabase/config"
import { createClient } from "@/utils/supabase/server"

export type CustomSpec = { key: string; value: string }

export type HandicraftSpecs = {
  material?: string | null
  craftTechnique?: string | null
  dimensions?: string | null
  weight?: string | null
  regionOrigin?: string | null
  careInstructions?: string | null
  giTag?: string | null
  stockQuantity?: number | null
  custom?: CustomSpec[]
}

export type MarketplaceProductInput = {
  title: string
  description: string
  category: string
  /** Offer price in INR */
  priceInr: number
  /** Actual / MRP price in INR */
  mrpInr?: number | null
  /** Available inventory units */
  stockQuantity?: number | null
  images: string[]
  videoProofUrl?: string | null
  sku?: string | null
  workshopName?: string | null
  username?: string | null
  artisanCode?: string | null
  publish?: boolean
  specs?: HandicraftSpecs | null
  /** @deprecated Prefer priceInr */
  priceUsd?: number
  /** @deprecated Prefer mrpInr */
  mrpUsd?: number | null
}

export type MarketplaceActionResult =
  | {
      ok: true
      product: {
        id: string
        sku: string
        title: string
        artisanId: string
        artisanCode: string
        isPublished: boolean
      }
      artisan: {
        id: string
        artisanCode: string
        username: string
        workshopName: string
        verificationStatus: string
        isActive: boolean
      }
      source: "supabase"
    }
  | {
      ok: false
      code:
        | "SUPABASE_UNAVAILABLE"
        | "UNAUTHORIZED"
        | "VALIDATION"
        | "ARTISAN"
        | "INSERT"
      error: string
    }

function slugifyUsername(value: string) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
}

function normalizeCustomSpecs(custom?: CustomSpec[] | null) {
  if (!Array.isArray(custom)) return [] as CustomSpec[]
  return custom
    .map((row) => ({
      key: String(row?.key || "").trim(),
      value: String(row?.value || "").trim(),
    }))
    .filter((row) => row.key && row.value)
}

type ParsedProductInput = {
  title: string
  description: string
  category: string
  images: string[]
  priceInr: number
  mrpInr: number | null
  videoProofUrl: string | null
  sku: string | null
  workshopName: string | null
  username: string | null
  artisanCode: string | null
  publish: boolean
  material: string | null
  craftTechnique: string | null
  dimensions: string | null
  weight: string | null
  regionOrigin: string | null
  careInstructions: string | null
  giTag: string | null
  stockQuantity: number | null
  customSpecs: CustomSpec[]
}

function validateProductInput(
  input: MarketplaceProductInput
): { ok: true; value: ParsedProductInput } | { ok: false; error: string } {
  const title = String(input.title || "").trim()
  const description = String(input.description || "").trim()
  const category = String(input.category || "").trim()
  const images = Array.isArray(input.images)
    ? input.images.map((url) => String(url || "").trim()).filter(Boolean)
    : []
  const priceInr = Number(
    input.priceInr !== undefined ? input.priceInr : input.priceUsd
  )
  const mrpRaw =
    input.mrpInr !== undefined && input.mrpInr !== null
      ? input.mrpInr
      : input.mrpUsd
  const mrpInr =
    mrpRaw === undefined || mrpRaw === null ? null : Number(mrpRaw)
  const publish = Boolean(input.publish)
  const specs = input.specs || {}

  if (!title) return { ok: false, error: "Product name is required." }
  if (!description) return { ok: false, error: "Product description is required." }
  if (!category) return { ok: false, error: "Select a category." }

  if (publish) {
    if (images.length < 4) {
      return { ok: false, error: "Publish requires 4–6 product photos." }
    }
    if (images.length > 6) {
      return { ok: false, error: "Upload at most 6 product photos." }
    }
  } else if (!images.length) {
    return { ok: false, error: "Add at least one product photo before saving." }
  } else if (images.length > 6) {
    return { ok: false, error: "Upload at most 6 product photos." }
  }

  if (!Number.isFinite(priceInr) || priceInr <= 0) {
    return { ok: false, error: "Enter a valid offer price (₹)." }
  }
  if (mrpInr !== null && (!Number.isFinite(mrpInr) || mrpInr <= 0)) {
    return { ok: false, error: "Enter a valid actual price (₹)." }
  }
  if (mrpInr !== null && priceInr > mrpInr) {
    return { ok: false, error: "Offer price cannot be higher than actual price." }
  }

  const stockRaw =
    input.stockQuantity !== undefined && input.stockQuantity !== null
      ? input.stockQuantity
      : specs.stockQuantity
  const stockQuantity =
    stockRaw === undefined || stockRaw === null ? null : Number(stockRaw)
  if (
    stockQuantity !== null &&
    (!Number.isFinite(stockQuantity) ||
      stockQuantity < 0 ||
      !Number.isInteger(stockQuantity))
  ) {
    return { ok: false, error: "Enter a valid stock quantity." }
  }

  return {
    ok: true,
    value: {
      title,
      description,
      category,
      images,
      priceInr,
      mrpInr,
      videoProofUrl: input.videoProofUrl?.trim() || null,
      sku: input.sku?.trim() || null,
      workshopName: input.workshopName?.trim() || null,
      username: input.username?.trim() || null,
      artisanCode: input.artisanCode?.trim() || null,
      publish,
      material: String(specs.material || "").trim() || null,
      craftTechnique: String(specs.craftTechnique || "").trim() || null,
      dimensions: String(specs.dimensions || "").trim() || null,
      weight: String(specs.weight || "").trim() || null,
      regionOrigin: String(specs.regionOrigin || "").trim() || null,
      careInstructions: String(specs.careInstructions || "").trim() || null,
      giTag: String(specs.giTag || "").trim() || null,
      stockQuantity,
      customSpecs: normalizeCustomSpecs(specs.custom),
    },
  }
}

async function ensureArtisanForUser(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  opts: {
    workshopName?: string | null
    username?: string | null
    artisanCode?: string | null
    email?: string | null
    fullName?: string | null
  }
) {
  const { data: existingArtisan, error: artisanLookupError } = await supabase
    .from("artisans")
    .select(
      "id, artisan_code, username, workshop_name, verification_status, is_active, next_sku_seq, profile_id"
    )
    .eq("profile_id", userId)
    .maybeSingle()

  if (artisanLookupError) {
    return { error: artisanLookupError.message }
  }
  if (existingArtisan) {
    return { artisan: existingArtisan }
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, role, email, full_name")
    .eq("id", userId)
    .maybeSingle()

  if (profileError) {
    return { error: profileError.message }
  }

  if (!profile) {
    const { error: insertProfileError } = await supabase.from("profiles").insert({
      id: userId,
      email: opts.email || null,
      full_name: opts.fullName || "",
      role: "artisan",
    })
    if (insertProfileError) {
      return { error: insertProfileError.message }
    }
  } else if (profile.role !== "artisan" && profile.role !== "admin") {
    const { error: roleError } = await supabase
      .from("profiles")
      .update({ role: "artisan" })
      .eq("id", userId)
    if (roleError) {
      return { error: roleError.message }
    }
  }

  const { data: codes } = await supabase.from("artisans").select("artisan_code")
  const artisanCode = normalizeArtisanCode(
    opts.artisanCode ||
      allocateArtisanCode((codes || []).map((row) => row.artisan_code))
  )

  const workshopName =
    opts.workshopName ||
    opts.fullName ||
    opts.email?.split("@")[0] ||
    "My Workshop"

  let username = slugifyUsername(opts.username || workshopName)
  if (username.length < 3) {
    username = `atelier-${artisanCode.toLowerCase().slice(0, 8)}`
  }

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const candidate =
      attempt === 0 ? username : `${username.slice(0, 36)}-${attempt + 1}`
    const { data: created, error: createError } = await supabase
      .from("artisans")
      .insert({
        profile_id: userId,
        workshop_name: workshopName,
        username: candidate,
        artisan_code: artisanCode,
        description: "",
        verification_status: "pending",
        is_active: false,
        next_sku_seq: 1,
      })
      .select(
        "id, artisan_code, username, workshop_name, verification_status, is_active, next_sku_seq, profile_id"
      )
      .single()

    if (!createError && created) {
      return { artisan: created }
    }

    if (createError?.code === "23505" && /username/i.test(createError.message)) {
      continue
    }
    return { error: createError?.message || "Could not create artisan workshop." }
  }

  return { error: "Could not allocate a unique workshop username." }
}

/**
 * Persist a product to Supabase for the signed-in artisan (INR + handicraft specs).
 */
export async function createMarketplaceProduct(
  input: MarketplaceProductInput
): Promise<MarketplaceActionResult> {
  if (!isSupabaseConfigured()) {
    return {
      ok: false,
      code: "SUPABASE_UNAVAILABLE",
      error: "Supabase is not configured.",
    }
  }

  const parsedResult = validateProductInput(input)
  if (parsedResult.ok === false) {
    return { ok: false, code: "VALIDATION", error: parsedResult.error }
  }
  const parsed = parsedResult.value

  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return {
      ok: false,
      code: "UNAUTHORIZED",
      error: "Sign in as an artisan to save products to the marketplace.",
    }
  }

  const ensured = await ensureArtisanForUser(supabase, user.id, {
    workshopName: parsed.workshopName,
    username: parsed.username,
    artisanCode: parsed.artisanCode,
    email: user.email,
    fullName:
      typeof user.user_metadata?.full_name === "string"
        ? user.user_metadata.full_name
        : null,
  })

  if (!ensured.artisan) {
    return {
      ok: false,
      code: "ARTISAN",
      error: ensured.error || "Could not load artisan workshop.",
    }
  }

  const artisan = ensured.artisan
  const artisanCode = normalizeArtisanCode(artisan.artisan_code)

  let sku = parsed.sku
  let nextSkuSeq = Math.max(1, Number(artisan.next_sku_seq) || 1)

  if (!sku) {
    const minted = mintProductSku({
      artisanCode,
      nextSkuSeq,
    })
    sku = minted.sku
    nextSkuSeq = minted.nextSkuSeq
  } else {
    const match = sku.match(/-(\d+)$/)
    const seq = match ? Number(match[1]) : null
    if (seq && Number.isFinite(seq)) {
      nextSkuSeq = Math.max(nextSkuSeq, seq + 1)
    }
  }

  const canPublish =
    parsed.publish &&
    artisan.verification_status === "verified" &&
    artisan.is_active === true

  const specsPayload = {
    material: parsed.material,
    craftTechnique: parsed.craftTechnique,
    dimensions: parsed.dimensions,
    weight: parsed.weight,
    regionOrigin: parsed.regionOrigin,
    careInstructions: parsed.careInstructions,
    giTag: parsed.giTag,
    stockQuantity: parsed.stockQuantity,
    custom: parsed.customSpecs,
  }

  const inStock =
    parsed.stockQuantity === null ? true : parsed.stockQuantity > 0

  const { data: product, error: insertError } = await supabase
    .from("products")
    .insert({
      artisan_id: artisan.id,
      title: parsed.title,
      description: parsed.description,
      category: parsed.category,
      material: parsed.material,
      gi_tag: parsed.giTag,
      craft_technique: parsed.craftTechnique,
      dimensions: parsed.dimensions,
      weight: parsed.weight,
      region_origin: parsed.regionOrigin,
      care_instructions: parsed.careInstructions,
      specs: specsPayload,
      sku,
      // INR is the marketplace currency; keep price_usd populated for legacy readers.
      price_inr: parsed.priceInr,
      mrp_inr: parsed.mrpInr,
      price_usd: parsed.priceInr,
      mrp_usd: parsed.mrpInr,
      currency_default: "INR",
      images: parsed.images,
      video_proof_url: parsed.videoProofUrl,
      in_stock: inStock,
      is_published: canPublish,
    })
    .select("id, sku, title, artisan_id, is_published")
    .single()

  if (insertError || !product) {
    return {
      ok: false,
      code: "INSERT",
      error: insertError?.message || "Could not save product.",
    }
  }

  if (nextSkuSeq !== artisan.next_sku_seq) {
    await supabase
      .from("artisans")
      .update({ next_sku_seq: nextSkuSeq })
      .eq("id", artisan.id)
  }

  revalidatePath("/shop")
  revalidatePath("/artisan/products/new")
  revalidatePath("/store")
  revalidatePath(`/shop/${artisan.username}`)

  return {
    ok: true,
    source: "supabase",
    product: {
      id: product.id,
      sku: product.sku,
      title: product.title,
      artisanId: product.artisan_id,
      artisanCode,
      isPublished: product.is_published,
    },
    artisan: {
      id: artisan.id,
      artisanCode,
      username: artisan.username,
      workshopName: artisan.workshop_name,
      verificationStatus: artisan.verification_status,
      isActive: artisan.is_active,
    },
  }
}

/**
 * Update an existing marketplace product owned by the signed-in artisan.
 */
export async function updateMarketplaceProduct(input: {
  productId: string
  title?: string
  description?: string
  category?: string
  priceInr?: number
  mrpInr?: number | null
  stockQuantity?: number | null
  images?: string[]
  videoProofUrl?: string | null
  inStock?: boolean
  specs?: HandicraftSpecs | null
}): Promise<MarketplaceActionResult> {
  if (!isSupabaseConfigured()) {
    return {
      ok: false,
      code: "SUPABASE_UNAVAILABLE",
      error: "Supabase is not configured.",
    }
  }

  const productId = String(input?.productId || "").trim()
  if (!productId) {
    return { ok: false, code: "VALIDATION", error: "productId is required." }
  }

  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return {
      ok: false,
      code: "UNAUTHORIZED",
      error: "Sign in as an artisan to update marketplace products.",
    }
  }

  const { data: artisan, error: artisanError } = await supabase
    .from("artisans")
    .select("id, artisan_code, username, workshop_name, verification_status, is_active")
    .eq("profile_id", user.id)
    .maybeSingle()

  if (artisanError || !artisan) {
    return {
      ok: false,
      code: "ARTISAN",
      error: artisanError?.message || "Artisan workshop not found.",
    }
  }

  const { data: existing, error: lookupError } = await supabase
    .from("products")
    .select("id, sku, title, artisan_id, is_published, images, specs")
    .eq("id", productId)
    .eq("artisan_id", artisan.id)
    .maybeSingle()

  if (lookupError || !existing) {
    return {
      ok: false,
      code: "INSERT",
      error: lookupError?.message || "Product not found for this workshop.",
    }
  }

  const images = Array.isArray(input.images)
    ? input.images.map((url) => String(url || "").trim()).filter(Boolean)
    : null
  if (images) {
    if (!images.length) {
      return { ok: false, code: "VALIDATION", error: "Keep at least one product photo." }
    }
    if (images.length > 6) {
      return { ok: false, code: "VALIDATION", error: "Upload at most 6 product photos." }
    }
  }

  const specs = input.specs || {}
  const existingSpecs =
    existing.specs && typeof existing.specs === "object" && !Array.isArray(existing.specs)
      ? (existing.specs as Record<string, unknown>)
      : {}

  const stockQuantity =
    input.stockQuantity === undefined || input.stockQuantity === null
      ? null
      : Number(input.stockQuantity)

  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }

  if (input.title !== undefined) patch.title = String(input.title || "").trim()
  if (input.description !== undefined) {
    patch.description = String(input.description || "").trim()
  }
  if (input.category !== undefined) patch.category = String(input.category || "").trim()
  if (input.priceInr !== undefined) {
    const priceInr = Number(input.priceInr)
    if (!Number.isFinite(priceInr) || priceInr <= 0) {
      return { ok: false, code: "VALIDATION", error: "Enter a valid offer price (₹)." }
    }
    patch.price_inr = priceInr
    patch.price_usd = priceInr
  }
  if (input.mrpInr !== undefined) {
    const mrpInr =
      input.mrpInr === null ? null : Number(input.mrpInr)
    if (mrpInr !== null && (!Number.isFinite(mrpInr) || mrpInr <= 0)) {
      return { ok: false, code: "VALIDATION", error: "Enter a valid actual price (₹)." }
    }
    patch.mrp_inr = mrpInr
    patch.mrp_usd = mrpInr
  }
  if (images) patch.images = images
  if (Object.prototype.hasOwnProperty.call(input, "videoProofUrl")) {
    patch.video_proof_url = input.videoProofUrl || null
  }
  if (input.inStock !== undefined) patch.in_stock = Boolean(input.inStock)
  if (stockQuantity !== null) {
    if (!Number.isFinite(stockQuantity) || stockQuantity < 0) {
      return { ok: false, code: "VALIDATION", error: "Enter a valid stock quantity." }
    }
    patch.in_stock = stockQuantity > 0
  }

  if (input.specs) {
    patch.material = String(specs.material || "").trim() || null
    patch.craft_technique = String(specs.craftTechnique || "").trim() || null
    patch.dimensions = String(specs.dimensions || "").trim() || null
    patch.region_origin = String(specs.regionOrigin || "").trim() || null
    patch.weight = String(specs.weight || "").trim() || null
    patch.care_instructions = String(specs.careInstructions || "").trim() || null
    patch.gi_tag = String(specs.giTag || "").trim() || null
    patch.specs = {
      ...existingSpecs,
      material: patch.material,
      craftTechnique: patch.craft_technique,
      dimensions: patch.dimensions,
      regionOrigin: patch.region_origin,
      weight: patch.weight,
      careInstructions: patch.care_instructions,
      giTag: patch.gi_tag,
      stockQuantity:
        stockQuantity !== null
          ? stockQuantity
          : existingSpecs.stockQuantity ?? null,
      custom: Array.isArray(specs.custom) ? specs.custom : existingSpecs.custom || [],
    }
  } else if (stockQuantity !== null) {
    patch.specs = {
      ...existingSpecs,
      stockQuantity,
    }
  }

  const { data: product, error: updateError } = await supabase
    .from("products")
    .update(patch)
    .eq("id", productId)
    .eq("artisan_id", artisan.id)
    .select("id, sku, title, artisan_id, is_published")
    .single()

  if (updateError || !product) {
    return {
      ok: false,
      code: "INSERT",
      error: updateError?.message || "Could not update product.",
    }
  }

  const artisanCode = normalizeArtisanCode(artisan.artisan_code)
  revalidatePath("/shop")
  revalidatePath("/store")
  revalidatePath("/store/manage-product")
  revalidatePath(`/shop/${artisan.username}`)
  revalidatePath(`/product/${product.id}`)

  return {
    ok: true,
    source: "supabase",
    product: {
      id: product.id,
      sku: product.sku,
      title: product.title,
      artisanId: product.artisan_id,
      artisanCode,
      isPublished: product.is_published,
    },
    artisan: {
      id: artisan.id,
      artisanCode,
      username: artisan.username,
      workshopName: artisan.workshop_name,
      verificationStatus: artisan.verification_status,
      isActive: artisan.is_active,
    },
  }
}
