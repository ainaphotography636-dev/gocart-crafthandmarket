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
    { name: "New piece (upload)", href: "/artisan/products/new", icon: SquarePlusIcon },
    { name: "Manage Product", href: "/store/manage-product", icon: SquarePenIcon },
    { name: "Orders", href: "/store/orders", icon: LayoutListIcon },
  ]

  return (
    <div className="inline-flex h-full flex-col gap-5 border-r border-slate-200 sm:min-w-60 bg-white/40">
      <div className="flex flex-col gap-3 justify-center items-center pt-8 max-sm:hidden px-4">
        {storeInfo?.logo ? (
          <Image
            className="w-14 h-14 rounded-full shadow-md object-cover"
            src={storeInfo.logo}
            alt=""
            width={80}
            height={80}
          />
        ) : (
          <div className="w-14 h-14 rounded-full bg-brand-emerald-soft" />
        )}
        <div className="text-center">
          <p className="text-slate-800 font-medium leading-tight">{storeInfo?.name}</p>
          {storeInfo?.username ? (
            <p className="text-xs text-brand-gold mt-1">@{storeInfo.username}</p>
          ) : null}
        </div>
      </div>

      <div className="max-sm:mt-6">
        {sidebarLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`relative flex items-center gap-3 text-slate-500 hover:bg-slate-50 p-2.5 transition ${
              pathname === link.href && "bg-slate-100 sm:text-slate-600"
            }`}
          >
            <link.icon size={18} className="sm:ml-5" />
            <p className="max-sm:hidden">{link.name}</p>
            {pathname === link.href && (
              <span className="absolute bg-brand-emerald right-0 top-1.5 bottom-1.5 w-1 sm:w-1.5 rounded-l"></span>
            )}
          </Link>
        ))}
      </div>
    </div>
  )
}

export default StoreSidebar
