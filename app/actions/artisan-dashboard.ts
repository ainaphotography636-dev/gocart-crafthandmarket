"use server"

import {
  getProductImageUrls,
  getProductVideoUrl,
} from "@/lib/marketplace/media"
import {
  isMissingColumnError,
  PRODUCT_SELECT_COMPAT,
  PRODUCT_SELECT_FULL,
} from "@/lib/marketplace/productSelect"
import { isSupabaseConfigured } from "@/lib/supabase/config"
import { createClient } from "@/utils/supabase/server"

export type ArtisanDashboardProduct = {
  id: string
  name: string
  title: string
  description: string
  category: string
  material: string | null
  dimensions: string | null
  craftTechnique: string | null
  sku: string
  price: number
  mrp: number
  images: string[]
  image_urls: string[]
  video: string | null
  inStock: boolean
  isPublished: boolean
  stock: number | null
  artisanCode: string
  storeUsername: string
  createdAt: string | null
  updatedAt: string | null
  rating: Array<{ rating: number; review?: string }>
}

export type ArtisanDashboardResult =
  | {
      ok: true
      source: "supabase"
      artisan: {
        id: string
        artisanCode: string
        username: string
        workshopName: string
        verificationStatus: string
        isActive: boolean
      }
      products: ArtisanDashboardProduct[]
      stats: {
        totalProducts: number
        inStock: number
        withVideo: number
        published: number
        drafts: number
        totalOrders: number
        totalEarnings: number
        ratings: Array<{
          rating: number
          review?: string
          createdAt?: string
          user?: { name?: string; image?: string }
          product?: {
            id: string
            name: string
            category: string
            sku?: string
          }
        }>
      }
    }
  | {
      ok: false
      code:
        | "SUPABASE_UNAVAILABLE"
        | "UNAUTHORIZED"
        | "ARTISAN"
        | "QUERY"
      error: string
      products: []
      stats: null
    }

function firstPositiveNumber(...values: Array<number | string | null | undefined>) {
  for (const value of values) {
    const n = Number(value)
    if (Number.isFinite(n) && n > 0) return n
  }
  return 0
}

function mapWorkshopProduct(row: Record<string, unknown>): ArtisanDashboardProduct {
  const images = getProductImageUrls(row as never)
  const video = getProductVideoUrl(row as never)
  const specs =
    row.specs && typeof row.specs === "object" && !Array.isArray(row.specs)
      ? (row.specs as Record<string, unknown>)
      : null
  const stockRaw = specs?.stockQuantity
  const stock =
    stockRaw === undefined || stockRaw === null
      ? null
      : Number(stockRaw)

  const price = firstPositiveNumber(
    row.price_inr as number,
    row.price_usd as number
  )
  const mrp = firstPositiveNumber(
    row.mrp_inr as number,
    row.mrp_usd as number,
    price
  )

  return {
    id: String(row.id),
    name: String(row.title || ""),
    title: String(row.title || ""),
    description: String(row.description || ""),
    category: String(row.category || "Handicraft"),
    material: (row.material as string) || null,
    dimensions: (row.dimensions as string) || null,
    craftTechnique: (row.craft_technique as string) || null,
    sku: String(row.sku || ""),
    price,
    mrp,
    images,
    image_urls: images,
    video,
    inStock: Boolean(row.in_stock),
    isPublished: Boolean(row.is_published),
    stock: Number.isFinite(stock as number) ? (stock as number) : null,
    artisanCode: "",
    storeUsername: "",
    createdAt: (row.created_at as string) || null,
    updatedAt: (row.updated_at as string) || null,
    rating: [],
  }
}

/**
 * Load the signed-in artisan's workshop catalog from Supabase (auth cookies + RLS).
 * Includes drafts and published pieces owned by their artisan row.
 */
export async function getArtisanWorkshopCatalog(): Promise<ArtisanDashboardResult> {
  if (!isSupabaseConfigured()) {
    return {
      ok: false,
      code: "SUPABASE_UNAVAILABLE",
      error: "Supabase is not configured.",
      products: [],
      stats: null,
    }
  }

  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return {
        ok: false,
        code: "UNAUTHORIZED",
        error: "Sign in as an artisan to load your workshop catalog.",
        products: [],
        stats: null,
      }
    }

    const { data: artisan, error: artisanError } = await supabase
      .from("artisans")
      .select(
        "id, artisan_code, username, workshop_name, verification_status, is_active"
      )
      .eq("profile_id", user.id)
      .maybeSingle()

    if (artisanError || !artisan) {
      return {
        ok: false,
        code: "ARTISAN",
        error:
          artisanError?.message ||
          "No artisan workshop is linked to this account yet.",
        products: [],
        stats: null,
      }
    }

    // Owner RLS: select own products (draft + published) by artisan_id.
    let rows: Record<string, unknown>[] = []
    let productError: { message?: string } | null = null

    const full = await supabase
      .from("products")
      .select(PRODUCT_SELECT_FULL)
      .eq("artisan_id", artisan.id)
      .order("created_at", { ascending: false })

    if (full.error && isMissingColumnError(full.error)) {
      const retry = await supabase
        .from("products")
        .select(PRODUCT_SELECT_COMPAT)
        .eq("artisan_id", artisan.id)
        .order("created_at", { ascending: false })
      rows = (retry.data || []) as Record<string, unknown>[]
      productError = retry.error
    } else {
      rows = (full.data || []) as Record<string, unknown>[]
      productError = full.error
    }

    if (productError) {
      return {
        ok: false,
        code: "QUERY",
        error: productError.message || "Could not load products.",
        products: [],
        stats: null,
      }
    }

    const products = rows.map((row) => {
      const mapped = mapWorkshopProduct(row)
      return {
        ...mapped,
        artisanCode: artisan.artisan_code,
        storeUsername: artisan.username,
      }
    })

    const inStock = products.filter((product) => product.inStock).length
    const withVideo = products.filter((product) => Boolean(product.video)).length
    const published = products.filter((product) => product.isPublished).length
    const drafts = products.length - published

    return {
      ok: true,
      source: "supabase",
      artisan: {
        id: artisan.id,
        artisanCode: artisan.artisan_code,
        username: artisan.username,
        workshopName: artisan.workshop_name,
        verificationStatus: artisan.verification_status,
        isActive: Boolean(artisan.is_active),
      },
      products,
      stats: {
        totalProducts: products.length,
        inStock,
        withVideo,
        published,
        drafts,
        totalOrders: 0,
        totalEarnings: 0,
        ratings: [],
      },
    }
  } catch (error) {
    return {
      ok: false,
      code: "QUERY",
      error: error instanceof Error ? error.message : "Failed to load workshop catalog.",
      products: [],
      stats: null,
    }
  }
}
