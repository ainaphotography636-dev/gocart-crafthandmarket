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
 * Legacy / local-only allocator. Prefer DB trigger `generate_unique_artisan_code`
 * on public.artisans for production numbering.
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
 * Legacy / local-only SKU mint. Prefer DB trigger `generate_unique_product_sku`
 * on public.products for production numbering.
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
 * Strip a leading [ART###-###] / [sku] prefix from a product title/name.
 */
export function stripSkuTitlePrefix(name, sku) {
  let value = String(name || "").trim()
  value = value.replace(/^\[ART[0-9]+-[0-9]+\]\s*/i, "")
  if (sku) {
    const escaped = String(sku).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    value = value.replace(new RegExp(`^\\[${escaped}\\]\\s*`, "i"), "")
  }
  return value.trim()
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
 * Title/name is stored without the SKU prefix; this only formats for display.
 */
export function formatProductTitle(product) {
  if (!product) return "[UNKNOWN] Untitled product"
  const sku = ensureProductSku(product)
  const raw = product.name || product.title || "Untitled product"
  const name = stripSkuTitlePrefix(raw, sku) || "Untitled product"
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
