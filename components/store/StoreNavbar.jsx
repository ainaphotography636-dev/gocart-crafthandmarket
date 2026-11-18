'use client'
import BrandLogo from "@/components/shared/BrandLogo"
import { getActiveStore } from "@/lib/storeRegistry"
import { useEffect, useState } from "react"

const StoreNavbar = () => {
  const [storeName, setStoreName] = useState("Artisan")

  useEffect(() => {
    const store = getActiveStore()
    if (store?.name) setStoreName(store.name)
  }, [])

  return (
    <div className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3 transition-all sm:px-12">
      <BrandLogo badge="store" />
      <div className="flex items-center gap-4 text-slate-600">
        <span className="hidden items-center gap-1.5 rounded-full border border-brand-emerald/20 bg-brand-emerald-soft px-3 py-1 text-xs font-medium text-brand-emerald sm:inline-flex">
          <span className="h-1.5 w-1.5 rounded-full bg-brand-emerald" aria-hidden />
          INR (₹) Active
        </span>
        <p className="text-sm">
          Hi, <span className="font-medium text-slate-800">{storeName}</span>
        </p>
      </div>
    </div>
  )
}

export default StoreNavbar
