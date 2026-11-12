'use client'

import { useEffect, useMemo, useState } from "react"
import toast from "react-hot-toast"
import { LockIcon, PencilIcon, ShieldIcon } from "lucide-react"
import {
  AdminRole,
  ASSIGNABLE_ROLES,
  CUSTOMIZABLE_PERMISSIONS,
  PERMISSION_LABELS,
  ROLE_DESCRIPTIONS,
  ROLE_HIERARCHY,
  ROLE_LABELS,
  getPermissionsForRole,
  resolveEffectivePermissions,
} from "@/lib/adminPermissions"
import { setClientAdminSession } from "@/lib/adminSession"
import { listStaffMembers, updateStaffMember } from "@/lib/staffRegistry"
import { persistStaffRoleUpdate } from "@/app/admin/staff/actions"

export default function AdminStaffPage() {
  const [staff, setStaff] = useState([])
  const [editingId, setEditingId] = useState(null)
  const [draftRole, setDraftRole] = useState(AdminRole.MAIN_ADMIN)
  const [draftPermissions, setDraftPermissions] = useState([])

  const refresh = () => setStaff(listStaffMembers())

  useEffect(() => {
    refresh()
  }, [])

  const editingMember = useMemo(
    () => staff.find((member) => member.id === editingId) || null,
    [staff, editingId]
  )

  const openEditor = (member) => {
    if (member.role === AdminRole.SUPER_ADMIN || member.isFounder) {
      toast.error("Super Admin is locked and cannot be edited.")
      return
    }
    setEditingId(member.id)
    setDraftRole(member.role)
    setDraftPermissions(
      member.permissions?.length
        ? [...member.permissions]
        : getPermissionsForRole(member.role)
    )
  }

  const closeEditor = () => {
    setEditingId(null)
  }

  const togglePermission = (permission) => {
    setDraftPermissions((prev) =>
      prev.includes(permission)
        ? prev.filter((item) => item !== permission)
        : [...prev, permission]
    )
  }

  const onRoleDraftChange = (role) => {
    setDraftRole(role)
    setDraftPermissions(getPermissionsForRole(role))
  }

  const saveEditor = async () => {
    if (!editingMember) return
    try {
      const server = await persistStaffRoleUpdate({
        userId: editingMember.id,
        currentRole: editingMember.role,
        isFounder: editingMember.isFounder,
        nextRole: draftRole,
        nextPermissions: draftPermissions,
        existingSuperAdminCount: staff.filter((m) => m.role === AdminRole.SUPER_ADMIN).length,
      })
      if (!server.ok) {
        toast.error(server.error || "Could not update staff member.")
        return
      }

      const defaults = getPermissionsForRole(draftRole)
      const sameAsDefaults =
        defaults.length === draftPermissions.length &&
        defaults.every((permission) => draftPermissions.includes(permission))

      updateStaffMember(editingMember.id, {
        role: draftRole,
        // Empty array = inherit role defaults in Prisma/User.permissions
        permissions: sameAsDefaults ? [] : draftPermissions,
      })
      refresh()
      closeEditor()
      toast.success("Staff role & module permissions updated")
    } catch (error) {
      toast.error(error?.message || "Could not update staff member.")
    }
  }

  const previewAs = (member) => {
    const effective = resolveEffectivePermissions(member)
    setClientAdminSession({
      role: member.role,
      permissions: effective.includes("*") ? [] : effective,
    })
    toast.success(`Previewing as ${member.name} (${ROLE_LABELS[member.role]})`)
    window.location.href = "/admin"
  }

  return (
    <div className="text-slate-500 mb-28 max-w-6xl">
      <p className="text-xs uppercase tracking-[0.18em] text-brand-gold">Access control</p>
      <h1 className="text-2xl mt-1">
        Staff & <span className="text-slate-800 font-medium">Role Permissions</span>
      </h1>
      <p className="text-sm mt-2 max-w-3xl">
        Exactly one locked Super Admin (founder) holds full access (<code>*</code>). All other
        roles are hierarchical and support per-user module toggles stored on{" "}
        <code className="text-slate-700">User.permissions</code>.
      </p>

      <div className="mt-6 grid md:grid-cols-5 gap-3">
        {ROLE_HIERARCHY.map((role, index) => (
          <div key={role} className="border border-slate-200 rounded-xl p-3 bg-white/70">
            <p className="text-[11px] uppercase tracking-wide text-brand-gold">#{index + 1}</p>
            <h2 className="text-slate-800 text-sm font-medium mt-1">{ROLE_LABELS[role]}</h2>
            <p className="text-xs mt-2 leading-5">{ROLE_DESCRIPTIONS[role]}</p>
            {role === AdminRole.SUPER_ADMIN ? (
              <span className="inline-flex items-center gap-1 mt-3 text-[11px] text-brand-amber">
                <LockIcon size={12} /> Locked
              </span>
            ) : (
              <span className="inline-flex mt-3 text-[11px] text-brand-emerald">Customizable</span>
            )}
          </div>
        ))}
      </div>

      <div className="mt-8 overflow-x-auto ring ring-slate-200 rounded-xl bg-white/70">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-gray-700 uppercase tracking-wider">
            <tr>
              <th className="px-4 py-3">Staff</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3 hidden lg:table-cell">Effective permissions</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {staff.map((member) => {
              const locked = member.role === AdminRole.SUPER_ADMIN || member.isFounder
              return (
                <tr key={member.id} className="border-t border-slate-200 align-top">
                  <td className="px-4 py-3">
                    <p className="text-slate-800 font-medium">{member.name}</p>
                    <p className="text-xs text-slate-400">{member.email}</p>
                    {locked ? (
                      <span className="inline-flex items-center gap-1 mt-2 text-[11px] text-brand-amber">
                        <ShieldIcon size={12} /> Founder Super Admin
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-slate-700">{ROLE_LABELS[member.role]}</p>
                    <p className="text-xs mt-1 text-slate-400">
                      {member.permissions?.length
                        ? "Custom grants"
                        : locked
                          ? "Full access *"
                          : "Role defaults"}
                    </p>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <div className="flex flex-wrap gap-1.5 max-w-md">
                      {(member.effectivePermissions || []).map((permission) => (
                        <span
                          key={permission}
                          className="text-[11px] px-2 py-1 rounded-full bg-slate-100 text-slate-600"
                        >
                          {permission === "*"
                            ? "*"
                            : PERMISSION_LABELS[permission] || permission}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={locked}
                        onClick={() => openEditor(member)}
                        className="inline-flex items-center gap-1 text-xs border border-slate-200 px-3 py-1.5 rounded-md disabled:opacity-40 hover:bg-slate-50"
                      >
                        {locked ? <LockIcon size={12} /> : <PencilIcon size={12} />}
                        {locked ? "Locked" : "Edit permissions"}
                      </button>
                      <button
                        type="button"
                        onClick={() => previewAs(member)}
                        className="text-xs bg-brand-emerald text-white px-3 py-1.5 rounded-md hover:bg-brand-amber transition"
                      >
                        Preview as
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {editingMember ? (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-end sm:items-center justify-center p-4">
          <div className="w-full max-w-xl bg-brand-cream border border-brand-gold/20 rounded-2xl shadow-xl p-5 sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-brand-gold">Edit access</p>
                <h2 className="text-lg text-slate-800 font-medium mt-1">{editingMember.name}</h2>
                <p className="text-xs text-slate-500 mt-1">{editingMember.email}</p>
              </div>
              <button type="button" onClick={closeEditor} className="text-sm text-slate-500">
                Close
              </button>
            </div>

            <label className="flex flex-col gap-2 mt-5 text-sm">
              Role
              <select
                value={draftRole}
                onChange={(e) => onRoleDraftChange(e.target.value)}
                className="border border-slate-200 rounded-md px-3 py-2 bg-white"
              >
                {ASSIGNABLE_ROLES.map((role) => (
                  <option key={role} value={role}>
                    {ROLE_LABELS[role]}
                  </option>
                ))}
              </select>
              <span className="text-xs text-slate-400">
                Super Admin is excluded — only the founder may hold that role.
              </span>
            </label>

            <div className="mt-5">
              <p className="text-sm text-slate-700 font-medium">Module permissions</p>
              <p className="text-xs mt-1 mb-3">
                Toggle modules for this user. Emptying all boxes is not allowed — keep at least
                overview or pick a role default set.
              </p>
              <div className="grid sm:grid-cols-2 gap-2">
                {CUSTOMIZABLE_PERMISSIONS.map((permission) => {
                  const checked = draftPermissions.includes(permission)
                  return (
                    <label
                      key={permission}
                      className={`flex items-start gap-2 border rounded-lg px-3 py-2 text-sm cursor-pointer ${
                        checked
                          ? "border-brand-emerald/40 bg-brand-emerald-soft/50"
                          : "border-slate-200 bg-white"
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="mt-1"
                        checked={checked}
                        onChange={() => togglePermission(permission)}
                      />
                      <span>
                        <span className="block text-slate-800">
                          {PERMISSION_LABELS[permission]}
                        </span>
                        <span className="block text-[11px] text-slate-400">{permission}</span>
                      </span>
                    </label>
                  )
                })}
              </div>
            </div>

            <div className="flex flex-wrap justify-end gap-2 mt-6">
              <button
                type="button"
                onClick={() => setDraftPermissions(getPermissionsForRole(draftRole))}
                className="text-sm px-3 py-2 border border-slate-200 rounded-md"
              >
                Reset to role defaults
              </button>
              <button
                type="button"
                onClick={saveEditor}
                disabled={!draftPermissions.length}
                className="text-sm px-4 py-2 bg-brand-emerald text-white rounded-md disabled:opacity-40 hover:bg-brand-amber transition"
              >
                Save permissions
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
