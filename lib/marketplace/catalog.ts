import "server-only"

import { mapArtisanRow, mapProductRow } from "@/lib/marketplace/mappers"
import {
  isMissingColumnError,
  PRODUCT_SELECT_COMPAT,
  PRODUCT_SELECT_FULL,
  PRODUCT_SELECT_SPECS,
} from "@/lib/marketplace/productSelect"
import { readFeaturedFields } from "@/lib/marketplace/featured"
import type {
  ArtisanStorefront,
  StorefrontArtisan,
  StorefrontProduct,
} from "@/lib/marketplace/types"
import { isSupabaseConfigured } from "@/lib/supabase/config"
import { createClient } from "@/utils/supabase/server"

export type CatalogListResult<T> = {
  items: T[]
  source: "supabase" | "unavailable" | "error"
  error?: string
}

type SupabaseServer = Awaited<ReturnType<typeof createClient>>

async function queryProducts(
  supabase: SupabaseServer,
  apply: (
    select: string
  ) => PromiseLike<{ data: unknown; error: { message?: string } | null }>
) {
  const full = await apply(PRODUCT_SELECT_FULL)
  if (!full.error) return full

  if (isMissingColumnError(full.error)) {
    const specs = await apply(PRODUCT_SELECT_SPECS)
    if (!specs.error) return specs
    if (isMissingColumnError(specs.error)) {
      return await apply(PRODUCT_SELECT_COMPAT)
    }
    return specs
  }

  return full
}

/**
 * Published products for the public storefront.
 * Defaults to in-stock only (shop grid). Pass `requireInStock: false`
 * for homepage "Recently Added" so stock status can be shown.
 */
export async function listStorefrontProducts(options?: {
  search?: string | null
  limit?: number
  requireInStock?: boolean
}): Promise<CatalogListResult<StorefrontProduct>> {
  if (!isSupabaseConfigured()) {
    return { items: [], source: "unavailable" }
  }

  try {
    const supabase = await createClient()
    const requireInStock = options?.requireInStock !== false

    const { data, error } = await queryProducts(supabase, (select) => {
      let query = supabase
        .from("products")
        .select(select)
        .eq("is_published", true)
        .order("created_at", { ascending: false })

      if (requireInStock) {
        query = query.eq("in_stock", true)
      }
      if (options?.limit) {
        query = query.limit(options.limit)
      }
      return query
    })

    if (error) {
      return { items: [], source: "error", error: error.message }
    }

    let products = (Array.isArray(data) ? data : []).map((row) =>
      mapProductRow(row as never)
    )

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
 * Featured Luxury Handicrafts — approved + featured products for homepage.
 * Falls back to newest published rows when none are flagged featured yet.
 */
export async function listFeaturedLuxuryProducts(options?: {
  category?: string | null
  limit?: number
}): Promise<CatalogListResult<StorefrontProduct>> {
  if (!isSupabaseConfigured()) {
    return { items: [], source: "unavailable" }
  }

  try {
    const supabase = await createClient()
    const limit = options?.limit ?? 8

    const { data, error } = await queryProducts(supabase, (select) =>
      supabase
        .from("products")
        .select(select)
        .eq("is_published", true)
        .order("created_at", { ascending: false })
        .limit(Math.max(limit * 4, 24))
    )

    if (error) {
      return { items: [], source: "error", error: error.message }
    }

    let products = (Array.isArray(data) ? data : []).map((row) => {
      const mapped = mapProductRow(row as never)
      const featured = readFeaturedFields(row as Record<string, unknown>)
      return {
        ...mapped,
        isFeatured: featured.isFeatured,
        featuredOrder: featured.featuredOrder,
        badgeLeft: featured.badgeLeft,
        badgeRight: featured.badgeRight,
        catalogStatus: featured.catalogStatus,
        displayName: featured.displayName || mapped.title,
        specs: {
          ...(mapped.specs || {}),
          badge: featured.badgeLeft || mapped.specs?.badge,
          series: featured.badgeRight || mapped.specs?.series,
          displayName: featured.displayName || mapped.specs?.displayName,
          isFeatured: featured.isFeatured,
          featuredOrder: featured.featuredOrder,
          catalogStatus: featured.catalogStatus,
        },
      }
    })

    const featuredOnly = products.filter((product) => Boolean(product.isFeatured))

    // Prefer explicitly featured; otherwise keep published rows for the grid.
    products = (featuredOnly.length ? featuredOnly : products)
      .slice()
      .sort((a, b) => {
        const orderA = Number(a.featuredOrder || 0)
        const orderB = Number(b.featuredOrder || 0)
        if (orderA !== orderB) return orderA - orderB
        const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0
        const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0
        return bTime - aTime
      })

    const category = String(options?.category || "").trim().toLowerCase()
    if (category && category !== "all") {
      products = products.filter((product) => {
        const hay = [
          product.category,
          product.craftTechnique,
          product.giTag,
          product.material,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
        return (
          hay.includes(category) ||
          category.split(/\s+/).some((part) => hay.includes(part))
        )
      })
    }

    return { items: products.slice(0, limit), source: "supabase" }
  } catch (error) {
    return {
      items: [],
      source: "error",
      error: error instanceof Error ? error.message : "Failed to load featured products",
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
): Promise<{
  product: StorefrontProduct | null
  source: CatalogListResult<never>["source"]
  error?: string
}> {
  if (!isSupabaseConfigured()) {
    return { product: null, source: "unavailable" }
  }

  const id = String(productId || "").trim()
  if (!id) return { product: null, source: "error", error: "Missing product id" }

  try {
    const supabase = await createClient()
    const { data, error } = await queryProducts(supabase, (select) =>
      supabase
        .from("products")
        .select(select)
        .eq("id", id)
        .eq("is_published", true)
        .maybeSingle()
    )

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

    const { data: productRows, error: productError } = await queryProducts(
      supabase,
      (select) =>
        supabase
          .from("products")
          .select(select)
          .eq("artisan_id", artisan.id)
          .eq("is_published", true)
          .eq("in_stock", true)
          .order("created_at", { ascending: false })
    )

    if (productError) {
      return { store: null, source: "error", error: productError.message }
    }

    const products = (Array.isArray(productRows) ? productRows : []).map((row) =>
      mapProductRow(row as never)
    )

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
