'use client'
import { usePathname } from "next/navigation"
import { HomeIcon, LayoutListIcon, SquarePenIcon, SquarePlusIcon } from "lucide-react"
import Image from "next/image"
import Link from "next/link"

const StoreSidebar = ({ storeInfo }) => {
  const pathname = usePathname()

  const sidebarLinks = [
    { name: "Dashboard", href: "/store", icon: HomeIcon },
    { name: "Add Product", href: "/store/add-product", icon: SquarePlusIcon },
    { name: "Manage Products", href: "/store/manage-product", icon: SquarePenIcon },
    { name: "Orders & Payouts", href: "/store/orders", icon: LayoutListIcon },
  ]

  return (
    <div className="inline-flex h-full flex-col gap-5 border-r border-slate-200 bg-white sm:min-w-60">
      <div className="flex flex-col items-center justify-center gap-3 px-4 pt-8 max-sm:hidden">
        {storeInfo?.logo ? (
          <Image
            className="h-14 w-14 rounded-full object-cover shadow-md"
            src={storeInfo.logo}
            alt=""
            width={80}
            height={80}
          />
        ) : (
          <div className="h-14 w-14 rounded-full bg-brand-emerald-soft" />
        )}
        <div className="text-center">
          <p className="font-medium leading-tight text-slate-800">{storeInfo?.name}</p>
          {storeInfo?.username ? (
            <p className="mt-1 text-xs text-brand-gold">@{storeInfo.username}</p>
          ) : null}
        </div>
      </div>

      <div className="px-2 max-sm:mt-6">
        {sidebarLinks.map((link) => {
          const active = pathname === link.href
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`relative mb-1 flex items-center gap-3 rounded-lg p-2.5 transition ${
                active
                  ? "bg-brand-emerald text-white shadow-sm"
                  : "text-slate-500 hover:bg-slate-50"
              }`}
            >
              <link.icon size={18} className="sm:ml-2" />
              <p className="max-sm:hidden text-sm font-medium">{link.name}</p>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

export default StoreSidebar
