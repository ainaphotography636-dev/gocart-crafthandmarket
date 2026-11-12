'use client'

import {
  AdminRole,
  ASSIGNABLE_ROLES,
  CUSTOMIZABLE_PERMISSIONS,
  getPermissionsForRole,
  normalizeAdminRole,
  resolveEffectivePermissions,
} from "@/lib/adminPermissions"

export const STAFF_REGISTRY_KEY = "crafthand_staff_registry"

const SEED = [
  {
    id: "staff_founder",
    name: "Aina Menon",
    email: "aina@crafthand.market",
    role: AdminRole.SUPER_ADMIN,
    permissions: ["*"],
    isFounder: true,
  },
  {
    id: "staff_main",
    name: "Jordan Blake",
    email: "jordan@crafthand.market",
    role: AdminRole.MAIN_ADMIN,
    permissions: [],
    isFounder: false,
  },
  {
    id: "staff_ops",
    name: "Rahul Iyer",
    email: "rahul@crafthand.market",
    role: AdminRole.OPERATIONS,
    permissions: [],
    isFounder: false,
  },
  {
    id: "staff_artisan",
    name: "Meera Nair",
    email: "meera@crafthand.market",
    role: AdminRole.ARTISAN_LEAD,
    permissions: [],
    isFounder: false,
  },
  {
    id: "staff_b2b",
    name: "Sofia Alvarez",
    email: "sofia@crafthand.market",
    role: AdminRole.B2B_TRADE,
    permissions: [],
    isFounder: false,
  },
]

function canUseStorage() {
  return typeof window !== "undefined" && typeof localStorage !== "undefined"
}

function readStaff() {
  if (!canUseStorage()) return SEED.map((member) => ({ ...member }))
  try {
    const raw = localStorage.getItem(STAFF_REGISTRY_KEY)
    if (!raw) {
      writeStaff(SEED)
      return SEED.map((member) => ({ ...member }))
    }
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) && parsed.length
      ? parsed
      : SEED.map((member) => ({ ...member }))
  } catch {
    return SEED.map((member) => ({ ...member }))
  }
}

function writeStaff(staff) {
  if (!canUseStorage()) return
  localStorage.setItem(STAFF_REGISTRY_KEY, JSON.stringify(staff))
}

export function listStaffMembers() {
  return readStaff().map((member) => ({
    ...member,
    role: normalizeAdminRole(member.role),
    permissions: Array.isArray(member.permissions) ? member.permissions : [],
    effectivePermissions: resolveEffectivePermissions(member),
  }))
}

export function getSuperAdminCount(staff = readStaff()) {
  return staff.filter((member) => member.role === AdminRole.SUPER_ADMIN).length
}

export function updateStaffMember(id, patch = {}) {
  const staff = readStaff()
  const index = staff.findIndex((member) => member.id === id)
  if (index < 0) throw new Error("Staff member not found.")

  const current = staff[index]
  if (current.role === AdminRole.SUPER_ADMIN || current.isFounder) {
    throw new Error("Super Admin is locked and cannot be edited or downgraded.")
  }

  const nextRole = patch.role ? normalizeAdminRole(patch.role) : current.role
  if (nextRole === AdminRole.SUPER_ADMIN) {
    throw new Error("Only one Super Admin is allowed. The founder role is locked.")
  }
  if (!ASSIGNABLE_ROLES.includes(nextRole)) {
    throw new Error("That role cannot be assigned.")
  }

  let nextPermissions = current.permissions || []
  if (Object.prototype.hasOwnProperty.call(patch, "permissions")) {
    nextPermissions = (patch.permissions || []).filter((item) =>
      CUSTOMIZABLE_PERMISSIONS.includes(item)
    )
  }

  // Switching role with empty custom list resets to role defaults (empty = inherit).
  if (patch.role && !Object.prototype.hasOwnProperty.call(patch, "permissions")) {
    nextPermissions = []
  }

  const updated = {
    ...current,
    ...patch,
    role: nextRole,
    permissions: nextPermissions,
    isFounder: false,
    updatedAt: new Date().toISOString(),
  }

  const next = [...staff]
  next[index] = updated
  writeStaff(next)
  return {
    ...updated,
    effectivePermissions: resolveEffectivePermissions(updated),
  }
}

export function resetStaffPermissionsToRoleDefaults(id) {
  return updateStaffMember(id, { permissions: [] })
}

export function getDefaultPermissionsPreview(role) {
  return getPermissionsForRole(role)
}
