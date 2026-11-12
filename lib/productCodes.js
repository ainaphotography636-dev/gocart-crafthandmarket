/**
 * Artisan / product code helpers for Crafthand Market.
 * SKU format: {ArtisanCode}-{Sequence} e.g. ART001-001
 */

export function normalizeArtisanCode(code) {
  const cleaned = String(code || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
  return cleaned || "ART000"
}

export function formatSku(artisanCode, sequence) {
  const prefix = normalizeArtisanCode(artisanCode)
  const seq = Math.max(1, Number(sequence) || 1)
  return `${prefix}-${String(seq).padStart(3, "0")}`
}

export function parseSkuSequence(sku) {
  const match = String(sku || "").match(/-(\d+)$/)
  return match ? Number(match[1]) : null
}

/**
 * Allocate the next unique artisan code like ART001, ART002…
 * `existingCodes` should be the current set of artisanCode values.
 */
export function allocateArtisanCode(existingCodes = []) {
  const used = new Set(
    (existingCodes || []).map((code) => normalizeArtisanCode(code))
  )
  let n = 1
  while (n < 10000) {
    const candidate = `ART${String(n).padStart(3, "0")}`
    if (!used.has(candidate)) return candidate
    n += 1
  }
  return `ART${Date.now().toString().slice(-4)}`
}

/**
 * Build the next SKU for a store/artisan and return the bumped sequence.
 */
export function mintProductSku({ artisanCode, nextSkuSeq = 1 }) {
  const sequence = Math.max(1, Number(nextSkuSeq) || 1)
  return {
    sku: formatSku(artisanCode, sequence),
    skuSequence: sequence,
    nextSkuSeq: sequence + 1,
  }
}

/**
 * Fallback SKU when legacy/demo products omit one.
 */
export function ensureProductSku(product) {
  if (product?.sku) return String(product.sku)
  const artisanCode =
    product?.artisanCode ||
    product?.store?.artisanCode ||
    product?.storeUsername ||
    "ART000"
  const fromId = String(product?.id || "")
    .replace(/\D/g, "")
    .slice(-3)
  const sequence = fromId ? Number(fromId) || 1 : 1
  return formatSku(artisanCode, sequence)
}

/**
 * Global display helper: [ART001-001] Modern table lamp
 */
export function formatProductTitle(product) {
  if (!product) return "[UNKNOWN] Untitled product"
  const sku = ensureProductSku(product)
  const name = String(product.name || "Untitled product").trim()
  return `[${sku}] ${name}`
}

export function withDisplayTitle(product) {
  if (!product) return product
  const sku = ensureProductSku(product)
  return {
    ...product,
    sku,
    displayTitle: formatProductTitle({ ...product, sku }),
  }
}
