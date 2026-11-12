"use server"

import { revalidatePath } from "next/cache"
import prisma, { isDatabaseConfigured } from "@/lib/prisma"
import {
  AdminRole,
  getPermissionsForRole,
  resolveEffectivePermissions,
} from "@/lib/adminPermissions"
import {
  MEMBER_ROLE,
  validateStaffRoleChange,
} from "@/lib/staffValidation"

export type StaffMemberDTO = {
  id: string
  name: string
  email: string
  image?: string
  role: string
  permissions: string[]
  isFounder: boolean
  effectivePermissions: string[]
}

function toStaffDTO(user: {
  id: string
  name: string
  email: string
  image?: string | null
  role: string
  permissions: string[]
  isFounder: boolean
}): StaffMemberDTO {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    image: user.image || "",
    role: user.role,
    permissions: user.permissions || [],
    isFounder: Boolean(user.isFounder),
    effectivePermissions: resolveEffectivePermissions({
      role: user.role,
      permissions: user.permissions || [],
    }),
  }
}

async function countSuperAdmins() {
  return prisma.user.count({
    where: { role: AdminRole.SUPER_ADMIN },
  })
}

/**
 * List staff/admin users (excludes plain MEMBER accounts unless they are founder).
 */
export async function listStaffUsers(): Promise<{
  ok: boolean
  staff: StaffMemberDTO[]
  source: "prisma" | "unavailable"
  error?: string
}> {
  if (!isDatabaseConfigured()) {
    return {
      ok: false,
      staff: [],
      source: "unavailable",
      error: "DATABASE_URL is not configured.",
    }
  }

  try {
    const users = await prisma.user.findMany({
      where: {
        OR: [
          { role: { not: MEMBER_ROLE } },
          { isFounder: true },
        ],
      },
      orderBy: [{ isFounder: "desc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        permissions: true,
        isFounder: true,
      },
    })

    return {
      ok: true,
      source: "prisma",
      staff: users.map(toStaffDTO),
    }
  } catch (error) {
    return {
      ok: false,
      staff: [],
      source: "unavailable",
      error: error instanceof Error ? error.message : "Failed to load staff.",
    }
  }
}

/**
 * Update a staff member's role + module permissions.
 * Enforces the single locked SUPER_ADMIN rule.
 */
export async function updateStaffRoleAndPermissions(input: {
  userId: string
  newRole: string
  newPermissions?: string[]
}): Promise<{
  ok: boolean
  staff?: StaffMemberDTO
  error?: string
  code?: "DB_UNAVAILABLE" | "VALIDATION" | "NOT_FOUND" | "UNKNOWN"
}> {
  const { userId, newRole, newPermissions = [] } = input || {}

  if (!userId) {
    return { ok: false, code: "VALIDATION", error: "userId is required." }
  }

  if (!isDatabaseConfigured()) {
    return {
      ok: false,
      code: "DB_UNAVAILABLE",
      error: "DATABASE_URL is not configured. Falling back to local staff registry.",
    }
  }

  try {
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        permissions: true,
        isFounder: true,
      },
    })

    if (!targetUser) {
      return { ok: false, code: "NOT_FOUND", error: "Staff user not found." }
    }

    const superAdminCount = await countSuperAdmins()
    const validated = validateStaffRoleChange({
      targetUser,
      newRole,
      newPermissions,
      superAdminCount,
    })

    if (!validated.ok || !validated.data) {
      return {
        ok: false,
        code: "VALIDATION",
        error: validated.error || "Invalid staff update.",
      }
    }

    // Extra hard stop: never create a second SUPER_ADMIN via this action.
    if (validated.data.role === AdminRole.SUPER_ADMIN) {
      return {
        ok: false,
        code: "VALIDATION",
        error: "Cannot assign SUPER_ADMIN. Only the founder account may hold that role.",
      }
    }

    if (
      validated.data.role !== AdminRole.SUPER_ADMIN &&
      newRole === AdminRole.SUPER_ADMIN &&
      superAdminCount >= 1
    ) {
      return {
        ok: false,
        code: "VALIDATION",
        error: "Only one SUPER_ADMIN is allowed in the database.",
      }
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        role: validated.data.role,
        permissions:
          validated.data.role === AdminRole.SUPER_ADMIN
            ? ["*"]
            : validated.data.permissions,
        isFounder: false,
      },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        permissions: true,
        isFounder: true,
      },
    })

    revalidatePath("/admin/staff")
    revalidatePath("/admin")

    return {
      ok: true,
      staff: toStaffDTO(updated),
    }
  } catch (error) {
    return {
      ok: false,
      code: "UNKNOWN",
      error: error instanceof Error ? error.message : "Failed to update staff member.",
    }
  }
}

/**
 * Convenience helper: apply a role and its default permission set in one call.
 */
export async function updateStaffRole(userId: string, newRole: string) {
  return updateStaffRoleAndPermissions({
    userId,
    newRole,
    newPermissions: getPermissionsForRole(newRole),
  })
}
