"use server"

import { revalidatePath } from "next/cache"
import {
  featuredColumnPayload,
  mergeFeaturedIntoSpecs,
  readFeaturedFields,
  type CatalogStatus,
} from "@/lib/marketplace/featured"
import { isMissingColumnError } from "@/lib/marketplace/productSelect"
import {
  mintProductSku,
  normalizeArtisanCode,
  stripSkuTitlePrefix,
} from "@/lib/productCodes"
import { tryCreateServiceClient } from "@/utils/supabase/admin"
import type { SupabaseClient } from "@supabase/supabase-js"

export type AdminProductDTO = {
  id: string
  sku: string
  title: string
  description: string
  category: string
  subCategory: string
  material: string
  giTag: string
  technique: string
  origin: string
  dimensions: string
  weight: string
  price: number
  mrp: number
  currency: string
  imageUrl: string
  images: string[]
  badgeLeft: string
  badgeRight: string
  isFeatured: boolean
  featuredOrder: number
  catalogStatus: CatalogStatus
  isPublished: boolean
  inStock: boolean
  artisanId: string
  artisanCode: string
  artisanName: string
  displayName: string
  createdAt: string | null
  updatedAt: string | null
}

export type AdminProductInput = {
  id?: string
  sku: string
  title: string
  description: string
  category: string
  subCategory?: string
  material?: string
  giTag?: string
  technique?: string
  origin?: string
  dimensions?: string
  weight?: string
  price: number
  mrp?: number | null
  currency?: string
  imageUrl?: string
  images?: string[]
  badgeLeft?: string
  badgeRight?: string
  isFeatured?: boolean
  featuredOrder?: number
  catalogStatus?: CatalogStatus
  inStock?: boolean
  artisanId?: string
  displayName?: string
}

function mapAdminRow(row: Record<string, unknown>): AdminProductDTO {
  const featured = readFeaturedFields(row)
  const artisan = Array.isArray(row.artisans)
    ? (row.artisans[0] as Record<string, unknown> | undefined)
    : (row.artisans as Record<string, unknown> | null)
  const images = Array.isArray(row.images)
    ? (row.images as string[]).filter(Boolean)
    : Array.isArray(row.image_urls)
      ? (row.image_urls as string[]).filter(Boolean)
      : []
  const price = Number(row.price_inr || row.price_usd || 0) || 0
  const mrp = Number(row.mrp_inr || row.mrp_usd || price) || price

  return {
    id: String(row.id),
    sku: String(row.sku || ""),
    title: String(row.title || ""),
    description: String(row.description || ""),
    category: String(row.category || ""),
    subCategory: String(
      row.craft_technique ||
        (row.specs as Record<string, unknown> | null)?.craftTechnique ||
        featured.displayName ||
        ""
    ),
    material: String(row.material || ""),
    giTag: String(row.gi_tag || ""),
    technique: String(row.craft_technique || ""),
    origin: String(row.region_origin || ""),
    dimensions: String(row.dimensions || ""),
    weight: String(row.weight || ""),
    price,
    mrp,
    currency: String(row.currency_default || "INR"),
    imageUrl: images[0] || "",
    images,
    badgeLeft: featured.badgeLeft,
    badgeRight: featured.badgeRight,
    isFeatured: featured.isFeatured,
    featuredOrder: featured.featuredOrder,
    catalogStatus: featured.catalogStatus,
    isPublished: Boolean(row.is_published),
    inStock: row.in_stock !== false,
    artisanId: String(row.artisan_id || ""),
    artisanCode: String(artisan?.artisan_code || ""),
    artisanName: String(artisan?.workshop_name || ""),
    displayName: featured.displayName || String(row.title || ""),
    createdAt: (row.created_at as string) || null,
    updatedAt: (row.updated_at as string) || null,
  }
}

const ADMIN_SELECT = `
  id, artisan_id, title, description, category, material, gi_tag,
  craft_technique, dimensions, weight, region_origin, care_instructions,
  specs, sku, price_inr, mrp_inr, price_usd, mrp_usd, currency_default,
  images, image_urls, in_stock, is_published,
  is_featured, featured_order, badge_left, badge_right, catalog_status,
  created_at, updated_at,
  artisans ( id, artisan_code, workshop_name, username )
`

const ADMIN_SELECT_COMPAT = `
  id, artisan_id, title, description, category, material, gi_tag,
  craft_technique, dimensions, weight, region_origin, care_instructions,
  specs, sku, price_inr, mrp_inr, price_usd, mrp_usd, currency_default,
  images, in_stock, is_published, created_at,
  artisans ( id, artisan_code, workshop_name, username )
`

async function selectAdminProducts(supabase: SupabaseClient) {
  const full = await supabase
    .from("products")
    .select(ADMIN_SELECT)
    .order("created_at", { ascending: false })
  if (!full.error) return full
  if (isMissingColumnError(full.error)) {
    return supabase
      .from("products")
      .select(ADMIN_SELECT_COMPAT)
      .order("created_at", { ascending: false })
  }
  return full
}

export async function listAdminProducts(): Promise<{
  ok: boolean
  products: AdminProductDTO[]
  error?: string
}> {
  const supabase = tryCreateServiceClient()
  if (!supabase) {
    return { ok: false, products: [], error: "Supabase service role is not configured." }
  }

  const { data, error } = await selectAdminProducts(supabase)
  if (error) {
    return { ok: false, products: [], error: error.message }
  }

  return {
    ok: true,
    products: (data || []).map((row) => mapAdminRow(row as Record<string, unknown>)),
  }
}

function buildWritePayload(input: AdminProductInput, existingSpecs?: Record<string, unknown> | null) {
  const images =
    Array.isArray(input.images) && input.images.length
      ? input.images.map((url) => String(url || "").trim()).filter(Boolean)
      : input.imageUrl
        ? [String(input.imageUrl).trim()].filter(Boolean)
        : []

  const catalogStatus = input.catalogStatus || "approved"
  const isPublished = catalogStatus === "approved"
  const featured = {
    isFeatured: Boolean(input.isFeatured),
    featuredOrder: Number(input.featuredOrder || 0) || 0,
    badgeLeft: String(input.badgeLeft || ""),
    badgeRight: String(input.badgeRight || ""),
    catalogStatus,
    displayName: String(input.displayName || input.title || ""),
  }

  const specs = mergeFeaturedIntoSpecs(existingSpecs, featured)
  if (input.technique) specs.craftTechnique = input.technique
  if (input.material) specs.material = input.material
  if (input.dimensions) specs.dimensions = input.dimensions
  if (input.weight) specs.weight = input.weight
  if (input.origin) specs.regionOrigin = input.origin
  if (input.subCategory) specs.subCategory = input.subCategory

  const price = Number(input.price) || 0
  const mrp = input.mrp == null ? price : Number(input.mrp) || price

  const cleanTitle =
    stripSkuTitlePrefix(String(input.title || "").trim()) ||
    String(input.title || "").trim()

  return {
    title: cleanTitle,
    description: String(input.description || "").trim(),
    category: String(input.category || "").trim() || "Handicraft",
    material: String(input.material || input.subCategory || "").trim() || null,
    gi_tag: String(input.giTag || "").trim() || null,
    craft_technique: String(input.technique || input.subCategory || "").trim() || null,
    dimensions: String(input.dimensions || "").trim() || null,
    weight: String(input.weight || "").trim() || null,
    region_origin: String(input.origin || "").trim() || null,
    price_inr: price,
    mrp_inr: mrp,
    price_usd: Math.max(1, Math.round(price / 83)),
    mrp_usd: Math.max(1, Math.round(mrp / 83)),
    currency_default: String(input.currency || "INR"),
    images,
    image_urls: images,
    in_stock: input.inStock !== false,
    is_published: isPublished,
    specs,
    ...featuredColumnPayload(featured),
  }
}

export async function saveAdminProduct(
  input: AdminProductInput
): Promise<{ ok: boolean; product?: AdminProductDTO; error?: string }> {
  const supabase = tryCreateServiceClient()
  if (!supabase) {
    return { ok: false, error: "Supabase service role is not configured." }
  }

  const title =
    stripSkuTitlePrefix(String(input.title || "").trim()) ||
    String(input.title || "").trim()
  if (!title) {
    return { ok: false, error: "Title is required." }
  }
  if (!(Number(input.price) > 0)) {
    return { ok: false, error: "Collector price must be greater than zero." }
  }

  let existing: Record<string, unknown> | null = null
  if (input.id) {
    const { data } = await supabase
      .from("products")
      .select("id, specs, artisan_id")
      .eq("id", input.id)
      .maybeSingle()
    existing = data as Record<string, unknown> | null
  }

  let artisanId = String(input.artisanId || existing?.artisan_id || "").trim()
  let artisanCode = ""
  let nextSkuSeq = 1
  if (!artisanId) {
    const { data: artisan } = await supabase
      .from("artisans")
      .select("id, artisan_code, next_sku_seq")
      .eq("is_active", true)
      .eq("verification_status", "verified")
      .order("artisan_code", { ascending: true })
      .limit(1)
      .maybeSingle()
    artisanId = String(artisan?.id || "")
    artisanCode = String(artisan?.artisan_code || "")
    nextSkuSeq = Math.max(1, Number(artisan?.next_sku_seq) || 1)
  } else {
    const { data: artisan } = await supabase
      .from("artisans")
      .select("id, artisan_code, next_sku_seq")
      .eq("id", artisanId)
      .maybeSingle()
    artisanCode = String(artisan?.artisan_code || "")
    nextSkuSeq = Math.max(1, Number(artisan?.next_sku_seq) || 1)
  }
  if (!artisanId) {
    return { ok: false, error: "No verified artisan available to own this product." }
  }

  const existingSpecs =
    existing?.specs && typeof existing.specs === "object" && !Array.isArray(existing.specs)
      ? (existing.specs as Record<string, unknown>)
      : null

  const payload: Record<string, unknown> = {
    ...buildWritePayload(input, existingSpecs),
    artisan_id: artisanId,
  }

  const write = async (body: Record<string, unknown>) => {
    if (existing?.id) {
      return supabase.from("products").update(body).eq("id", String(existing.id)).select("id").single()
    }
    return supabase.from("products").insert(body).select("id").single()
  }

  let result = await write(payload as Record<string, unknown>)

  // Pre-migration fallback: sku still NOT NULL without default/trigger.
  if (
    !existing?.id &&
    result.error &&
    /sku|null value/i.test(result.error.message || "")
  ) {
    const minted = mintProductSku({
      artisanCode: normalizeArtisanCode(artisanCode || "ART000"),
      nextSkuSeq,
    })
    result = await write({ ...payload, sku: minted.sku })
    if (!result.error) {
      await supabase
        .from("artisans")
        .update({ next_sku_seq: minted.nextSkuSeq })
        .eq("id", artisanId)
    }
  }

  if (result.error && isMissingColumnError(result.error)) {
    const body = { ...(payload as Record<string, unknown>) }
    delete body.is_featured
    delete body.featured_order
    delete body.badge_left
    delete body.badge_right
    delete body.catalog_status
    delete body.image_urls
    delete body.weight
    delete body.region_origin
    delete body.care_instructions
    result = await write(body)
  }

  if (result.error || !result.data?.id) {
    return { ok: false, error: result.error?.message || "Could not save product." }
  }

  revalidatePath("/")
  revalidatePath("/shop")
  revalidatePath("/admin/products")

  const listed = await listAdminProducts()
  const product = listed.products.find((item) => item.id === result.data?.id)
  return { ok: true, product }
}

export async function deleteAdminProduct(
  productId: string
): Promise<{ ok: boolean; error?: string }> {
  const supabase = tryCreateServiceClient()
  if (!supabase) {
    return { ok: false, error: "Supabase service role is not configured." }
  }
  const id = String(productId || "").trim()
  if (!id) return { ok: false, error: "productId is required." }

  const { error } = await supabase.from("products").delete().eq("id", id)
  if (error) return { ok: false, error: error.message }

  revalidatePath("/")
  revalidatePath("/shop")
  revalidatePath("/admin/products")
  return { ok: true }
}

export async function listAdminArtisanOptions(): Promise<
  Array<{ id: string; label: string; artisanCode: string }>
> {
  const supabase = tryCreateServiceClient()
  if (!supabase) return []
  const { data } = await supabase
    .from("artisans")
    .select("id, artisan_code, workshop_name")
    .eq("is_active", true)
    .order("artisan_code", { ascending: true })
  return (data || []).map((row) => ({
    id: row.id,
    artisanCode: row.artisan_code,
    label: `${row.artisan_code} · ${row.workshop_name}`,
  }))
}
