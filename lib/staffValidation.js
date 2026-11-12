import {
  AdminRole,
  ASSIGNABLE_ROLES,
  CUSTOMIZABLE_PERMISSIONS,
  getPermissionsForRole,
} from "@/lib/adminPermissions"

export const MEMBER_ROLE = "MEMBER"

export function isStaffAdminRole(role) {
  return Object.values(AdminRole).includes(role)
}

export function sanitizeStaffPermissions(permissions, role) {
  if (role === AdminRole.SUPER_ADMIN) return ["*"]
  if (!Array.isArray(permissions)) return []
  return [...new Set(permissions.filter((item) => CUSTOMIZABLE_PERMISSIONS.includes(item)))]
}

/**
 * Enforce single locked Super Admin + assignable role rules.
 * Pure helper used by server actions before writing to Prisma.
 */
export function validateStaffRoleChange({
  targetUser,
  newRole,
  newPermissions,
  superAdminCount,
}) {
  if (!targetUser?.id) {
    return { ok: false, error: "Missing staff user." }
  }

  if (targetUser.role === AdminRole.SUPER_ADMIN || targetUser.isFounder) {
    return {
      ok: false,
      error: "Super Admin is locked to the founder account and cannot be edited or downgraded.",
    }
  }

  if (newRole === AdminRole.SUPER_ADMIN) {
    return {
      ok: false,
      error: "Only one SUPER_ADMIN is allowed. The founder role cannot be assigned to another account.",
    }
  }

  if (newRole === MEMBER_ROLE) {
    return {
      ok: true,
      data: {
        role: MEMBER_ROLE,
        permissions: [],
        isFounder: false,
      },
    }
  }

  if (!ASSIGNABLE_ROLES.includes(newRole)) {
    return { ok: false, error: `Invalid role: ${newRole}` }
  }

  if (superAdminCount > 1) {
    return {
      ok: false,
      error: "Data integrity error: more than one SUPER_ADMIN exists. Resolve before editing staff.",
    }
  }

  const defaults = getPermissionsForRole(newRole)
  const sanitized = sanitizeStaffPermissions(newPermissions, newRole)
  const sameAsDefaults =
    sanitized.length === defaults.length &&
    defaults.every((permission) => sanitized.includes(permission))

  return {
    ok: true,
    data: {
      role: newRole,
      // Empty array inherits role defaults in the UI/guards.
      permissions: sameAsDefaults || sanitized.length === 0 ? [] : sanitized,
      isFounder: false,
    },
  }
}
