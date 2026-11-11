'use client'

import { getActiveStore } from "@/lib/storeRegistry"

export const PRODUCT_CATALOG_KEY = "crafthand_product_catalog"

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

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

/**
 * Upload selected media files to Cloudflare R2 via API.
 * Falls back to inline data URLs only when R2 env vars are missing,
 * so local/demo flows still work while credentials are being added.
 */
export async function uploadProductImages(files, storeId) {
  const selected = files.filter(Boolean)
  if (!selected.length) {
    throw new Error("Add at least one product image.")
  }

  const formData = new FormData()
  formData.append("storeId", storeId || "anonymous")
  selected.forEach((file) => formData.append("files", file))

  const response = await fetch("/api/upload/product-media", {
    method: "POST",
    body: formData,
  })
  const payload = await response.json().catch(() => ({}))

  if (response.ok && payload.ok && Array.isArray(payload.urls) && payload.urls.length) {
    return { urls: payload.urls, storage: "r2" }
  }

  if (payload.skipped || response.status === 503) {
    const urls = await Promise.all(selected.map((file) => fileToDataUrl(file)))
    return {
      urls,
      storage: "local-fallback",
      reason: payload.error || "Cloudflare R2 is not configured.",
    }
  }

  throw new Error(payload.error || "Could not upload product images.")
}

export async function createStoreProduct({ name, description, mrp, price, category, images }) {
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

  const uploaded = await uploadProductImages(imageFiles, store.id)
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
    images: uploaded.urls,
    mediaStorage: uploaded.storage,
    inStock: true,
    rating: [],
    createdAt: now,
    updatedAt: now,
  }

  addProduct(product)
  return { product, uploaded }
}
