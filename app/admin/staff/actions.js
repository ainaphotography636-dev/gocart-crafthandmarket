'use server'

/**
 * Back-compat re-exports. Prefer `@/app/actions/staff`.
 */
export {
  addStaffMember,
  listStaffUsers,
  removeStaffMember,
  updateStaffProfile,
  updateStaffRole,
  updateStaffRoleAndPermissions,
} from "@/app/actions/staff"
