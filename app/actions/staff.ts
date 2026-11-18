"use server"

import { randomUUID } from "crypto"
import { revalidatePath } from "next/cache"
import prisma, { isDatabaseConfigured } from "@/lib/prisma"
import {
  AdminRole,
  ASSIGNABLE_ROLES,
  getPermissionsForRole,
  resolveEffectivePermissions,
} from "@/lib/adminPermissions"
import {
  MEMBER_ROLE,
  sanitizeStaffPermissions,
  validateStaffRoleChange,
} from "@/lib/staffValidation"
import { isSupabaseServiceConfigured } from "@/lib/supabase/config"
import { tryCreateServiceClient } from "@/utils/supabase/admin"

export type StaffMemberDTO = {
  id: string
  name: string
  email: string
  image?: string
  portfolio: string
  role: string
  permissions: string[]
  isFounder: boolean
  effectivePermissions: string[]
  source?: "supabase" | "prisma"
}

export type StaffActionResult =
  | { ok: true; staff: StaffMemberDTO; source: "supabase" | "prisma" }
  | {
      ok: false
      code:
        | "DB_UNAVAILABLE"
        | "SUPABASE_UNAVAILABLE"
        | "VALIDATION"
        | "NOT_FOUND"
        | "FORBIDDEN"
        | "UNKNOWN"
      error: string
    }

type StaffRow = {
  id: string
  name: string
  email: string
  image?: string | null
  portfolio?: string | null
  role: string
  permissions: string[]
  isFounder: boolean
}

function toStaffDTO(
  user: StaffRow,
  source?: "supabase" | "prisma"
): StaffMemberDTO {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    image: user.image || "",
    portfolio: user.portfolio || "",
    role: user.role,
    permissions: user.permissions || [],
    isFounder: Boolean(user.isFounder),
    effectivePermissions: resolveEffectivePermissions({
      role: user.role,
      permissions: user.permissions || [],
    }),
    source,
  }
}

function revalidateStaffPaths() {
  revalidatePath("/admin/staff")
  revalidatePath("/admin")
}

const STAFF_MIGRATION_HINT =
  "Run supabase/migrations/20261118_staff_admin_profiles.sql in the Supabase SQL editor, then retry."

function isMissingStaffSchemaError(message?: string | null) {
  if (!message) return false
  return /portfolio|admin_role|is_founder|permissions|schema cache|does not exist|PGRST204|column/i.test(
    message
  )
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  )
}

function mapSupabaseProfile(row: {
  id: string
  email?: string | null
  full_name?: string | null
  avatar_url?: string | null
  portfolio?: string | null
  admin_role?: string | null
  permissions?: string[] | null
  is_founder?: boolean | null
}): StaffRow {
  return {
    id: row.id,
    name: row.full_name || row.email || "Staff",
    email: row.email || "",
    image: row.avatar_url || "",
    portfolio: row.portfolio || "",
    role: row.admin_role || AdminRole.MAIN_ADMIN,
    permissions: Array.isArray(row.permissions) ? row.permissions : [],
    isFounder: Boolean(row.is_founder),
  }
}

async function countSuperAdminsPrisma() {
  return prisma.user.count({
    where: { role: AdminRole.SUPER_ADMIN },
  })
}

async function syncPrismaStaff(user: StaffRow) {
  if (!isDatabaseConfigured()) return
  try {
    await prisma.user.upsert({
      where: { id: user.id },
      create: {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image || "",
        portfolio: user.portfolio || "",
        role: user.role,
        permissions: user.permissions || [],
        isFounder: user.isFounder,
      },
      update: {
        name: user.name,
        email: user.email,
        image: user.image || "",
        portfolio: user.portfolio || "",
        role: user.role,
        permissions: user.permissions || [],
        isFounder: user.isFounder,
      },
    })
  } catch {
    // Prisma User table may not be migrated yet — Supabase remains source of truth.
  }
}

/**
 * List staff/admin users. Prefers Supabase profiles, then Prisma.
 */
export async function listStaffUsers(): Promise<{
  ok: boolean
  staff: StaffMemberDTO[]
  source: "supabase" | "prisma" | "unavailable"
  error?: string
}> {
  const supabase = tryCreateServiceClient()
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select(
          "id, email, full_name, avatar_url, portfolio, admin_role, permissions, is_founder, role"
        )
        .or("role.eq.admin,admin_role.not.is.null,is_founder.eq.true")
        .order("is_founder", { ascending: false })
        .order("full_name", { ascending: true })

      if (error) {
        // Column missing until migration runs — fall through to Prisma.
        if (!/column|does not exist|PGRST/i.test(error.message)) {
          return {
            ok: false,
            staff: [],
            source: "unavailable",
            error: error.message,
          }
        }
      } else if (data?.length) {
        return {
          ok: true,
          source: "supabase",
          staff: data.map((row) =>
            toStaffDTO(mapSupabaseProfile(row), "supabase")
          ),
        }
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

  if (!isDatabaseConfigured()) {
    return {
      ok: false,
      staff: [],
      source: "unavailable",
      error: isSupabaseServiceConfigured()
        ? "No staff profiles found. Add staff or run the staff admin migration."
        : "Supabase service role / DATABASE_URL is not configured.",
    }
  }

  try {
    const users = await prisma.user.findMany({
      where: {
        OR: [{ role: { not: MEMBER_ROLE } }, { isFounder: true }],
      },
      orderBy: [{ isFounder: "desc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        portfolio: true,
        role: true,
        permissions: true,
        isFounder: true,
      },
    })

    return {
      ok: true,
      source: "prisma",
      staff: users.map((user) => toStaffDTO(user, "prisma")),
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
 * Invite / create a staff member (Super Admin only in product intent).
 * Uses Supabase Auth invite when service role is available.
 */
export async function addStaffMember(input: {
  name: string
  email: string
  role: string
  portfolio?: string
  permissions?: string[]
}): Promise<StaffActionResult> {
  const name = String(input?.name || "").trim()
  const email = String(input?.email || "").trim().toLowerCase()
  const portfolio = String(input?.portfolio || "").trim()
  const role = String(input?.role || AdminRole.MAIN_ADMIN).trim()
  const permissions = sanitizeStaffPermissions(input?.permissions || [], role)

  if (!name) {
    return { ok: false, code: "VALIDATION", error: "Staff name is required." }
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, code: "VALIDATION", error: "A valid email is required." }
  }
  if (role === AdminRole.SUPER_ADMIN) {
    return {
      ok: false,
      code: "VALIDATION",
      error: "Cannot create another Super Admin. The founder role is locked.",
    }
  }
  if (!(ASSIGNABLE_ROLES as readonly string[]).includes(role)) {
    return { ok: false, code: "VALIDATION", error: `Invalid role: ${role}` }
  }

  const defaults = getPermissionsForRole(role)
  const sameAsDefaults =
    permissions.length === defaults.length &&
    defaults.every((permission) => permissions.includes(permission))
  const storedPermissions =
    sameAsDefaults || permissions.length === 0 ? [] : permissions

  const supabase = tryCreateServiceClient()
  if (supabase) {
    try {
      const { data: invited, error: inviteError } =
        await supabase.auth.admin.inviteUserByEmail(email, {
          data: {
            full_name: name,
            role: "admin",
            admin_role: role,
          },
        })

      let userId = invited?.user?.id

      if (inviteError) {
        // Already registered — look up by email and promote to staff.
        const { data: existingProfile } = await supabase
          .from("profiles")
          .select("id")
          .ilike("email", email)
          .maybeSingle()
        if (!existingProfile?.id) {
          return {
            ok: false,
            code: "UNKNOWN",
            error: inviteError.message || "Could not invite staff member.",
          }
        }
        userId = existingProfile.id
      }

      if (!userId) {
        return {
          ok: false,
          code: "UNKNOWN",
          error: "Could not resolve staff user id.",
        }
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .upsert(
          {
            id: userId,
            email,
            full_name: name,
            role: "admin",
            admin_role: role,
            permissions: storedPermissions,
            is_founder: false,
            portfolio,
          },
          { onConflict: "id" }
        )
        .select(
          "id, email, full_name, avatar_url, portfolio, admin_role, permissions, is_founder"
        )
        .single()

      if (profileError || !profile) {
        if (isMissingStaffSchemaError(profileError?.message)) {
          return {
            ok: false,
            code: "SUPABASE_UNAVAILABLE",
            error: `${profileError?.message}. ${STAFF_MIGRATION_HINT}`,
          }
        }
        return {
          ok: false,
          code: "UNKNOWN",
          error:
            profileError?.message ||
            `Staff invited but profile sync failed. ${STAFF_MIGRATION_HINT}`,
        }
      }

      const mapped = mapSupabaseProfile(profile)
      await syncPrismaStaff(mapped)
      revalidateStaffPaths()
      return { ok: true, source: "supabase", staff: toStaffDTO(mapped, "supabase") }
    } catch (error) {
      return {
        ok: false,
        code: "UNKNOWN",
        error:
          error instanceof Error ? error.message : "Failed to add staff member.",
      }
    }
  }

  if (!isDatabaseConfigured()) {
    return {
      ok: false,
      code: "SUPABASE_UNAVAILABLE",
      error:
        "Configure SUPABASE_SERVICE_ROLE_KEY (or DATABASE_URL) to add staff.",
    }
  }

  try {
    const id = randomUUID()
    const created = await prisma.user.create({
      data: {
        id,
        name,
        email,
        image: "",
        portfolio,
        role,
        permissions: storedPermissions,
        isFounder: false,
      },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        portfolio: true,
        role: true,
        permissions: true,
        isFounder: true,
      },
    })
    revalidateStaffPaths()
    return { ok: true, source: "prisma", staff: toStaffDTO(created, "prisma") }
  } catch (error) {
    return {
      ok: false,
      code: "UNKNOWN",
      error:
        error instanceof Error ? error.message : "Failed to add staff member.",
    }
  }
}

/**
 * Remove staff access (demote). Cannot remove the founder Super Admin.
 */
export async function removeStaffMember(userId: string): Promise<
  | { ok: true; removedId: string; source: "supabase" | "prisma" }
  | StaffActionResult
> {
  if (!userId) {
    return { ok: false, code: "VALIDATION", error: "userId is required." }
  }

  const supabase = tryCreateServiceClient()
  if (supabase) {
    try {
      const { data: profile, error } = await supabase
        .from("profiles")
        .select(
          "id, email, full_name, avatar_url, portfolio, admin_role, permissions, is_founder"
        )
        .eq("id", userId)
        .maybeSingle()

      if (error) {
        return { ok: false, code: "UNKNOWN", error: error.message }
      }
      if (!profile) {
        return { ok: false, code: "NOT_FOUND", error: "Staff user not found." }
      }
      if (profile.is_founder || profile.admin_role === AdminRole.SUPER_ADMIN) {
        return {
          ok: false,
          code: "FORBIDDEN",
          error: "Super Admin is locked and cannot be removed.",
        }
      }

      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          role: "client",
          admin_role: null,
          permissions: [],
          is_founder: false,
        })
        .eq("id", userId)

      if (updateError) {
        return { ok: false, code: "UNKNOWN", error: updateError.message }
      }

      if (isDatabaseConfigured()) {
        try {
          await prisma.user.update({
            where: { id: userId },
            data: {
              role: MEMBER_ROLE,
              permissions: [],
              isFounder: false,
            },
          })
        } catch {
          // optional mirror
        }
      }

      revalidateStaffPaths()
      return { ok: true, removedId: userId, source: "supabase" }
    } catch (error) {
      return {
        ok: false,
        code: "UNKNOWN",
        error:
          error instanceof Error
            ? error.message
            : "Failed to remove staff member.",
      }
    }
  }

  if (!isDatabaseConfigured()) {
    return {
      ok: false,
      code: "DB_UNAVAILABLE",
      error: "Database is not configured.",
    }
  }

  try {
    const target = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, isFounder: true },
    })
    if (!target) {
      return { ok: false, code: "NOT_FOUND", error: "Staff user not found." }
    }
    if (target.isFounder || target.role === AdminRole.SUPER_ADMIN) {
      return {
        ok: false,
        code: "FORBIDDEN",
        error: "Super Admin is locked and cannot be removed.",
      }
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        role: MEMBER_ROLE,
        permissions: [],
        isFounder: false,
      },
    })
    revalidateStaffPaths()
    return { ok: true, removedId: userId, source: "prisma" }
  } catch (error) {
    return {
      ok: false,
      code: "UNKNOWN",
      error:
        error instanceof Error
          ? error.message
          : "Failed to remove staff member.",
    }
  }
}

/**
 * Edit staff display name + portfolio (allowed for Super Admin / founder too).
 */
export async function updateStaffProfile(input: {
  userId: string
  name: string
  portfolio?: string
}): Promise<StaffActionResult> {
  const userId = String(input?.userId || "").trim()
  const name = String(input?.name || "").trim()
  const portfolio = String(input?.portfolio || "").trim()

  if (!userId) {
    return { ok: false, code: "VALIDATION", error: "userId is required." }
  }
  if (!name) {
    return { ok: false, code: "VALIDATION", error: "Staff name is required." }
  }

  // Local demo ids are not Supabase auth UUIDs — skip service-role update.
  const supabase = isUuid(userId) ? tryCreateServiceClient() : null
  if (supabase) {
    const { data: profile, error } = await supabase
      .from("profiles")
      .update({
        full_name: name,
        portfolio,
      })
      .eq("id", userId)
      .select(
        "id, email, full_name, avatar_url, portfolio, admin_role, permissions, is_founder"
      )
      .maybeSingle()

    if (error) {
      if (isMissingStaffSchemaError(error.message)) {
        return {
          ok: false,
          code: "SUPABASE_UNAVAILABLE",
          error: `${error.message}. ${STAFF_MIGRATION_HINT}`,
        }
      }
      return {
        ok: false,
        code: "UNKNOWN",
        error: error.message || `Could not update profile. ${STAFF_MIGRATION_HINT}`,
      }
    }
    if (!profile) {
      return { ok: false, code: "NOT_FOUND", error: "Staff user not found." }
    }

    const mapped = mapSupabaseProfile(profile)
    await syncPrismaStaff(mapped)
    revalidateStaffPaths()
    return { ok: true, source: "supabase", staff: toStaffDTO(mapped, "supabase") }
  }

  if (!isDatabaseConfigured() || !isUuid(userId)) {
    return {
      ok: false,
      code: "DB_UNAVAILABLE",
      error: isUuid(userId)
        ? "Database is not configured."
        : "Local demo staff — saved in browser registry until Supabase staff migration is applied.",
    }
  }

  try {
    const updated = await prisma.user.update({
      where: { id: userId },
      data: { name, portfolio },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        portfolio: true,
        role: true,
        permissions: true,
        isFounder: true,
      },
    })
    revalidateStaffPaths()
    return { ok: true, source: "prisma", staff: toStaffDTO(updated, "prisma") }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update staff profile."
    if (isMissingStaffSchemaError(message)) {
      return {
        ok: false,
        code: "DB_UNAVAILABLE",
        error: `${message}. Add User.portfolio via Prisma migrate, or ${STAFF_MIGRATION_HINT}`,
      }
    }
    return {
      ok: false,
      code: "UNKNOWN",
      error: message,
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

  const supabase = tryCreateServiceClient()
  if (supabase) {
    try {
      const { data: profile, error } = await supabase
        .from("profiles")
        .select(
          "id, email, full_name, avatar_url, portfolio, admin_role, permissions, is_founder"
        )
        .eq("id", userId)
        .maybeSingle()

      if (error) {
        return { ok: false, code: "UNKNOWN", error: error.message }
      }
      if (!profile) {
        return { ok: false, code: "NOT_FOUND", error: "Staff user not found." }
      }

      const targetUser = mapSupabaseProfile(profile)
      const { count } = await supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("admin_role", AdminRole.SUPER_ADMIN)

      const validated = validateStaffRoleChange({
        targetUser,
        newRole,
        newPermissions,
        superAdminCount: count || 0,
      })

      if (!validated.ok || !validated.data) {
        return {
          ok: false,
          code: "VALIDATION",
          error: validated.error || "Invalid staff update.",
        }
      }

      if (validated.data.role === AdminRole.SUPER_ADMIN) {
        return {
          ok: false,
          code: "VALIDATION",
          error:
            "Cannot assign SUPER_ADMIN. Only the founder account may hold that role.",
        }
      }

      const nextRole =
        validated.data.role === MEMBER_ROLE ? null : validated.data.role
      const { data: updated, error: updateError } = await supabase
        .from("profiles")
        .update({
          role: validated.data.role === MEMBER_ROLE ? "client" : "admin",
          admin_role: nextRole,
          permissions:
            validated.data.role === AdminRole.SUPER_ADMIN
              ? ["*"]
              : validated.data.permissions,
          is_founder: false,
        })
        .eq("id", userId)
        .select(
          "id, email, full_name, avatar_url, portfolio, admin_role, permissions, is_founder"
        )
        .single()

      if (updateError || !updated) {
        return {
          ok: false,
          code: "UNKNOWN",
          error: updateError?.message || "Could not update staff member.",
        }
      }

      const mapped = mapSupabaseProfile(updated)
      await syncPrismaStaff(
        validated.data.role === MEMBER_ROLE
          ? { ...mapped, role: MEMBER_ROLE, permissions: [] }
          : mapped
      )
      revalidateStaffPaths()
      return { ok: true, staff: toStaffDTO(mapped, "supabase") }
    } catch (error) {
      return {
        ok: false,
        code: "UNKNOWN",
        error:
          error instanceof Error
            ? error.message
            : "Failed to update staff member.",
      }
    }
  }

  if (!isDatabaseConfigured()) {
    return {
      ok: false,
      code: "DB_UNAVAILABLE",
      error:
        "DATABASE_URL is not configured. Falling back to local staff registry.",
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
        portfolio: true,
        role: true,
        permissions: true,
        isFounder: true,
      },
    })

    if (!targetUser) {
      return { ok: false, code: "NOT_FOUND", error: "Staff user not found." }
    }

    const superAdminCount = await countSuperAdminsPrisma()
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

    if (validated.data.role === AdminRole.SUPER_ADMIN) {
      return {
        ok: false,
        code: "VALIDATION",
        error:
          "Cannot assign SUPER_ADMIN. Only the founder account may hold that role.",
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
        portfolio: true,
        role: true,
        permissions: true,
        isFounder: true,
      },
    })

    revalidateStaffPaths()
    return { ok: true, staff: toStaffDTO(updated, "prisma") }
  } catch (error) {
    return {
      ok: false,
      code: "UNKNOWN",
      error:
        error instanceof Error
          ? error.message
          : "Failed to update staff member.",
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
