"use server"

import { revalidatePath } from "next/cache"
import prisma, { isDatabaseConfigured } from "@/lib/prisma"
import { mintProductSku, normalizeArtisanCode } from "@/lib/productCodes"

/**
 * Create a product under a store and auto-assign
 * sku = `{artisanCode}-{sequence}` (e.g. ART001-001).
 */
export async function createProductWithArtisanSku(input: {
  storeId: string
  name: string
  description: string
  mrp: number
  price: number
  images: string[]
  category: string
  video?: string | null
  giTag?: string | null
  material?: string | null
}) {
  if (!isDatabaseConfigured()) {
    return {
      ok: false,
      code: "DB_UNAVAILABLE" as const,
      error: "DATABASE_URL is not configured.",
    }
  }

  const storeId = String(input?.storeId || "").trim()
  if (!storeId) {
    return { ok: false, code: "VALIDATION" as const, error: "storeId is required." }
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const store = await tx.store.findUnique({
        where: { id: storeId },
        select: {
          id: true,
          artisanCode: true,
          nextSkuSeq: true,
          status: true,
          isActive: true,
        },
      })

      if (!store) {
        throw new Error("Store not found.")
      }
      if (store.status !== "approved" || !store.isActive) {
        throw new Error("Store must be approved and active before adding products.")
      }

      const minted = mintProductSku({
        artisanCode: normalizeArtisanCode(store.artisanCode),
        nextSkuSeq: store.nextSkuSeq,
      })

      const product = await tx.product.create({
        data: {
          name: String(input.name || "").trim(),
          description: String(input.description || "").trim(),
          mrp: Number(input.mrp),
          price: Number(input.price),
          images: input.images || [],
          video: input.video || null,
          category: String(input.category || "").trim(),
          giTag: input.giTag || null,
          material: input.material || null,
          sku: minted.sku,
          skuSequence: minted.skuSequence,
          storeId: store.id,
        },
      })

      await tx.store.update({
        where: { id: store.id },
        data: { nextSkuSeq: minted.nextSkuSeq },
      })

      return product
    })

    revalidatePath("/admin/products")
    revalidatePath("/admin/catalog")
    revalidatePath("/store/manage-product")
    revalidatePath("/shop")

    return { ok: true, product: result }
  } catch (error) {
    return {
      ok: false,
      code: "UNKNOWN" as const,
      error: error instanceof Error ? error.message : "Failed to create product.",
    }
  }
}
