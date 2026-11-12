'use server'

import {
  AdminRole,
  ASSIGNABLE_ROLES,
  CUSTOMIZABLE_PERMISSIONS,
  normalizeAdminRole,
} from "@/lib/adminPermissions"

/**
 * Server-side RBAC validation for staff updates.
 * When Prisma/DATABASE_URL is connected, swap the in-memory notes below for:
 *   prisma.user.update / prisma.user.count({ where: { role: 'SUPER_ADMIN' } })
 *
 * These actions enforce the business rules even before the DB client is wired.
 */

function assertAssignableRole(role) {
  const normalized = normalizeAdminRole(role)
  if (normalized === AdminRole.SUPER_ADMIN) {
    throw new Error("SUPER_ADMIN cannot be assigned. The founder Super Admin is locked.")
  }
  if (!ASSIGNABLE_ROLES.includes(normalized)) {
    throw new Error("Invalid staff role.")
  }
  return normalized
}

function sanitizePermissions(permissions) {
  if (!Array.isArray(permissions)) return []
  return [...new Set(permissions.filter((item) => CUSTOMIZABLE_PERMISSIONS.includes(item)))]
}

/**
 * Validate a staff role/permission change before persistence.
 * Returns a normalized payload ready for Prisma User update.
 */
export async function prepareStaffRoleUpdate({
  userId,
  currentRole,
  isFounder = false,
  nextRole,
  nextPermissions,
  existingSuperAdminCount = 1,
}) {
  if (!userId) throw new Error("Missing staff user id.")

  if (currentRole === AdminRole.SUPER_ADMIN || isFounder) {
    return {
      ok: false,
      error: "Super Admin is locked. Permissions (*) cannot be edited or downgraded.",
    }
  }

  const role = assertAssignableRole(nextRole)

  if (role === AdminRole.SUPER_ADMIN || existingSuperAdminCount > 1) {
    return {
      ok: false,
      error: "Only one SUPER_ADMIN is allowed in the system.",
    }
  }

  const permissions = sanitizePermissions(nextPermissions)

  return {
    ok: true,
    data: {
      id: userId,
      role,
      permissions,
      // Prisma-ready patch
      prismaData: {
        role,
        permissions,
        isFounder: false,
      },
    },
  }
}

/**
 * Future Prisma persistence hook.
 * Kept as a no-op-friendly server action so the UI can call one place.
 */
export async function persistStaffRoleUpdate(payload) {
  const prepared = await prepareStaffRoleUpdate(payload)
  if (!prepared.ok) return prepared

  // Prisma wiring (enable once @prisma/client + DATABASE_URL are available):
  // const prisma = (await import('@/lib/prisma')).default
  // const superAdmins = await prisma.user.count({ where: { role: 'SUPER_ADMIN' } })
  // if (superAdmins >= 1 && prepared.data.role === 'SUPER_ADMIN') throw ...
  // await prisma.user.update({ where: { id: prepared.data.id }, data: prepared.data.prismaData })

  return {
    ok: true,
    persisted: false,
    message:
      "Validated. Local staff registry stores the change until Prisma User.permissions is connected.",
    data: prepared.data,
  }
}
