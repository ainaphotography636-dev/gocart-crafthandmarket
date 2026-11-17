"use server"

import { revalidatePath } from "next/cache"
import {
  allocateArtisanCode,
  mintProductSku,
  normalizeArtisanCode,
} from "@/lib/productCodes"
import { isSupabaseConfigured } from "@/lib/supabase/config"
import { createClient } from "@/utils/supabase/server"

export type MarketplaceProductInput = {
  title: string
  description: string
  category: string
  priceUsd: number
  mrpUsd?: number | null
  images: string[]
  videoProofUrl?: string | null
  /** Prefer the SKU already used for R2 paths so media and DB stay aligned. */
  sku?: string | null
  workshopName?: string | null
  username?: string | null
  artisanCode?: string | null
  /** Publish immediately when the artisan workshop is verified + active. */
  publish?: boolean
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

type ParsedProductInput = {
  title: string
  description: string
  category: string
  images: string[]
  priceUsd: number
  mrpUsd: number | null
  videoProofUrl: string | null
  sku: string | null
  workshopName: string | null
  username: string | null
  artisanCode: string | null
  publish: boolean
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
  const priceUsd = Number(input.priceUsd)
  const mrpUsd =
    input.mrpUsd === undefined || input.mrpUsd === null
      ? null
      : Number(input.mrpUsd)

  if (!title) return { ok: false, error: "Product name is required." }
  if (!description) return { ok: false, error: "Product description is required." }
  if (!category) return { ok: false, error: "Select a category." }
  if (!images.length) return { ok: false, error: "Add at least one product image." }
  if (!Number.isFinite(priceUsd) || priceUsd <= 0) {
    return { ok: false, error: "Enter a valid offer price." }
  }
  if (mrpUsd !== null && (!Number.isFinite(mrpUsd) || mrpUsd <= 0)) {
    return { ok: false, error: "Enter a valid actual price." }
  }
  if (mrpUsd !== null && priceUsd > mrpUsd) {
    return { ok: false, error: "Offer price cannot be higher than actual price." }
  }

  return {
    ok: true,
    value: {
      title,
      description,
      category,
      images,
      priceUsd,
      mrpUsd,
      videoProofUrl: input.videoProofUrl?.trim() || null,
      sku: input.sku?.trim() || null,
      workshopName: input.workshopName?.trim() || null,
      username: input.username?.trim() || null,
      artisanCode: input.artisanCode?.trim() || null,
      publish: Boolean(input.publish),
    },
  }
}

/**
 * Ensure the signed-in user has a profiles row + artisans workshop.
 * Creates the workshop on first product publish when missing.
 */
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

  // Ensure profile exists and is marked artisan (trigger usually creates it).
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

  // Resolve username collisions with a short numeric suffix.
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

    // Unique violation on username — retry with suffix.
    if (createError?.code === "23505" && /username/i.test(createError.message)) {
      continue
    }
    return { error: createError?.message || "Could not create artisan workshop." }
  }

  return { error: "Could not allocate a unique workshop username." }
}

/**
 * Persist a product to Supabase `public.products` for the signed-in artisan.
 * Falls back with SUPABASE_UNAVAILABLE when Auth env is not configured.
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
    // Keep sequence cursor ahead of any client-claimed SKU.
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

  const { data: product, error: insertError } = await supabase
    .from("products")
    .insert({
      artisan_id: artisan.id,
      title: parsed.title,
      description: parsed.description,
      category: parsed.category,
      sku,
      price_usd: parsed.priceUsd,
      mrp_usd: parsed.mrpUsd,
      currency_default: "USD",
      images: parsed.images,
      video_proof_url: parsed.videoProofUrl,
      in_stock: true,
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

  // Advance SKU sequence (best-effort; product row already committed).
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
