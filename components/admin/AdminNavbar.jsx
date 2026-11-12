'use client'
import BrandLogo from "@/components/shared/BrandLogo"
import CurrencySwitcher from "@/components/shared/CurrencySwitcher"
import { ROLE_HIERARCHY, ROLE_LABELS } from "@/lib/adminPermissions"

const AdminNavbar = ({ role, onRoleChange }) => {
  return (
    <div className="flex items-center justify-between px-6 sm:px-12 py-3 border-b border-brand-gold/20 bg-brand-cream/80 transition-all">
      <BrandLogo badge="admin" />
      <div className="flex items-center gap-3 text-slate-600">
        <CurrencySwitcher className="max-sm:hidden" />
        <label className="flex items-center gap-2 text-sm">
          <span className="max-sm:hidden">Preview role</span>
          <select
            value={role}
            onChange={(e) => onRoleChange?.(e.target.value)}
            className="border border-slate-200 rounded-md bg-white px-2 py-1.5 text-sm outline-none max-w-[220px]"
            aria-label="Admin role preview"
          >
            {ROLE_HIERARCHY.map((value) => (
              <option key={value} value={value}>
                {ROLE_LABELS[value]}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  )
}

export default AdminNavbar
