import {
  getProductImageUrls,
  getProductVideoUrl,
  resolveMediaUrl,
} from "@/lib/marketplace/media"
import type { StorefrontArtisan, StorefrontProduct } from "@/lib/marketplace/types"

type ArtisanRow = {
  id: string
  artisan_code: string
  workshop_name: string
  username: string
  description: string | null
  logo_url: string | null
  region: string | null
  address: string | null
  gi_tags: string[] | null
  verification_status: string
  is_active: boolean
}

type ProductRow = {
  id: string
  artisan_id: string
  title: string
  description: string | null
  category: string | null
  material: string | null
  gi_tag: string | null
  craft_technique?: string | null
  dimensions?: string | null
  weight?: string | null
  region_origin?: string | null
  care_instructions?: string | null
  specs?: Record<string, unknown> | null
  sku: string
  price_inr?: number | string | null
  mrp_inr?: number | string | null
  price_usd: number | string
  mrp_usd: number | string | null
  currency_default: string | null
  images?: string[] | null
  image_urls?: string[] | null
  video_proof_url?: string | null
  item_video_url?: string | null
  in_stock: boolean
  is_published: boolean
  created_at: string | null
  artisans?: ArtisanRow | ArtisanRow[] | null
}

function firstPositiveNumber(...values: Array<number | string | null | undefined>) {
  for (const value of values) {
    const n = Number(value)
    if (Number.isFinite(n) && n > 0) return n
  }
  return 0
}

function asSingleArtisan(value: ProductRow["artisans"]): ArtisanRow | null {
  if (!value) return null
  return Array.isArray(value) ? value[0] || null : value
}

export function mapArtisanRow(row: ArtisanRow): StorefrontArtisan {
  const logoUrl = resolveMediaUrl(row.logo_url)
  return {
    id: row.id,
    artisanCode: row.artisan_code,
    name: row.workshop_name,
    username: row.username,
    description: row.description || "",
    logoUrl,
    logo: logoUrl,
    region: row.region,
    address: row.address,
    giTags: Array.isArray(row.gi_tags) ? row.gi_tags : [],
    verificationStatus: row.verification_status,
    isActive: Boolean(row.is_active),
    source: "supabase",
  }
}

export function mapProductRow(row: ProductRow): StorefrontProduct {
  const artisan = asSingleArtisan(row.artisans)
  const price = firstPositiveNumber(row.price_inr, row.price_usd)
  const mrp = firstPositiveNumber(row.mrp_inr, row.mrp_usd, price)
  const images = getProductImageUrls(row)
  const video = getProductVideoUrl(row)
  const specs =
    row.specs && typeof row.specs === "object" && !Array.isArray(row.specs)
      ? row.specs
      : null

  return {
    id: row.id,
    name: row.title,
    title: row.title,
    description: row.description || "",
    category: row.category || "Handicraft",
    material: row.material,
    giTag: row.gi_tag,
    craftTechnique: row.craft_technique || null,
    dimensions: row.dimensions || null,
    weight: row.weight || null,
    regionOrigin: row.region_origin || null,
    careInstructions: row.care_instructions || null,
    specs,
    sku: row.sku,
    price,
    mrp,
    currencyDefault: row.currency_default || "INR",
    images,
    video,
    inStock: Boolean(row.in_stock),
    isPublished: Boolean(row.is_published),
    rating: [],
    artisanId: row.artisan_id,
    artisanCode: artisan?.artisan_code || "",
    artisanUsername: artisan?.username || "",
    artisanName: artisan?.workshop_name || "",
    storeUsername: artisan?.username || "",
    mediaStorage: "r2",
    createdAt: row.created_at,
  }
}
