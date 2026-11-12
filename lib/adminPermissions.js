/**
 * Crafthand Market admin RBAC.
 * Roles mirror prisma `AdminRole` enum.
 */

export const AdminRole = Object.freeze({
  SUPER_ADMIN: "SUPER_ADMIN",
  OPERATIONS: "OPERATIONS",
  ARTISAN_LEAD: "ARTISAN_LEAD",
  B2B_TRADE: "B2B_TRADE",
})

export const ADMIN_ROLE_COOKIE = "crafthand_admin_role"
export const ADMIN_ROLE_STORAGE_KEY = "crafthand_admin_role"

/** Permission keys used by nav items and route guards. */
export const Permission = Object.freeze({
  OVERVIEW: "admin.overview",
  CATALOG: "admin.catalog",
  STORES: "admin.stores",
  APPROVE: "admin.approve",
  LOGISTICS: "admin.logistics",
  B2B: "admin.b2b",
  STAFF: "admin.staff",
  COUPONS: "admin.coupons",
})

/**
 * Role → permission matrix.
 * SUPER_ADMIN implicitly has every permission via `*`.
 */
export const ROLE_PERMISSIONS = Object.freeze({
  [AdminRole.SUPER_ADMIN]: ["*"],
  [AdminRole.OPERATIONS]: [
    Permission.OVERVIEW,
    Permission.CATALOG,
    Permission.APPROVE,
    Permission.LOGISTICS,
    Permission.COUPONS,
  ],
  [AdminRole.ARTISAN_LEAD]: [
    Permission.OVERVIEW,
    Permission.CATALOG,
    Permission.STORES,
    Permission.APPROVE,
  ],
  [AdminRole.B2B_TRADE]: [Permission.OVERVIEW, Permission.B2B],
})

export const ADMIN_NAV_ITEMS = [
  {
    name: "Overview / Analytics",
    href: "/admin",
    permission: Permission.OVERVIEW,
    description: "Marketplace KPIs and order trends",
  },
  {
    name: "Product Catalog & Inventory",
    href: "/admin/catalog",
    permission: Permission.CATALOG,
    description: "GI-Tag and material inventory filters",
  },
  {
    name: "Artisan & Store Management",
    href: "/admin/stores",
    permission: Permission.STORES,
    description: "Live workshops and activation toggles",
  },
  {
    name: "Approve Store / Product QC",
    href: "/admin/approve",
    permission: Permission.APPROVE,
    description: "Store applications and product QC",
  },
  {
    name: "Orders & Global Logistics",
    href: "/admin/logistics",
    permission: Permission.LOGISTICS,
    description: "DDP tracking and transit insurance",
  },
  {
    name: "B2B Trade & Corporate Gifting",
    href: "/admin/b2b",
    permission: Permission.B2B,
    description: "Wholesale and gifting inquiries",
  },
  {
    name: "Staff & Role Permissions",
    href: "/admin/staff",
    permission: Permission.STAFF,
    description: "Assign SUPER_ADMIN / OPERATIONS / ARTISAN_LEAD / B2B_TRADE",
  },
  {
    name: "Coupons",
    href: "/admin/coupons",
    permission: Permission.COUPONS,
    description: "Promotional codes",
  },
]

export function isValidAdminRole(role) {
  return Object.values(AdminRole).includes(role)
}

export function normalizeAdminRole(role) {
  if (isValidAdminRole(role)) return role
  return AdminRole.SUPER_ADMIN
}

export function getPermissionsForRole(role) {
  const normalized = normalizeAdminRole(role)
  return ROLE_PERMISSIONS[normalized] || []
}

export function hasPermission(role, permission) {
  const grants = getPermissionsForRole(role)
  if (grants.includes("*")) return true
  return grants.includes(permission)
}

export function canAccessPath(role, pathname) {
  const path = String(pathname || "")
  const match = ADMIN_NAV_ITEMS.find((item) => {
    if (item.href === "/admin") return path === "/admin"
    return path === item.href || path.startsWith(`${item.href}/`)
  })
  if (!match) {
    // Unknown admin sub-route: only SUPER_ADMIN by default
    return normalizeAdminRole(role) === AdminRole.SUPER_ADMIN
  }
  return hasPermission(role, match.permission)
}

export function getNavItemsForRole(role) {
  return ADMIN_NAV_ITEMS.filter((item) => hasPermission(role, item.permission))
}

export function getPermissionForPath(pathname) {
  const path = String(pathname || "")
  const match = ADMIN_NAV_ITEMS.find((item) => {
    if (item.href === "/admin") return path === "/admin"
    return path === item.href || path.startsWith(`${item.href}/`)
  })
  return match?.permission || null
}

export const ROLE_LABELS = {
  [AdminRole.SUPER_ADMIN]: "Super Admin",
  [AdminRole.OPERATIONS]: "Operations",
  [AdminRole.ARTISAN_LEAD]: "Artisan Lead",
  [AdminRole.B2B_TRADE]: "B2B Trade",
}
