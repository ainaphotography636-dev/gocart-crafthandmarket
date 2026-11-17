import "server-only"

import { mapArtisanRow, mapProductRow } from "@/lib/marketplace/mappers"
import type {
  ArtisanStorefront,
  StorefrontArtisan,
  StorefrontProduct,
} from "@/lib/marketplace/types"
import { isSupabaseConfigured } from "@/lib/supabase/config"
import { createClient } from "@/utils/supabase/server"

const PRODUCT_SELECT = `
  id,
  artisan_id,
  title,
  description,
  category,
  material,
  gi_tag,
  sku,
  price_usd,
  mrp_usd,
  currency_default,
  images,
  video_proof_url,
  in_stock,
  is_published,
  created_at,
  artisans (
    id,
    artisan_code,
    workshop_name,
    username,
    description,
    logo_url,
    region,
    address,
    gi_tags,
    verification_status,
    is_active
  )
`

export type CatalogListResult<T> = {
  items: T[]
  source: "supabase" | "unavailable" | "error"
  error?: string
}

/**
 * Published, in-stock products for the public shop grid.
 * Relies on RLS: `is_published = true and in_stock = true`.
 */
export async function listStorefrontProducts(options?: {
  search?: string | null
  limit?: number
}): Promise<CatalogListResult<StorefrontProduct>> {
  if (!isSupabaseConfigured()) {
    return { items: [], source: "unavailable" }
  }

  try {
    const supabase = await createClient()
    let query = supabase
      .from("products")
      .select(PRODUCT_SELECT)
      .eq("is_published", true)
      .eq("in_stock", true)
      .order("created_at", { ascending: false })

    if (options?.limit) {
      query = query.limit(options.limit)
    }

    const { data, error } = await query
    if (error) {
      return { items: [], source: "error", error: error.message }
    }

    let products = (data || []).map((row) => mapProductRow(row as never))

    const search = String(options?.search || "")
      .trim()
      .toLowerCase()
    if (search) {
      products = products.filter((product) => {
        const haystack = [
          product.title,
          product.sku,
          product.category,
          product.artisanName,
          product.description,
        ]
          .join(" ")
          .toLowerCase()
        return haystack.includes(search)
      })
    }

    return { items: products, source: "supabase" }
  } catch (error) {
    return {
      items: [],
      source: "error",
      error: error instanceof Error ? error.message : "Failed to load products",
    }
  }
}

/**
 * Verified + active artisan workshops for the public directory.
 */
export async function listStorefrontArtisans(options?: {
  limit?: number
}): Promise<CatalogListResult<StorefrontArtisan>> {
  if (!isSupabaseConfigured()) {
    return { items: [], source: "unavailable" }
  }

  try {
    const supabase = await createClient()
    let query = supabase
      .from("artisans")
      .select(
        `
        id,
        artisan_code,
        workshop_name,
        username,
        description,
        logo_url,
        region,
        address,
        gi_tags,
        verification_status,
        is_active
      `
      )
      .eq("is_active", true)
      .eq("verification_status", "verified")
      .order("workshop_name", { ascending: true })

    if (options?.limit) {
      query = query.limit(options.limit)
    }

    const { data, error } = await query
    if (error) {
      return { items: [], source: "error", error: error.message }
    }

    return {
      items: (data || []).map((row) => mapArtisanRow(row as never)),
      source: "supabase",
    }
  } catch (error) {
    return {
      items: [],
      source: "error",
      error: error instanceof Error ? error.message : "Failed to load artisans",
    }
  }
}

export async function getStorefrontProductById(
  productId: string
): Promise<{ product: StorefrontProduct | null; source: CatalogListResult<never>["source"]; error?: string }> {
  if (!isSupabaseConfigured()) {
    return { product: null, source: "unavailable" }
  }

  const id = String(productId || "").trim()
  if (!id) return { product: null, source: "error", error: "Missing product id" }

  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from("products")
      .select(PRODUCT_SELECT)
      .eq("id", id)
      .eq("is_published", true)
      .maybeSingle()

    if (error) {
      return { product: null, source: "error", error: error.message }
    }
    if (!data) return { product: null, source: "supabase" }

    return { product: mapProductRow(data as never), source: "supabase" }
  } catch (error) {
    return {
      product: null,
      source: "error",
      error: error instanceof Error ? error.message : "Failed to load product",
    }
  }
}

export async function getArtisanStorefrontByUsername(
  username: string
): Promise<{
  store: ArtisanStorefront | null
  source: CatalogListResult<never>["source"]
  error?: string
}> {
  if (!isSupabaseConfigured()) {
    return { store: null, source: "unavailable" }
  }

  const slug = String(username || "")
    .trim()
    .toLowerCase()
  if (!slug) {
    return { store: null, source: "error", error: "Missing username" }
  }

  try {
    const supabase = await createClient()
    const { data: artisanRow, error: artisanError } = await supabase
      .from("artisans")
      .select(
        `
        id,
        artisan_code,
        workshop_name,
        username,
        description,
        logo_url,
        region,
        address,
        gi_tags,
        verification_status,
        is_active
      `
      )
      .eq("username", slug)
      .eq("is_active", true)
      .eq("verification_status", "verified")
      .maybeSingle()

    if (artisanError) {
      return { store: null, source: "error", error: artisanError.message }
    }
    if (!artisanRow) {
      return { store: null, source: "supabase" }
    }

    const artisan = mapArtisanRow(artisanRow as never)

    const { data: productRows, error: productError } = await supabase
      .from("products")
      .select(PRODUCT_SELECT)
      .eq("artisan_id", artisan.id)
      .eq("is_published", true)
      .eq("in_stock", true)
      .order("created_at", { ascending: false })

    if (productError) {
      return { store: null, source: "error", error: productError.message }
    }

    const products = (productRows || []).map((row) => mapProductRow(row as never))

    return {
      store: {
        artisan: { ...artisan, productCount: products.length },
        products,
      },
      source: "supabase",
    }
  } catch (error) {
    return {
      store: null,
      source: "error",
      error: error instanceof Error ? error.message : "Failed to load artisan store",
    }
  }
}
