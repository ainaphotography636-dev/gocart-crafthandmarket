'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import RecentlyAddedGallery from '@/components/public/RecentlyAddedGallery'
import BestSelling from '@/components/public/BestSelling'
import FeaturedArtisans from '@/components/public/FeaturedArtisans'
import { listStoreProducts } from '@/lib/productCatalog'
import { listLiveStores } from '@/lib/storeRegistry'
import { syncProductMediaBySku } from '@/app/actions/sync-product-media'
import { getProductImageUrls, getProductThumbnailUrl } from '@/lib/marketplace/media'

function mapLocalProduct(product) {
  const images = getProductImageUrls(product)
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
    images,
    image_urls: images,
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

function skuKey(value) {
  return String(value || '').trim().toUpperCase()
}

/**
 * Prefer server (Supabase) catalog; fill missing media from this browser's
 * workshop catalog (same SKU), and sync those R2 URLs back to Supabase.
 */
export default function HomeCatalogClient({
  products = [],
  artisans = [],
}) {
  const [localProducts, setLocalProducts] = useState([])
  const [localArtisans, setLocalArtisans] = useState([])
  const [mediaOverrides, setMediaOverrides] = useState({})
  const syncedRef = useRef(false)

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
    const bySku = new Map()
    for (const item of localProducts) {
      const key = skuKey(item.sku)
      if (key) bySku.set(key, item)
    }

    const base = products.length
      ? products
      : localProducts
          .slice()
          .sort((a, b) => {
            const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0
            const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0
            return bTime - aTime
          })
          .slice(0, 8)

    return base.map((product) => {
      const key = skuKey(product.sku)
      const local = key ? bySku.get(key) : null
      const override = key ? mediaOverrides[key] : null
      const serverImages = getProductImageUrls(product)
      const localImages = getProductImageUrls(local)
      const images =
        (override?.images?.length ? override.images : null) ||
        (serverImages.length ? serverImages : null) ||
        localImages

      return {
        ...product,
        images,
        image_urls: images,
        video: product.video || override?.video || local?.video || null,
        material: product.material || local?.material || null,
        dimensions: product.dimensions || local?.dimensions || null,
        weight: product.weight || local?.weight || null,
        regionOrigin:
          product.regionOrigin || local?.regionOrigin || null,
        craftTechnique: product.craftTechnique || local?.craftTechnique || null,
      }
    })
  }, [products, localProducts, mediaOverrides])

  const displayArtisans = useMemo(() => {
    const base = artisans.length ? artisans : localArtisans.slice(0, 6)
    return base.map((artisan) => {
      const local = localArtisans.find(
        (item) =>
          String(item.username || '').toLowerCase() ===
          String(artisan.username || '').toLowerCase()
      )
      const logo =
        artisan.logoUrl ||
        artisan.logo ||
        local?.logoUrl ||
        local?.logo ||
        getProductThumbnailUrl(
          displayProducts.find(
            (product) =>
              String(product.artisanUsername || product.storeUsername || '')
                .toLowerCase() === String(artisan.username || '').toLowerCase()
          )
        ) ||
        null

      return {
        ...artisan,
        logoUrl: logo,
        logo,
      }
    })
  }, [artisans, localArtisans, displayProducts])

  useEffect(() => {
    if (syncedRef.current) return
    if (!localProducts.length && !localArtisans.length) return

    const payload = []

    for (const local of localProducts) {
      if (!local.sku || !local.images?.length) continue
      const server = products.find(
        (item) => skuKey(item.sku) === skuKey(local.sku)
      )
      const serverImages = getProductImageUrls(server)
      if (!server || serverImages.length === 0) {
        payload.push({
          sku: local.sku,
          images: local.images,
          video: local.video || null,
        })
      }
    }

    for (const local of localArtisans) {
      if (local.username && (local.logoUrl || local.logo)) {
        payload.push({
          username: local.username,
          logoUrl: local.logoUrl || local.logo,
        })
      }
    }

    // Also push first product photo as workshop logo when store has none.
    for (const artisan of artisans) {
      if (artisan.logoUrl || artisan.logo) continue
      const photo = getProductThumbnailUrl(
        displayProducts.find(
          (product) =>
            String(product.artisanUsername || product.storeUsername || '')
              .toLowerCase() === String(artisan.username || '').toLowerCase()
        )
      )
      if (photo && artisan.username) {
        payload.push({ username: artisan.username, logoUrl: photo })
      }
    }

    if (!payload.length) return
    syncedRef.current = true

    void syncProductMediaBySku(payload).then((result) => {
      if (!result.ok || !result.updated) return
      const next = {}
      for (const row of payload) {
        if (row.sku && row.images?.length) {
          next[skuKey(row.sku)] = {
            images: row.images,
            video: row.video || null,
          }
        }
      }
      if (Object.keys(next).length) {
        setMediaOverrides((prev) => ({ ...prev, ...next }))
      }
    })
  }, [localProducts, localArtisans, products, artisans, displayProducts])

  return (
    <>
      <RecentlyAddedGallery products={displayProducts} />
      <FeaturedArtisans artisans={displayArtisans} />
      <BestSelling products={displayProducts} />
    </>
  )
}
