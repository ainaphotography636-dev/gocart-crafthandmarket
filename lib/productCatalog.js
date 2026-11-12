'use client'

import { claimNextProductSku, getActiveStore } from "@/lib/storeRegistry"
import { HANDICRAFT_CATEGORIES } from "@/lib/handicraftCategories"

export const PRODUCT_CATALOG_KEY = "crafthand_product_catalog"

export const ARTISAN_CATEGORIES = [...HANDICRAFT_CATEGORIES, "Others"]

/** Vercel request body limit for server-proxied uploads */
const SERVER_UPLOAD_LIMIT = 4 * 1024 * 1024
const VIDEO_HARD_LIMIT = 80 * 1024 * 1024

function canUseStorage() {
  return typeof window !== "undefined" && typeof localStorage !== "undefined"
}

function readCatalog() {
  if (!canUseStorage()) return []
  try {
    const raw = localStorage.getItem(PRODUCT_CATALOG_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeCatalog(products) {
  if (!canUseStorage()) return
  localStorage.setItem(PRODUCT_CATALOG_KEY, JSON.stringify(products))
}

export function listProducts(storeId) {
  const all = readCatalog()
  if (!storeId) return all
  return all.filter((product) => product.storeId === storeId)
}

export function listStoreProducts() {
  const store = getActiveStore()
  if (!store) return []
  return listProducts(store.id)
}

export function getProductById(productId) {
  return readCatalog().find((product) => product.id === productId) || null
}

export function addProduct(product) {
  const catalog = readCatalog()
  writeCatalog([product, ...catalog])
  return product
}

export function toggleProductStock(productId) {
  const catalog = readCatalog()
  const next = catalog.map((product) => {
    if (product.id !== productId) return product
    return {
      ...product,
      inStock: !product.inStock,
      updatedAt: new Date().toISOString(),
    }
  })
  writeCatalog(next)
  return next.find((product) => product.id === productId) || null
}

export function getStoreDashboardStats() {
  const store = getActiveStore()
  const products = listStoreProducts()
  const inStock = products.filter((product) => product.inStock).length
  const withVideo = products.filter((product) => Boolean(product.video)).length
  const ratings = products.flatMap((product) =>
    (product.rating || []).map((entry) => ({
      ...entry,
      product: {
        id: product.id,
        name: product.name,
        category: product.category,
      },
    }))
  )

  return {
    store,
    products,
    totalProducts: products.length,
    inStock,
    withVideo,
    totalRatings: ratings.length,
    ratings,
    recentProducts: products.slice(0, 6),
  }
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function corsHint() {
  return "Enable CORS on the Cloudflare R2 bucket (crafthandmarket): AllowedOrigins = your Vercel URL, AllowedMethods = GET,PUT,HEAD, AllowedHeaders = *."
}

async function uploadViaFormApi(
  files,
  { storeId, artisanId, productId, kind = "image" } = {}
) {
  try {
    const formData = new FormData()
    formData.append("storeId", storeId || "anonymous")
    formData.append("artisanId", artisanId || "")
    formData.append("productId", productId || "")
    formData.append("kind", kind)
    files.forEach((file) => formData.append("files", file))

    // Prefer canonical /api/upload, keep product-media as compatible fallback.
    let response = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    })
    if (response.status === 404) {
      response = await fetch("/api/upload/product-media", {
        method: "POST",
        body: formData,
      })
    }
    const payload = await response.json().catch(() => ({}))

    if (response.ok && payload.ok && Array.isArray(payload.urls) && payload.urls.length) {
      return { ok: true, urls: payload.urls, keys: payload.keys || [], storage: "r2" }
    }

    return {
      ok: false,
      skipped: Boolean(payload.skipped) || response.status === 503,
      reason: payload.error || "Could not upload media through the server.",
    }
  } catch (error) {
    return {
      ok: false,
      skipped: false,
      reason: error?.message || "Network error while uploading media.",
    }
  }
}

async function presignAndUpload(file, { storeId, artisanId, productId, kind }) {
  try {
    const response = await fetch("/api/upload/presign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        filename: file.name || (kind === "video" ? "product.mp4" : "product.jpg"),
        contentType: file.type || (kind === "video" ? "video/mp4" : "image/jpeg"),
        storeId,
        artisanId,
        productId,
        kind,
      }),
    })
    const payload = await response.json().catch(() => ({}))

    if (!response.ok || !payload.ok) {
      return {
        ok: false,
        skipped: Boolean(payload.skipped),
        reason: payload.error || "Could not prepare Cloudflare upload.",
      }
    }

    let put
    try {
      put = await fetch(payload.uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Type": payload.contentType || file.type || "application/octet-stream",
        },
        body: file,
      })
    } catch {
      return {
        ok: false,
        skipped: false,
        corsBlocked: true,
        reason: `Browser upload to R2 was blocked (Failed to fetch). ${corsHint()}`,
      }
    }

    if (!put.ok) {
      return {
        ok: false,
        skipped: false,
        reason: `R2 rejected the upload (${put.status}). Check bucket credentials and ${corsHint()}`,
      }
    }

    return { ok: true, url: payload.publicUrl, key: payload.key, storage: "r2" }
  } catch (error) {
    return {
      ok: false,
      skipped: false,
      reason: error?.message || "Could not upload to Cloudflare R2.",
    }
  }
}

/**
 * Upload product images + optional craft video to Cloudflare R2.
 * Paths: artisans/{artisanId}/products/{productId}/{timestamp}-{fileName}
 */
export async function uploadProductMedia({
  images = [],
  video = null,
  storeId,
  artisanId,
  productId,
}) {
  const imageFiles = images.filter(Boolean)
  if (!imageFiles.length) {
    throw new Error("Add at least one product image.")
  }
  if (!artisanId || !productId) {
    throw new Error("artisanId and productId are required before uploading media.")
  }
  if (video && video.size > VIDEO_HARD_LIMIT) {
    throw new Error("Workshop video must be 80MB or smaller.")
  }

  const pathContext = { storeId, artisanId, productId }

  // 1) Images via server → R2 (avoids browser CORS issues)
  const imageUpload = await uploadViaFormApi(imageFiles, {
    ...pathContext,
    kind: "image",
  })
  let imageUrls = []
  let storage = "r2"
  let reason = ""

  if (imageUpload.ok) {
    imageUrls = imageUpload.urls
  } else if (imageUpload.skipped) {
    imageUrls = await Promise.all(imageFiles.map((item) => fileToDataUrl(item)))
    storage = "local-fallback"
    reason = imageUpload.reason
  } else {
    // Last resort: try per-file presign
    for (const file of imageFiles) {
      const result = await presignAndUpload(file, { ...pathContext, kind: "image" })
      if (!result.ok) {
        throw new Error(result.reason || imageUpload.reason || "Could not upload product images.")
      }
      imageUrls.push(result.url)
    }
  }

  // 2) Optional video
  let videoUrl = null
  if (video) {
    if (video.size <= SERVER_UPLOAD_LIMIT) {
      const viaServer = await uploadViaFormApi([video], {
        ...pathContext,
        kind: "video",
      })
      if (viaServer.ok) {
        videoUrl = viaServer.urls[0]
      } else if (!viaServer.skipped) {
        // Fall through to presign
        const viaPresign = await presignAndUpload(video, {
          ...pathContext,
          kind: "video",
        })
        if (!viaPresign.ok) {
          throw new Error(viaPresign.reason || viaServer.reason || "Video upload failed.")
        }
        videoUrl = viaPresign.url
      } else {
        throw new Error(
          "Video upload needs Cloudflare R2. Add R2 env vars on Vercel, enable bucket CORS, then retry."
        )
      }
    } else {
      const viaPresign = await presignAndUpload(video, {
        ...pathContext,
        kind: "video",
      })
      if (!viaPresign.ok) {
        throw new Error(
          viaPresign.corsBlocked
            ? `${viaPresign.reason} Or compress the video under 4MB so it can upload through the server.`
            : viaPresign.reason || "Video upload failed."
        )
      }
      videoUrl = viaPresign.url
    }
  }

  return { images: imageUrls, video: videoUrl, storage, reason }
}

export async function createStoreProduct({
  name,
  description,
  mrp,
  price,
  category,
  images,
  video,
}) {
  const store = getActiveStore()
  if (!store || store.status !== "approved") {
    throw new Error("Approve and activate your workshop before adding products.")
  }

  const productName = String(name || "").trim()
  const productDescription = String(description || "").trim()
  const productCategory = String(category || "").trim()
  const actualPrice = Number(mrp)
  const offerPrice = Number(price)
  const imageFiles = Object.values(images || {}).filter(Boolean)

  if (!productName) throw new Error("Product name is required.")
  if (!productDescription) throw new Error("Product description is required.")
  if (!productCategory) throw new Error("Select a category.")
  if (!Number.isFinite(actualPrice) || actualPrice <= 0) {
    throw new Error("Enter a valid actual price.")
  }
  if (!Number.isFinite(offerPrice) || offerPrice <= 0) {
    throw new Error("Enter a valid offer price.")
  }
  if (offerPrice > actualPrice) {
    throw new Error("Offer price cannot be higher than actual price.")
  }
  if (!imageFiles.length) throw new Error("Add at least one product image.")

  // Claim artisan prefix + SKU first so R2 keys use stable folder IDs.
  const claimed = claimNextProductSku(store.id)
  const productId = `prod_${Date.now()}`
  const uploaded = await uploadProductMedia({
    images: imageFiles,
    video: video || null,
    storeId: store.id,
    artisanId: claimed.artisanCode,
    // Prefer SKU as the product folder id for readable R2 browsing.
    productId: claimed.sku || productId,
  })
  const now = new Date().toISOString()

  const product = {
    id: productId,
    storeId: store.id,
    storeUsername: store.username,
    artisanCode: claimed.artisanCode,
    sku: claimed.sku,
    skuSequence: claimed.skuSequence,
    name: productName,
    description: productDescription,
    mrp: actualPrice,
    price: offerPrice,
    category: productCategory,
    images: uploaded.images,
    video: uploaded.video,
    mediaStorage: uploaded.storage,
    inStock: true,
    rating: [],
    createdAt: now,
    updatedAt: now,
  }

  addProduct(product)
  return { product, uploaded }
}
