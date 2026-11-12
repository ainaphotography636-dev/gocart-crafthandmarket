'use client'

import { usePathname } from "next/navigation"
import {
  BarChart3Icon,
  BriefcaseBusinessIcon,
  PackageSearchIcon,
  ShieldCheckIcon,
  StoreIcon,
  TicketPercentIcon,
  TruckIcon,
  UsersRoundIcon,
} from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { assets } from "@/assets/assets"
import { getNavItemsForRole, ROLE_LABELS } from "@/lib/adminPermissions"

const ICONS = {
  "/admin": BarChart3Icon,
  "/admin/products": PackageSearchIcon,
  "/admin/catalog": PackageSearchIcon,
  "/admin/stores": StoreIcon,
  "/admin/approve": ShieldCheckIcon,
  "/admin/logistics": TruckIcon,
  "/admin/b2b": BriefcaseBusinessIcon,
  "/admin/staff": UsersRoundIcon,
  "/admin/coupons": TicketPercentIcon,
}

const AdminSidebar = ({ role, permissions = [], adminName = "Crafthand Admin" }) => {
  const pathname = usePathname()
  const sidebarLinks = getNavItemsForRole(role, permissions)

  return (
    <div className="inline-flex h-full flex-col gap-5 border-r border-slate-200 sm:min-w-64 bg-white/40">
      <div className="flex flex-col gap-3 justify-center items-center pt-8 max-sm:hidden px-4">
        <Image className="w-14 h-14 rounded-full" src={assets.gs_logo} alt="" width={80} height={80} />
        <div className="text-center">
          <p className="text-slate-800 font-medium leading-tight">{adminName}</p>
          <p className="text-xs text-brand-gold mt-1">{ROLE_LABELS[role] || role}</p>
        </div>
      </div>

      <div className="max-sm:mt-6 pb-8">
        {sidebarLinks.map((link) => {
          const Icon = ICONS[link.href] || PackageSearchIcon
          const active =
            link.href === "/admin" ? pathname === "/admin" : pathname.startsWith(link.href)

          return (
            <Link
              key={link.href}
              href={link.href}
              title={link.description}
              className={`relative flex items-center gap-3 text-slate-500 hover:bg-slate-50 p-2.5 transition ${
                active ? "bg-slate-100 sm:text-slate-700" : ""
              }`}
            >
              <Icon size={18} className="sm:ml-4 shrink-0" />
              <p className="max-sm:hidden text-sm leading-snug">{link.name}</p>
              {active && (
                <span className="absolute bg-brand-emerald right-0 top-1.5 bottom-1.5 w-1 sm:w-1.5 rounded-l" />
              )}
            </Link>
          )
        })}
      </div>
    </div>
  )
}

export default AdminSidebar
