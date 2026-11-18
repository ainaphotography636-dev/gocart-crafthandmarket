/**
 * Product select strings for storefront queries.
 * Live Supabase may lag migrations — prefer full, fall back to compatible.
 */

const ARTISAN_EMBED = `
  artisans (
    id,
    artisan_code,
    workshop_name,
    username,
    description,
    logo_url,
    region,
    address,
    gi_tags,
    verification_status,
    is_active
  )
`

/** Full schema after 20261117_product_inr_specs.sql */
export const PRODUCT_SELECT_FULL = `
  id,
  artisan_id,
  title,
  description,
  category,
  material,
  gi_tag,
  craft_technique,
  dimensions,
  weight,
  region_origin,
  care_instructions,
  specs,
  sku,
  price_inr,
  mrp_inr,
  price_usd,
  mrp_usd,
  currency_default,
  images,
  video_proof_url,
  in_stock,
  is_published,
  created_at,
  ${ARTISAN_EMBED}
`

/**
 * Columns confirmed on the current production marketplace schema
 * (craft_technique + dimensions exist; INR/specs/weight do not yet).
 */
export const PRODUCT_SELECT_COMPAT = `
  id,
  artisan_id,
  title,
  description,
  category,
  material,
  gi_tag,
  craft_technique,
  dimensions,
  sku,
  price_usd,
  mrp_usd,
  currency_default,
  images,
  video_proof_url,
  in_stock,
  is_published,
  created_at,
  ${ARTISAN_EMBED}
`

export function isMissingColumnError(error: { message?: string } | null | undefined) {
  return /column .* does not exist/i.test(String(error?.message || ""))
}

/** Strip optional INR/spec columns for DBs that have not run the migration. */
export function toCompatProductRow<T extends Record<string, unknown>>(row: T) {
  const {
    weight: _w,
    region_origin: _ro,
    care_instructions: _ci,
    specs: _specs,
    price_inr: _pi,
    mrp_inr: _mi,
    ...compat
  } = row
  return compat
}
