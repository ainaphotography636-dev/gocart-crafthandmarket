"use client"

import ProductUploadForm from "@/components/ProductUploadForm"

/**
 * Artisan product creation — media dropzone with client-side video compression
 * and R2 paths under artisans/{artisanId}/products/{productId}/.
 */
export default function ArtisanNewProductPage() {
  return (
    <div className="pb-16">
      <ProductUploadForm />
    </div>
  )
}
