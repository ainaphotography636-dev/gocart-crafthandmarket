/**
 * Storefront-facing marketplace types (mapped from Supabase + R2).
 */

export type StorefrontArtisan = {
  id: string
  artisanCode: string
  name: string
  username: string
  description: string
  logoUrl: string | null
  logo: string | null
  region: string | null
  address: string | null
  giTags: string[]
  verificationStatus: string
  isActive: boolean
  source: "supabase" | "r2" | "local" | "demo"
  productCount?: number
}

export type StorefrontProduct = {
  id: string
  name: string
  title: string
  description: string
  category: string
  material: string | null
  giTag: string | null
  craftTechnique?: string | null
  dimensions?: string | null
  weight?: string | null
  regionOrigin?: string | null
  careInstructions?: string | null
  specs?: Record<string, unknown> | null
  sku: string
  price: number
  mrp: number
  currencyDefault: string
  images: string[]
  video: string | null
  inStock: boolean
  isPublished: boolean
  rating: Array<{ rating: number; review?: string; user?: { image?: string; name?: string } }>
  artisanId: string
  artisanCode: string
  artisanUsername: string
  artisanName: string
  storeUsername: string
  mediaStorage: "r2" | "unknown"
  createdAt: string | null
  isFeatured?: boolean
  featuredOrder?: number
  badgeLeft?: string
  badgeRight?: string
  catalogStatus?: "draft" | "pending" | "approved"
  displayName?: string
}

export type ArtisanStorefront = {
  artisan: StorefrontArtisan
  products: StorefrontProduct[]
}
