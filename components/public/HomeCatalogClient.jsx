'use client'

import { useEffect, useMemo, useState } from 'react'
import RecentlyAddedGallery from '@/components/public/RecentlyAddedGallery'
import BestSelling from '@/components/public/BestSelling'
import FeaturedArtisans from '@/components/public/FeaturedArtisans'
import { listStoreProducts } from '@/lib/productCatalog'
import { listLiveStores } from '@/lib/storeRegistry'

function mapLocalProduct(product) {
  return {
    id: product.id,
    name: product.name,
    title: product.name,
    description: product.description || '',
    category: product.category || 'Handicraft',
    material: product.material || null,
    giTag: product.giTag || null,
    craftTechnique: product.craftTechnique || null,
    dimensions: product.dimensions || null,
    weight: product.weight || null,
    regionOrigin: product.regionOrigin || null,
    careInstructions: product.careInstructions || null,
    specs: {
      stockQuantity: product.stock ?? null,
    },
    sku: product.sku || '',
    price: Number(product.price) || 0,
    mrp: Number(product.mrp) || Number(product.price) || 0,
    currencyDefault: product.currency || 'INR',
    images: Array.isArray(product.images) ? product.images : [],
    video: product.video || null,
    inStock: Boolean(product.inStock),
    isPublished: Boolean(product.isPublished ?? true),
    rating: Array.isArray(product.rating) ? product.rating : [],
    artisanId: product.storeId || '',
    artisanCode: product.artisanCode || '',
    artisanUsername: product.storeUsername || '',
    artisanName: product.storeUsername || 'Workshop',
    storeUsername: product.storeUsername || '',
    mediaStorage: product.mediaStorage || 'r2',
    createdAt: product.createdAt || null,
    source: 'local',
  }
}

function mapLocalArtisan(store) {
  return {
    id: store.id,
    artisanCode: store.artisanCode || 'ART000',
    name: store.name || store.username,
    username: store.username,
    description: store.description || store.address || '',
    logoUrl: store.logo || store.logoUrl || null,
    logo: store.logo || store.logoUrl || null,
    region: store.region || null,
    address: store.address || null,
    giTags: Array.isArray(store.giTags) ? store.giTags : [],
    verificationStatus: 'verified',
    isActive: true,
    source: 'local',
  }
}

/**
 * Prefer server (Supabase) catalog; if empty, surface this browser's workshop
 * catalog so newly added pieces/artisans aren't invisible during local demos.
 */
export default function HomeCatalogClient({
  products = [],
  artisans = [],
}) {
  const [localProducts, setLocalProducts] = useState([])
  const [localArtisans, setLocalArtisans] = useState([])

  useEffect(() => {
    try {
      setLocalProducts(listStoreProducts().map(mapLocalProduct))
      setLocalArtisans(listLiveStores().map(mapLocalArtisan))
    } catch {
      setLocalProducts([])
      setLocalArtisans([])
    }
  }, [])

  const displayProducts = useMemo(() => {
    if (products.length) return products
    return localProducts
      .slice()
      .sort((a, b) => {
        const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0
        const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0
        return bTime - aTime
      })
      .slice(0, 8)
  }, [products, localProducts])

  const displayArtisans = useMemo(() => {
    if (artisans.length) return artisans
    return localArtisans.slice(0, 6)
  }, [artisans, localArtisans])

  return (
    <>
      <RecentlyAddedGallery products={displayProducts} />
      <FeaturedArtisans artisans={displayArtisans} />
      <BestSelling products={displayProducts} />
    </>
  )
}
