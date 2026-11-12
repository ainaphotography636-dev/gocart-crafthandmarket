/**
 * Crafthand Market admin RBAC.
 * Roles mirror prisma `AdminRole` enum.
 */

export const AdminRole = Object.freeze({
  SUPER_ADMIN: "SUPER_ADMIN",
  MAIN_ADMIN: "MAIN_ADMIN",
  OPERATIONS: "OPERATIONS",
  ARTISAN_LEAD: "ARTISAN_LEAD",
  B2B_TRADE: "B2B_TRADE",
})

/** Display / dropdown order (highest authority first). */
export const ROLE_HIERARCHY = Object.freeze([
  AdminRole.SUPER_ADMIN,
  AdminRole.MAIN_ADMIN,
  AdminRole.OPERATIONS,
  AdminRole.ARTISAN_LEAD,
  AdminRole.B2B_TRADE,
])

/** Roles that can be assigned in the staff UI (Super Admin is locked / singular). */
export const ASSIGNABLE_ROLES = Object.freeze(
  ROLE_HIERARCHY.filter((role) => role !== AdminRole.SUPER_ADMIN)
)

export const ADMIN_ROLE_COOKIE = "crafthand_admin_role"
export const ADMIN_ROLE_STORAGE_KEY = "crafthand_admin_role"
export const ADMIN_PERMISSIONS_COOKIE = "crafthand_admin_permissions"
export const ADMIN_PERMISSIONS_STORAGE_KEY = "crafthand_admin_permissions"

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

/** Modules that can be toggled per non-super-admin user. */
export const CUSTOMIZABLE_PERMISSIONS = Object.freeze([
  Permission.OVERVIEW,
  Permission.CATALOG,
  Permission.STORES,
  Permission.APPROVE,
  Permission.LOGISTICS,
  Permission.B2B,
  Permission.COUPONS,
  Permission.STAFF,
])

export const PERMISSION_LABELS = Object.freeze({
  [Permission.OVERVIEW]: "Overview / Analytics",
  [Permission.CATALOG]: "Product Catalog & Inventory",
  [Permission.STORES]: "Artisan & Store Management",
  [Permission.APPROVE]: "Approve Store / Product QC",
  [Permission.LOGISTICS]: "Orders & Global Logistics",
  [Permission.B2B]: "B2B Trade & Corporate Gifting",
  [Permission.COUPONS]: "Coupons",
  [Permission.STAFF]: "Staff & Role Permissions",
})

/**
 * Default role → permission matrix.
 * SUPER_ADMIN is locked at full access (`*`) and is never customized.
 */
export const ROLE_PERMISSIONS = Object.freeze({
  [AdminRole.SUPER_ADMIN]: ["*"],
  [AdminRole.MAIN_ADMIN]: [
    Permission.OVERVIEW,
    Permission.CATALOG,
    Permission.STORES,
    Permission.APPROVE,
    Permission.LOGISTICS,
    Permission.B2B,
    Permission.COUPONS,
    Permission.STAFF,
  ],
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
    description: "Manage staff roles and module grants",
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

export const MEMBER_ROLE = "MEMBER"

export function normalizeAdminRole(role) {
  if (role === MEMBER_ROLE) return MEMBER_ROLE
  if (isValidAdminRole(role)) return role
  // Legacy cookie value from earlier builds
  if (role === "OPERATIONS" || role === AdminRole.OPERATIONS) return AdminRole.OPERATIONS
  return AdminRole.SUPER_ADMIN
}

export function getPermissionsForRole(role) {
  if (role === MEMBER_ROLE) return []
  const normalized = normalizeAdminRole(role)
  if (normalized === MEMBER_ROLE) return []
  return [...(ROLE_PERMISSIONS[normalized] || [])]
}

/**
 * Resolve effective grants for a staff member.
 * Super Admin is always `["*"]`. Custom `permissions` replace role defaults when non-empty.
 */
export function resolveEffectivePermissions({ role, permissions } = {}) {
  if (role === MEMBER_ROLE) return []
  const normalized = normalizeAdminRole(role)
  if (normalized === MEMBER_ROLE) return []
  if (normalized === AdminRole.SUPER_ADMIN) return ["*"]

  const custom = Array.isArray(permissions)
    ? permissions.filter((item) => CUSTOMIZABLE_PERMISSIONS.includes(item))
    : []

  if (custom.length) return [...new Set(custom)]
  return getPermissionsForRole(normalized)
}

export function hasPermission(roleOrGrants, permission, permissions) {
  const grants = Array.isArray(roleOrGrants)
    ? roleOrGrants
    : resolveEffectivePermissions({ role: roleOrGrants, permissions })
  if (grants.includes("*")) return true
  return grants.includes(permission)
}

export function canAccessPath(role, pathname, permissions) {
  const path = String(pathname || "")
  const match = ADMIN_NAV_ITEMS.find((item) => {
    if (item.href === "/admin") return path === "/admin"
    return path === item.href || path.startsWith(`${item.href}/`)
  })
  if (!match) {
    return normalizeAdminRole(role) === AdminRole.SUPER_ADMIN
  }
  return hasPermission(role, match.permission, permissions)
}

export function getNavItemsForRole(role, permissions) {
  return ADMIN_NAV_ITEMS.filter((item) => hasPermission(role, item.permission, permissions))
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
  [AdminRole.MAIN_ADMIN]: "Main Admin / Senior Ops",
  [AdminRole.OPERATIONS]: "Operations & Logistics",
  [AdminRole.ARTISAN_LEAD]: "Artisan Lead & QC",
  [AdminRole.B2B_TRADE]: "B2B Trade & Support",
}

export const ROLE_DESCRIPTIONS = {
  [AdminRole.SUPER_ADMIN]: "Locked founder account with full access (*). Exactly one allowed.",
  [AdminRole.MAIN_ADMIN]: "Senior operations lead with customizable module access.",
  [AdminRole.OPERATIONS]: "Day-to-day ops and logistics with customizable modules.",
  [AdminRole.ARTISAN_LEAD]: "Workshop and product QC lead with customizable modules.",
  [AdminRole.B2B_TRADE]: "Wholesale / corporate gifting support with customizable modules.",
}

export function encodePermissionsCookie(permissions = []) {
  return (permissions || []).join(",")
}

export function decodePermissionsCookie(value = "") {
  if (!value) return []
  return String(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
}
