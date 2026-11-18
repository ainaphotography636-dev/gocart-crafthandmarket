"use client"

import { useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { syncProductMediaBySku } from "@/app/actions/sync-product-media"
import { listStoreProducts } from "@/lib/productCatalog"
import { listLiveStores } from "@/lib/storeRegistry"
import type { StorefrontProduct } from "@/lib/marketplace/types"

/**
 * When the signed-in artisan's browser has R2 image URLs for a SKU that
 * landed in Supabase without images, push those URLs to the products row
 * so every visitor sees the photos.
 */
export default function CatalogMediaBridge({
  products = [],
}: {
  products?: StorefrontProduct[]
}) {
  const router = useRouter()
  const ran = useRef(false)

  useEffect(() => {
    if (ran.current) return
    ran.current = true

    try {
      const localProducts = listStoreProducts()
      const localStores = listLiveStores()
      const payload: Array<{
        sku?: string
        images?: string[]
        video?: string | null
        username?: string
        logoUrl?: string
      }> = []

      for (const local of localProducts) {
        const sku = String(local.sku || "").trim()
        const images = Array.isArray(local.images)
          ? local.images
              .map((url: string) => String(url || "").trim())
              .filter(Boolean)
          : []
        if (!sku || !images.length) continue

        const server = products.find(
          (item) =>
            String(item.sku || "").trim().toUpperCase() === sku.toUpperCase()
        )
        const serverImages = Array.isArray(server?.images)
          ? server.images.filter(Boolean)
          : []
        if (!server || serverImages.length === 0) {
          payload.push({
            sku,
            images,
            video: local.video || null,
          })
        }
      }

      for (const store of localStores) {
        const logo = store.logo || store.logoUrl
        if (store.username && logo) {
          payload.push({
            username: store.username,
            logoUrl: logo,
          })
        }
      }

      if (!payload.length) return
      void syncProductMediaBySku(payload).then((result) => {
        if (result.ok && result.updated > 0) {
          router.refresh()
        }
      })
    } catch {
      // Ignore localStorage / sync failures on public browsers.
    }
  }, [products, router])

  return null
}
