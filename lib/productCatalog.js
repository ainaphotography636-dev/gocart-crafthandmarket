'use client'

import { getActiveStore } from "@/lib/storeRegistry"

export const PRODUCT_CATALOG_KEY = "crafthand_product_catalog"

export const ARTISAN_CATEGORIES = [
  "Pottery & Ceramics",
  "Handloom & Textiles",
  "Woodcraft",
  "Jewellery",
  "Metalwork",
  "Spices & Pantry",
  "Home Decor",
  "Art & Prints",
  "Hobbies & Crafts",
  "Others",
]

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

async function presignAndUpload(file, { storeId, kind }) {
  const response = await fetch("/api/upload/presign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      filename: file.name || (kind === "video" ? "product.mp4" : "product.jpg"),
      contentType: file.type || (kind === "video" ? "video/mp4" : "image/jpeg"),
      storeId,
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

  const put = await fetch(payload.uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": payload.contentType || file.type || "application/octet-stream",
    },
    body: file,
  })

  if (!put.ok) {
    return {
      ok: false,
      skipped: false,
      reason:
        "Direct upload to Cloudflare R2 failed. Enable CORS for PUT on the crafthandmarket bucket (AllowedOrigins = your Vercel domain).",
    }
  }

  return { ok: true, url: payload.publicUrl, key: payload.key, storage: "r2" }
}

async function uploadViaFormApi(files, storeId) {
  const formData = new FormData()
  formData.append("storeId", storeId || "anonymous")
  files.forEach((file) => formData.append("files", file))

  const response = await fetch("/api/upload/product-media", {
    method: "POST",
    body: formData,
  })
  const payload = await response.json().catch(() => ({}))

  if (response.ok && payload.ok && Array.isArray(payload.urls) && payload.urls.length) {
    return { ok: true, urls: payload.urls, storage: "r2" }
  }

  return {
    ok: false,
    skipped: Boolean(payload.skipped) || response.status === 503,
    reason: payload.error || "Could not upload product images.",
  }
}

/**
 * Upload product images (and optional craft process video) to Cloudflare R2.
 * Videos use presigned PUT so large files bypass the Vercel request body limit.
 */
export async function uploadProductMedia({ images = [], video = null, storeId }) {
  const imageFiles = images.filter(Boolean)
  if (!imageFiles.length) {
    throw new Error("Add at least one product image.")
  }
  if (video && video.size > 80 * 1024 * 1024) {
    throw new Error("Workshop video must be 80MB or smaller.")
  }

  const imageUrls = []
  let storage = "r2"
  let reason = ""

  // Prefer direct R2 uploads for every image.
  let usedPresign = false
  for (const file of imageFiles) {
    const result = await presignAndUpload(file, { storeId, kind: "image" })
    if (result.ok) {
      imageUrls.push(result.url)
      usedPresign = true
      continue
    }
    if (result.skipped) {
      // Fall back to local data URLs when R2 is missing (demo mode).
      const localUrls = await Promise.all(imageFiles.map((item) => fileToDataUrl(item)))
      return {
        images: localUrls,
        video: null,
        storage: "local-fallback",
        reason: result.reason,
      }
    }
    // If presign/CORS fails, try the server FormData path once for all images.
    break
  }

  if (!usedPresign || imageUrls.length !== imageFiles.length) {
    const viaApi = await uploadViaFormApi(imageFiles, storeId)
    if (viaApi.ok) {
      imageUrls.splice(0, imageUrls.length, ...viaApi.urls)
      storage = viaApi.storage
    } else if (viaApi.skipped) {
      const localUrls = await Promise.all(imageFiles.map((item) => fileToDataUrl(item)))
      return {
        images: localUrls,
        video: null,
        storage: "local-fallback",
        reason: viaApi.reason,
      }
    } else {
      throw new Error(viaApi.reason || "Could not upload product images.")
    }
  }

  let videoUrl = null
  if (video) {
    const videoResult = await presignAndUpload(video, { storeId, kind: "video" })
    if (!videoResult.ok) {
      throw new Error(
        videoResult.reason ||
          "Video upload requires Cloudflare R2 with CORS PUT enabled on the bucket."
      )
    }
    videoUrl = videoResult.url
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

  const uploaded = await uploadProductMedia({
    images: imageFiles,
    video: video || null,
    storeId: store.id,
  })
  const now = new Date().toISOString()

  const product = {
    id: `prod_${Date.now()}`,
    storeId: store.id,
    storeUsername: store.username,
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
