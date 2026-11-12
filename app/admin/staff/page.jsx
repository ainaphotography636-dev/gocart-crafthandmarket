'use client'

import { useMemo, useState } from "react"
import toast from "react-hot-toast"
import {
  AdminRole,
  ROLE_LABELS,
  ROLE_PERMISSIONS,
  getPermissionsForRole,
} from "@/lib/adminPermissions"
import { getClientAdminRole, setClientAdminRole } from "@/lib/adminSession"

const STAFF_SEED = [
  { id: "staff_1", name: "Aina Menon", email: "aina@crafthand.market", role: AdminRole.SUPER_ADMIN },
  { id: "staff_2", name: "Rahul Iyer", email: "rahul@crafthand.market", role: AdminRole.OPERATIONS },
  {
    id: "staff_3",
    name: "Meera Nair",
    email: "meera@crafthand.market",
    role: AdminRole.ARTISAN_LEAD,
  },
  {
    id: "staff_4",
    name: "Sofia Alvarez",
    email: "sofia@crafthand.market",
    role: AdminRole.B2B_TRADE,
  },
]

export default function AdminStaffPage() {
  const [staff, setStaff] = useState(STAFF_SEED)
  const activeRole = useMemo(() => getClientAdminRole(), [])

  const updateRole = (id, role) => {
    setStaff((prev) => prev.map((member) => (member.id === id ? { ...member, role } : member)))
    toast.success("Role updated in demo roster (persist via Prisma User.role when DB is connected)")
  }

  const impersonate = (role) => {
    setClientAdminRole(role)
    toast.success(`Active session role set to ${ROLE_LABELS[role]}`)
    window.location.href = "/admin"
  }

  return (
    <div className="text-slate-500 mb-28 max-w-5xl">
      <p className="text-xs uppercase tracking-[0.18em] text-brand-gold">Access control</p>
      <h1 className="text-2xl mt-1">
        Staff & <span className="text-slate-800 font-medium">Role Permissions</span>
      </h1>
      <p className="text-sm mt-2 max-w-2xl">
        Four admin levels from Prisma <code className="text-slate-700">AdminRole</code>: Super
        Admin, Operations, Artisan Lead, and B2B Trade. Sidebar and middleware enforce these grants.
      </p>
      <p className="text-xs mt-3">Current session role: {ROLE_LABELS[activeRole]}</p>

      <div className="mt-8 overflow-x-auto ring ring-slate-200 rounded-xl bg-white/70">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-gray-700 uppercase tracking-wider">
            <tr>
              <th className="px-4 py-3">Staff</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3 hidden md:table-cell">Permissions</th>
              <th className="px-4 py-3">Preview</th>
            </tr>
          </thead>
          <tbody>
            {staff.map((member) => (
              <tr key={member.id} className="border-t border-slate-200">
                <td className="px-4 py-3">
                  <p className="text-slate-800">{member.name}</p>
                  <p className="text-xs text-slate-400">{member.email}</p>
                </td>
                <td className="px-4 py-3">
                  <select
                    value={member.role}
                    onChange={(e) => updateRole(member.id, e.target.value)}
                    className="border border-slate-200 rounded-md px-2 py-1.5 bg-white"
                  >
                    {Object.values(AdminRole).map((role) => (
                      <option key={role} value={role}>
                        {ROLE_LABELS[role]}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3 hidden md:table-cell text-xs">
                  {(ROLE_PERMISSIONS[member.role] || []).join(", ")}
                </td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => impersonate(member.role)}
                    className="text-xs bg-brand-emerald text-white px-3 py-1.5 rounded-md hover:bg-brand-amber transition"
                  >
                    Use role
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-8 grid sm:grid-cols-2 gap-4">
        {Object.values(AdminRole).map((role) => (
          <div key={role} className="border border-slate-200 rounded-xl p-4 bg-white/70">
            <h2 className="text-slate-800 font-medium">{ROLE_LABELS[role]}</h2>
            <ul className="mt-3 space-y-1 text-xs">
              {getPermissionsForRole(role).map((permission) => (
                <li key={permission}>{permission}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
}
