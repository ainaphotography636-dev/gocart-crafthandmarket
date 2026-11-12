'use server'

/**
 * Back-compat re-exports. Prefer `@/app/actions/staff`.
 */
export {
  listStaffUsers,
  updateStaffRole,
  updateStaffRoleAndPermissions,
} from "@/app/actions/staff"
