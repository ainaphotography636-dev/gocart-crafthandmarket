'use client'

import {
  AdminRole,
  ASSIGNABLE_ROLES,
  CUSTOMIZABLE_PERMISSIONS,
  getPermissionsForRole,
  normalizeAdminRole,
  resolveEffectivePermissions,
} from "@/lib/adminPermissions"
import { DEMO_STAFF_SEED } from "@/lib/staffSeed"

export const STAFF_REGISTRY_KEY = "crafthand_staff_registry"

const SEED = DEMO_STAFF_SEED.map((member) => ({
  id: `staff_${member.key}`,
  name: member.name,
  email: member.email,
  portfolio: member.portfolio,
  role: member.role,
  permissions: [...member.permissions],
  isFounder: member.isFounder,
}))

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
      ? parsed.map((member) => ({
          portfolio: "",
          ...member,
        }))
      : SEED.map((member) => ({ ...member }))
  } catch {
    return SEED.map((member) => ({ ...member }))
  }
}

function writeStaff(staff) {
  if (!canUseStorage()) return
  localStorage.setItem(STAFF_REGISTRY_KEY, JSON.stringify(staff))
}

function withEffective(member) {
  return {
    ...member,
    role: normalizeAdminRole(member.role),
    permissions: Array.isArray(member.permissions) ? member.permissions : [],
    portfolio: member.portfolio || "",
    effectivePermissions: resolveEffectivePermissions(member),
  }
}

export function listStaffMembers() {
  return readStaff().map(withEffective)
}

export function getSuperAdminCount(staff = readStaff()) {
  return staff.filter((member) => member.role === AdminRole.SUPER_ADMIN).length
}

export function addStaffMemberLocal({
  name,
  email,
  role = AdminRole.MAIN_ADMIN,
  portfolio = "",
  permissions = [],
}) {
  const staff = readStaff()
  const normalizedEmail = String(email || "").trim().toLowerCase()
  if (!String(name || "").trim()) throw new Error("Staff name is required.")
  if (!normalizedEmail) throw new Error("A valid email is required.")
  if (staff.some((member) => member.email.toLowerCase() === normalizedEmail)) {
    throw new Error("A staff member with that email already exists.")
  }

  const nextRole = normalizeAdminRole(role)
  if (nextRole === AdminRole.SUPER_ADMIN) {
    throw new Error("Only one Super Admin is allowed. The founder role is locked.")
  }
  if (!ASSIGNABLE_ROLES.includes(nextRole)) {
    throw new Error("That role cannot be assigned.")
  }

  const defaults = getPermissionsForRole(nextRole)
  const sanitized = (permissions || []).filter((item) =>
    CUSTOMIZABLE_PERMISSIONS.includes(item)
  )
  const sameAsDefaults =
    sanitized.length === defaults.length &&
    defaults.every((permission) => sanitized.includes(permission))

  const created = {
    id: `staff_${Date.now()}`,
    name: String(name).trim(),
    email: normalizedEmail,
    portfolio: String(portfolio || "").trim(),
    role: nextRole,
    permissions: sameAsDefaults || sanitized.length === 0 ? [] : sanitized,
    isFounder: false,
    createdAt: new Date().toISOString(),
  }

  writeStaff([created, ...staff])
  return withEffective(created)
}

export function removeStaffMemberLocal(id) {
  const staff = readStaff()
  const target = staff.find((member) => member.id === id)
  if (!target) throw new Error("Staff member not found.")
  if (target.role === AdminRole.SUPER_ADMIN || target.isFounder) {
    throw new Error("Super Admin is locked and cannot be removed.")
  }
  writeStaff(staff.filter((member) => member.id !== id))
  return { removedId: id }
}

export function updateStaffProfileLocal(id, { name, portfolio }) {
  const staff = readStaff()
  const index = staff.findIndex((member) => member.id === id)
  if (index < 0) throw new Error("Staff member not found.")
  if (!String(name || "").trim()) throw new Error("Staff name is required.")

  const updated = {
    ...staff[index],
    name: String(name).trim(),
    portfolio: String(portfolio || "").trim(),
    updatedAt: new Date().toISOString(),
  }
  const next = [...staff]
  next[index] = updated
  writeStaff(next)
  return withEffective(updated)
}

export function updateStaffMember(id, patch = {}) {
  const staff = readStaff()
  const index = staff.findIndex((member) => member.id === id)
  if (index < 0) throw new Error("Staff member not found.")

  const current = staff[index]
  const profileOnly =
    Object.keys(patch).every((key) => ["name", "portfolio", "image"].includes(key))

  if (
    !profileOnly &&
    (current.role === AdminRole.SUPER_ADMIN || current.isFounder)
  ) {
    throw new Error("Super Admin is locked and cannot be edited or downgraded.")
  }

  let nextRole = current.role
  if (patch.role) {
    nextRole = normalizeAdminRole(patch.role)
    if (nextRole === AdminRole.SUPER_ADMIN) {
      throw new Error("Only one Super Admin is allowed. The founder role is locked.")
    }
    if (!ASSIGNABLE_ROLES.includes(nextRole)) {
      throw new Error("That role cannot be assigned.")
    }
  }

  let nextPermissions = current.permissions || []
  if (Object.prototype.hasOwnProperty.call(patch, "permissions")) {
    nextPermissions = (patch.permissions || []).filter((item) =>
      CUSTOMIZABLE_PERMISSIONS.includes(item)
    )
  }

  if (patch.role && !Object.prototype.hasOwnProperty.call(patch, "permissions")) {
    nextPermissions = []
  }

  const updated = {
    ...current,
    ...patch,
    role: nextRole,
    permissions: nextPermissions,
    isFounder: current.isFounder,
    updatedAt: new Date().toISOString(),
  }

  const next = [...staff]
  next[index] = updated
  writeStaff(next)
  return withEffective(updated)
}

export function resetStaffPermissionsToRoleDefaults(id) {
  return updateStaffMember(id, { permissions: [] })
}

export function getDefaultPermissionsPreview(role) {
  return getPermissionsForRole(role)
}
