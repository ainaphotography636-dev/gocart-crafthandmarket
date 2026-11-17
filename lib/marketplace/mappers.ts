import { resolveMediaUrl, resolveMediaUrls } from "@/lib/marketplace/media"
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
  sku: string
  price_usd: number | string
  mrp_usd: number | string | null
  currency_default: string | null
  images: string[] | null
  video_proof_url: string | null
  in_stock: boolean
  is_published: boolean
  created_at: string | null
  artisans?: ArtisanRow | ArtisanRow[] | null
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
  const price = Number(row.price_usd) || 0
  const mrp = Number(row.mrp_usd)
  const images = resolveMediaUrls(row.images)
  const video = resolveMediaUrl(row.video_proof_url)

  return {
    id: row.id,
    name: row.title,
    title: row.title,
    description: row.description || "",
    category: row.category || "Handicraft",
    material: row.material,
    giTag: row.gi_tag,
    sku: row.sku,
    price,
    mrp: Number.isFinite(mrp) && mrp > 0 ? mrp : price,
    currencyDefault: row.currency_default || "USD",
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
