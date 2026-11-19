/**
 * Featured Luxury Handicrafts helpers — dual-read columns + specs fallback
 * until 20261119_featured_luxury_products.sql is applied.
 */

export type CatalogStatus = "draft" | "pending" | "approved"

export type FeaturedProductFields = {
  isFeatured: boolean
  featuredOrder: number
  badgeLeft: string
  badgeRight: string
  catalogStatus: CatalogStatus
  displayName: string
}

export function readFeaturedFields(row: Record<string, unknown> | null | undefined): FeaturedProductFields {
  const specs =
    row?.specs && typeof row.specs === "object" && !Array.isArray(row.specs)
      ? (row.specs as Record<string, unknown>)
      : {}

  const catalogStatusRaw = String(
    row?.catalog_status || specs.catalogStatus || (row?.is_published ? "approved" : "draft")
  ).toLowerCase()
  const catalogStatus: CatalogStatus =
    catalogStatusRaw === "pending" || catalogStatusRaw === "draft"
      ? catalogStatusRaw
      : "approved"

  return {
    isFeatured: Boolean(
      row?.is_featured ??
        specs.isFeatured ??
        false
    ),
    featuredOrder: Number(
      row?.featured_order ?? specs.featuredOrder ?? 0
    ) || 0,
    badgeLeft: String(row?.badge_left || specs.badge || "").trim(),
    badgeRight: String(row?.badge_right || specs.series || "").trim(),
    catalogStatus,
    displayName: String(specs.displayName || row?.title || "").trim(),
  }
}

export function mergeFeaturedIntoSpecs(
  existing: Record<string, unknown> | null | undefined,
  fields: Partial<FeaturedProductFields>
) {
  const base =
    existing && typeof existing === "object" && !Array.isArray(existing)
      ? { ...existing }
      : {}

  if (fields.isFeatured !== undefined) base.isFeatured = fields.isFeatured
  if (fields.featuredOrder !== undefined) base.featuredOrder = fields.featuredOrder
  if (fields.badgeLeft !== undefined) base.badge = fields.badgeLeft
  if (fields.badgeRight !== undefined) base.series = fields.badgeRight
  if (fields.catalogStatus !== undefined) base.catalogStatus = fields.catalogStatus
  if (fields.displayName !== undefined) base.displayName = fields.displayName
  return base
}

export function featuredColumnPayload(fields: Partial<FeaturedProductFields>) {
  const payload: Record<string, unknown> = {}
  if (fields.isFeatured !== undefined) payload.is_featured = fields.isFeatured
  if (fields.featuredOrder !== undefined) payload.featured_order = fields.featuredOrder
  if (fields.badgeLeft !== undefined) payload.badge_left = fields.badgeLeft || null
  if (fields.badgeRight !== undefined) payload.badge_right = fields.badgeRight || null
  if (fields.catalogStatus !== undefined) payload.catalog_status = fields.catalogStatus
  return payload
}
