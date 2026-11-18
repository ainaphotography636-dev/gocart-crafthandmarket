'use client'

import { useCallback, useEffect, useMemo, useState } from "react"
import toast from "react-hot-toast"
import {
  LockIcon,
  PencilIcon,
  PlusIcon,
  ShieldIcon,
  Trash2Icon,
  UserRoundPenIcon,
} from "lucide-react"
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
import {
  addStaffMemberLocal,
  listStaffMembers,
  removeStaffMemberLocal,
  updateStaffMember,
  updateStaffProfileLocal,
} from "@/lib/staffRegistry"
import {
  addStaffMember,
  listStaffUsers,
  removeStaffMember,
  updateStaffProfile,
  updateStaffRoleAndPermissions,
} from "@/app/actions/staff"

const emptyAddForm = () => ({
  name: "",
  email: "",
  role: AdminRole.MAIN_ADMIN,
  portfolio: "",
})

export default function AdminStaffPage() {
  const [staff, setStaff] = useState([])
  const [source, setSource] = useState("local")
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState("")
  const [editingId, setEditingId] = useState(null)
  const [profileId, setProfileId] = useState(null)
  const [showAdd, setShowAdd] = useState(false)
  const [addForm, setAddForm] = useState(emptyAddForm())
  const [profileDraft, setProfileDraft] = useState({ name: "", portfolio: "" })
  const [draftRole, setDraftRole] = useState(AdminRole.MAIN_ADMIN)
  const [draftPermissions, setDraftPermissions] = useState([])

  const refresh = useCallback(async () => {
    setLoading(true)
    const remote = await listStaffUsers()
    if (remote.ok && remote.staff.length) {
      setStaff(remote.staff)
      setSource(remote.source)
    } else {
      setStaff(listStaffMembers())
      setSource("local")
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const editingMember = useMemo(
    () => staff.find((member) => member.id === editingId) || null,
    [staff, editingId]
  )

  const profileMember = useMemo(
    () => staff.find((member) => member.id === profileId) || null,
    [staff, profileId]
  )

  const applyLocalUpdate = (userId, newRole, newPermissions) => {
    updateStaffMember(userId, {
      role: newRole,
      permissions: newPermissions,
    })
    setStaff(listStaffMembers())
  }

  const persistChange = async (
    userId,
    newRole,
    newPermissions,
    { closeModal = false } = {}
  ) => {
    setSavingId(userId)
    try {
      const result = await updateStaffRoleAndPermissions({
        userId,
        newRole,
        newPermissions,
      })

      if (result.ok && result.staff) {
        setStaff((prev) =>
          prev.map((member) => (member.id === userId ? result.staff : member))
        )
        setSource(result.staff.source || "supabase")
        if (closeModal) setEditingId(null)
        toast.success("Staff access saved")
        return result.staff
      }

      const fallbackLocal =
        result.code === "DB_UNAVAILABLE" ||
        result.code === "SUPABASE_UNAVAILABLE" ||
        /invalid input syntax for type uuid|staff_(founder|main|ops|artisan|b2b)|Local demo/i.test(
          result.error || ""
        )

      if (fallbackLocal) {
        const defaults = getPermissionsForRole(newRole)
        const sameAsDefaults =
          defaults.length === newPermissions.length &&
          defaults.every((permission) => newPermissions.includes(permission))
        applyLocalUpdate(
          userId,
          newRole,
          sameAsDefaults ? [] : newPermissions
        )
        setSource("local")
        if (closeModal) setEditingId(null)
        toast.success(
          /staff_|Local demo|uuid/i.test(result.error || "")
            ? "Saved locally — demo staff ids are not Supabase UUIDs. Use Add staff to invite real accounts."
            : "Saved locally (run staff migration + Add staff for Supabase sync)"
        )
        return null
      }

      toast.error(result.error || "Could not update staff member.")
      return null
    } catch (error) {
      try {
        const defaults = getPermissionsForRole(newRole)
        const sameAsDefaults =
          defaults.length === newPermissions.length &&
          defaults.every((permission) => newPermissions.includes(permission))
        applyLocalUpdate(
          userId,
          newRole,
          sameAsDefaults ? [] : newPermissions
        )
        setSource("local")
        if (closeModal) setEditingId(null)
        toast.success("Saved locally")
        return null
      } catch (localError) {
        toast.error(
          localError?.message || error?.message || "Could not update staff member."
        )
        return null
      }
    } finally {
      setSavingId("")
    }
  }

  const onInlineRoleChange = async (member, newRole) => {
    if (member.role === AdminRole.SUPER_ADMIN || member.isFounder) {
      toast.error("Super Admin is locked.")
      return
    }
    await persistChange(member.id, newRole, getPermissionsForRole(newRole))
  }

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

  const openProfileEditor = (member) => {
    setProfileId(member.id)
    setProfileDraft({
      name: member.name || "",
      portfolio: member.portfolio || "",
    })
  }

  const saveProfile = async () => {
    if (!profileMember) return
    setSavingId(profileMember.id)
    try {
      const result = await updateStaffProfile({
        userId: profileMember.id,
        name: profileDraft.name,
        portfolio: profileDraft.portfolio,
      })

      if (result.ok && result.staff) {
        setStaff((prev) =>
          prev.map((member) =>
            member.id === profileMember.id ? result.staff : member
          )
        )
        setSource(result.source)
        setProfileId(null)
        toast.success("Staff profile updated")
        return
      }

      if (
        result.code === "DB_UNAVAILABLE" ||
        result.code === "SUPABASE_UNAVAILABLE" ||
        /portfolio|schema cache|admin_role|migration/i.test(result.error || "")
      ) {
        const updated = updateStaffProfileLocal(profileMember.id, profileDraft)
        setStaff(listStaffMembers())
        setSource("local")
        setProfileId(null)
        toast.success(
          /portfolio|schema cache|admin_role/i.test(result.error || "")
            ? "Saved locally — run 20261118_staff_admin_profiles.sql in Supabase to persist portfolio"
            : "Profile saved locally"
        )
        return updated
      }

      toast.error(result.error || "Could not update profile.")
    } catch (error) {
      try {
        updateStaffProfileLocal(profileMember.id, profileDraft)
        setStaff(listStaffMembers())
        setSource("local")
        setProfileId(null)
        toast.success("Profile saved locally")
      } catch (localError) {
        toast.error(localError?.message || error?.message || "Could not update profile.")
      }
    } finally {
      setSavingId("")
    }
  }

  const onAddStaff = async (event) => {
    event.preventDefault()
    setSavingId("new")
    try {
      const result = await addStaffMember(addForm)
      if (result.ok && result.staff) {
        setStaff((prev) => [result.staff, ...prev.filter((m) => m.id !== result.staff.id)])
        setSource(result.source)
        setShowAdd(false)
        setAddForm(emptyAddForm())
        toast.success(
          result.source === "supabase"
            ? "Staff invited via Supabase Auth"
            : "Staff member added"
        )
        return
      }

      if (
        result.code === "SUPABASE_UNAVAILABLE" ||
        result.code === "DB_UNAVAILABLE"
      ) {
        const created = addStaffMemberLocal(addForm)
        setStaff(listStaffMembers())
        setSource("local")
        setShowAdd(false)
        setAddForm(emptyAddForm())
        toast.success("Staff added locally (connect Supabase to invite by email)")
        return created
      }

      toast.error(result.error || "Could not add staff.")
    } catch (error) {
      try {
        addStaffMemberLocal(addForm)
        setStaff(listStaffMembers())
        setSource("local")
        setShowAdd(false)
        setAddForm(emptyAddForm())
        toast.success("Staff added locally")
      } catch (localError) {
        toast.error(localError?.message || error?.message || "Could not add staff.")
      }
    } finally {
      setSavingId("")
    }
  }

  const onRemoveStaff = async (member) => {
    if (member.role === AdminRole.SUPER_ADMIN || member.isFounder) {
      toast.error("Super Admin is locked and cannot be removed.")
      return
    }
    const confirmed = window.confirm(
      `Remove staff access for ${member.name} (${member.email})?`
    )
    if (!confirmed) return

    setSavingId(member.id)
    try {
      const result = await removeStaffMember(member.id)
      if (result.ok) {
        setStaff((prev) => prev.filter((item) => item.id !== member.id))
        toast.success("Staff access removed")
        return
      }

      if (result.code === "DB_UNAVAILABLE" || result.code === "SUPABASE_UNAVAILABLE") {
        removeStaffMemberLocal(member.id)
        setStaff(listStaffMembers())
        setSource("local")
        toast.success("Staff removed locally")
        return
      }

      toast.error(result.error || "Could not remove staff.")
    } catch (error) {
      try {
        removeStaffMemberLocal(member.id)
        setStaff(listStaffMembers())
        setSource("local")
        toast.success("Staff removed locally")
      } catch (localError) {
        toast.error(localError?.message || error?.message || "Could not remove staff.")
      }
    } finally {
      setSavingId("")
    }
  }

  const closeEditor = () => setEditingId(null)

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
    await persistChange(editingMember.id, draftRole, draftPermissions, {
      closeModal: true,
    })
  }

  const previewAs = (member) => {
    const effective = resolveEffectivePermissions(member)
    setClientAdminSession({
      role: member.role,
      permissions: effective.includes("*") ? [] : effective,
    })
    toast.success(
      `Sidebar preview: ${member.name} (${ROLE_LABELS[member.role] || member.role})`
    )
    window.location.href = "/admin"
  }

  const sourceLabel =
    source === "supabase"
      ? "Supabase profiles"
      : source === "prisma"
        ? "Prisma database"
        : "Local demo registry"

  return (
    <div className="mb-28 max-w-6xl text-slate-500">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-brand-gold">
            Access control
          </p>
          <h1 className="mt-1 text-2xl">
            Staff &{" "}
            <span className="font-medium text-slate-800">Role Permissions</span>
          </h1>
          <p className="mt-2 max-w-3xl text-sm">
            Super Admin can add or remove staff, edit names & portfolios, and manage
            module permissions. Role changes call{" "}
            <code className="text-slate-700">updateStaffRoleAndPermissions</code> and
            sync to Supabase when the service role is configured.
          </p>
          <p className="mt-2 text-xs">
            Data source: {sourceLabel}
            {loading ? " · loading…" : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowAdd(true)}
          className="inline-flex items-center gap-1.5 rounded-md bg-brand-emerald px-4 py-2.5 text-sm text-white transition hover:bg-brand-amber"
        >
          <PlusIcon size={16} />
          Add staff
        </button>
      </div>

      {source === "local" ? (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p className="font-medium">Using local demo staff</p>
          <p className="mt-1 text-xs leading-relaxed text-amber-800/90">
            Role/permission edits save in your browser for demo ids like{" "}
            <code>staff_main</code>. To sync with Supabase: run{" "}
            <code>20261118_staff_admin_profiles.sql</code>, set{" "}
            <code>SUPABASE_SERVICE_ROLE_KEY</code>, promote your founder, then use{" "}
            <strong>Add staff</strong> to invite real accounts (UUID profiles).
          </p>
        </div>
      ) : null}

      <div className="mt-6 grid gap-3 md:grid-cols-5">
        {ROLE_HIERARCHY.map((role, index) => (
          <div
            key={role}
            className="rounded-xl border border-slate-200 bg-white/70 p-3"
          >
            <p className="text-[11px] uppercase tracking-wide text-brand-gold">
              #{index + 1}
            </p>
            <h2 className="mt-1 text-sm font-medium text-slate-800">
              {ROLE_LABELS[role]}
            </h2>
            <p className="mt-2 text-xs leading-5">{ROLE_DESCRIPTIONS[role]}</p>
            {role === AdminRole.SUPER_ADMIN ? (
              <span className="mt-3 inline-flex items-center gap-1 text-[11px] text-brand-amber">
                <LockIcon size={12} /> Locked
              </span>
            ) : (
              <span className="mt-3 inline-flex text-[11px] text-brand-emerald">
                Customizable
              </span>
            )}
          </div>
        ))}
      </div>

      <div className="mt-8 overflow-x-auto rounded-xl bg-white/70 ring ring-slate-200">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 uppercase tracking-wider text-gray-700">
            <tr>
              <th className="px-4 py-3">Staff</th>
              <th className="px-4 py-3">Role</th>
              <th className="hidden px-4 py-3 lg:table-cell">
                Effective permissions
              </th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {staff.map((member) => {
              const locked =
                member.role === AdminRole.SUPER_ADMIN || member.isFounder
              return (
                <tr
                  key={member.id}
                  className="align-top border-t border-slate-200"
                >
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-800">{member.name}</p>
                    <p className="text-xs text-slate-400">{member.email}</p>
                    {member.portfolio ? (
                      <p className="mt-1 max-w-xs text-xs leading-5 text-slate-500">
                        {member.portfolio}
                      </p>
                    ) : (
                      <p className="mt-1 text-xs italic text-slate-300">
                        No portfolio yet
                      </p>
                    )}
                    {locked ? (
                      <span className="mt-2 inline-flex items-center gap-1 text-[11px] text-brand-amber">
                        <ShieldIcon size={12} /> Founder Super Admin
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">
                    {locked ? (
                      <p className="text-slate-700">{ROLE_LABELS[member.role]}</p>
                    ) : (
                      <select
                        value={member.role}
                        disabled={savingId === member.id}
                        onChange={(e) =>
                          onInlineRoleChange(member, e.target.value)
                        }
                        className="min-w-[190px] rounded-md border border-slate-200 bg-white px-2 py-1.5"
                      >
                        {ASSIGNABLE_ROLES.map((role) => (
                          <option key={role} value={role}>
                            {ROLE_LABELS[role]}
                          </option>
                        ))}
                      </select>
                    )}
                    <p className="mt-1 text-xs text-slate-400">
                      {member.permissions?.length
                        ? "Custom grants"
                        : locked
                          ? "Full access *"
                          : "Role defaults"}
                    </p>
                  </td>
                  <td className="hidden px-4 py-3 lg:table-cell">
                    <div className="flex max-w-md flex-wrap gap-1.5">
                      {(member.effectivePermissions || []).map((permission) => (
                        <span
                          key={permission}
                          className="rounded-full bg-slate-100 px-2 py-1 text-[11px] text-slate-600"
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
                        disabled={savingId === member.id}
                        onClick={() => openProfileEditor(member)}
                        className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-3 py-1.5 text-xs hover:bg-slate-50 disabled:opacity-40"
                      >
                        <UserRoundPenIcon size={12} />
                        Edit profile
                      </button>
                      <button
                        type="button"
                        disabled={locked || savingId === member.id}
                        onClick={() => openEditor(member)}
                        className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-3 py-1.5 text-xs hover:bg-slate-50 disabled:opacity-40"
                      >
                        {locked ? (
                          <LockIcon size={12} />
                        ) : (
                          <PencilIcon size={12} />
                        )}
                        {locked ? "Locked" : "Edit permissions"}
                      </button>
                      {!locked ? (
                        <button
                          type="button"
                          disabled={savingId === member.id}
                          onClick={() => onRemoveStaff(member)}
                          className="inline-flex items-center gap-1 rounded-md border border-red-200 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 disabled:opacity-40"
                        >
                          <Trash2Icon size={12} />
                          Remove
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => previewAs(member)}
                        className="rounded-md bg-brand-emerald px-3 py-1.5 text-xs text-white transition hover:bg-brand-amber"
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

      {showAdd ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 p-4 sm:items-center">
          <form
            onSubmit={onAddStaff}
            className="w-full max-w-lg rounded-2xl border border-brand-gold/20 bg-brand-cream p-5 shadow-xl sm:p-6"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-brand-gold">
                  Super Admin
                </p>
                <h2 className="mt-1 text-lg font-medium text-slate-800">
                  Add staff member
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Invites via Supabase Auth when the service role key is set.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAdd(false)}
                className="text-sm text-slate-500"
              >
                Close
              </button>
            </div>

            <div className="mt-5 grid gap-4">
              <label className="flex flex-col gap-1.5 text-sm">
                Name
                <input
                  required
                  value={addForm.name}
                  onChange={(e) =>
                    setAddForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                  className="rounded-md border border-slate-200 bg-white px-3 py-2"
                  placeholder="Full name"
                />
              </label>
              <label className="flex flex-col gap-1.5 text-sm">
                Email
                <input
                  required
                  type="email"
                  value={addForm.email}
                  onChange={(e) =>
                    setAddForm((prev) => ({ ...prev, email: e.target.value }))
                  }
                  className="rounded-md border border-slate-200 bg-white px-3 py-2"
                  placeholder="name@crafthand.market"
                />
              </label>
              <label className="flex flex-col gap-1.5 text-sm">
                Role
                <select
                  value={addForm.role}
                  onChange={(e) =>
                    setAddForm((prev) => ({ ...prev, role: e.target.value }))
                  }
                  className="rounded-md border border-slate-200 bg-white px-3 py-2"
                >
                  {ASSIGNABLE_ROLES.map((role) => (
                    <option key={role} value={role}>
                      {ROLE_LABELS[role]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1.5 text-sm">
                Portfolio
                <textarea
                  rows={3}
                  value={addForm.portfolio}
                  onChange={(e) =>
                    setAddForm((prev) => ({
                      ...prev,
                      portfolio: e.target.value,
                    }))
                  }
                  className="resize-none rounded-md border border-slate-200 bg-white px-3 py-2"
                  placeholder="Short bio / focus areas"
                />
              </label>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAdd(false)}
                className="rounded-md border border-slate-200 px-3 py-2 text-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingId === "new"}
                className="rounded-md bg-brand-emerald px-4 py-2 text-sm text-white disabled:opacity-40"
              >
                {savingId === "new" ? "Adding…" : "Add staff"}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {profileMember ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 p-4 sm:items-center">
          <div className="w-full max-w-lg rounded-2xl border border-brand-gold/20 bg-brand-cream p-5 shadow-xl sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-brand-gold">
                  Profile
                </p>
                <h2 className="mt-1 text-lg font-medium text-slate-800">
                  Edit name & portfolio
                </h2>
                <p className="mt-1 text-xs text-slate-500">{profileMember.email}</p>
              </div>
              <button
                type="button"
                onClick={() => setProfileId(null)}
                className="text-sm text-slate-500"
              >
                Close
              </button>
            </div>

            <label className="mt-5 flex flex-col gap-1.5 text-sm">
              Name
              <input
                value={profileDraft.name}
                onChange={(e) =>
                  setProfileDraft((prev) => ({ ...prev, name: e.target.value }))
                }
                className="rounded-md border border-slate-200 bg-white px-3 py-2"
              />
            </label>
            <label className="mt-4 flex flex-col gap-1.5 text-sm">
              Portfolio
              <textarea
                rows={4}
                value={profileDraft.portfolio}
                onChange={(e) =>
                  setProfileDraft((prev) => ({
                    ...prev,
                    portfolio: e.target.value,
                  }))
                }
                className="resize-none rounded-md border border-slate-200 bg-white px-3 py-2"
                placeholder="Bio, craft focus, regions covered…"
              />
            </label>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setProfileId(null)}
                className="rounded-md border border-slate-200 px-3 py-2 text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveProfile}
                disabled={!profileDraft.name.trim() || savingId === profileMember.id}
                className="rounded-md bg-brand-emerald px-4 py-2 text-sm text-white disabled:opacity-40"
              >
                Save profile
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {editingMember ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 p-4 sm:items-center">
          <div className="w-full max-w-xl rounded-2xl border border-brand-gold/20 bg-brand-cream p-5 shadow-xl sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-brand-gold">
                  Edit access
                </p>
                <h2 className="mt-1 text-lg font-medium text-slate-800">
                  {editingMember.name}
                </h2>
                <p className="mt-1 text-xs text-slate-500">{editingMember.email}</p>
              </div>
              <button
                type="button"
                onClick={closeEditor}
                className="text-sm text-slate-500"
              >
                Close
              </button>
            </div>

            <label className="mt-5 flex flex-col gap-2 text-sm">
              Role
              <select
                value={draftRole}
                onChange={(e) => onRoleDraftChange(e.target.value)}
                className="rounded-md border border-slate-200 bg-white px-3 py-2"
              >
                {ASSIGNABLE_ROLES.map((role) => (
                  <option key={role} value={role}>
                    {ROLE_LABELS[role]}
                  </option>
                ))}
              </select>
            </label>

            <div className="mt-5">
              <p className="text-sm font-medium text-slate-700">
                Module permissions
              </p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {CUSTOMIZABLE_PERMISSIONS.map((permission) => {
                  const checked = draftPermissions.includes(permission)
                  return (
                    <label
                      key={permission}
                      className={`flex cursor-pointer items-start gap-2 rounded-lg border px-3 py-2 text-sm ${
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
                        <span className="block text-[11px] text-slate-400">
                          {permission}
                        </span>
                      </span>
                    </label>
                  )
                })}
              </div>
            </div>

            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() =>
                  setDraftPermissions(getPermissionsForRole(draftRole))
                }
                className="rounded-md border border-slate-200 px-3 py-2 text-sm"
              >
                Reset to role defaults
              </button>
              <button
                type="button"
                onClick={saveEditor}
                disabled={
                  !draftPermissions.length || savingId === editingMember.id
                }
                className="rounded-md bg-brand-emerald px-4 py-2 text-sm text-white transition hover:bg-brand-amber disabled:opacity-40"
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
