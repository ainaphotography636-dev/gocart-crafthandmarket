"use client"

import ProductUploadForm from "@/components/ProductUploadForm"

/**
 * Artisan product creation — 4–6 R2 photos, optional product video,
 * INR pricing, handicraft specs, draft / publish.
 * Media paths: artisans/{artisanId}/products/{sku}/
 */
export default function ArtisanNewProductPage() {
  return <ProductUploadForm />
}
