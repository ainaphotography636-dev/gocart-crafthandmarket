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

/** Full schema after featured luxury + INR specs migrations */
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
  image_urls,
  video_proof_url,
  item_video_url,
  in_stock,
  is_published,
  is_featured,
  featured_order,
  badge_left,
  badge_right,
  catalog_status,
  created_at,
  updated_at,
  ${ARTISAN_EMBED}
`

/** Specs-era schema before featured columns exist */
export const PRODUCT_SELECT_SPECS = `
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
  image_urls,
  video_proof_url,
  item_video_url,
  in_stock,
  is_published,
  created_at,
  ${ARTISAN_EMBED}
`

/**
 * Compatible select when newer media alias columns are absent.
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

/** Strip optional INR/spec/media-alias columns for older schemas. */
export function toCompatProductRow<T extends Record<string, unknown>>(row: T) {
  const {
    weight: _w,
    region_origin: _ro,
    care_instructions: _ci,
    specs: _specs,
    price_inr: _pi,
    mrp_inr: _mi,
    image_urls: _iu,
    item_video_url: _iv,
    is_featured: _f,
    featured_order: _fo,
    badge_left: _bl,
    badge_right: _br,
    catalog_status: _cs,
    updated_at: _ua,
    ...compat
  } = row
  return compat
}
