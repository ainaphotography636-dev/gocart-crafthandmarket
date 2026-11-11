'use client'
import BrandLogo from "@/components/shared/BrandLogo"
import CurrencySwitcher from "@/components/shared/CurrencySwitcher"

const StoreNavbar = () => {


    return (
        <div className="flex items-center justify-between px-6 sm:px-12 py-3 border-b border-brand-gold/20 bg-brand-cream/80 transition-all">
            <BrandLogo badge="store" />
            <div className="flex items-center gap-3 text-slate-600">
                <CurrencySwitcher className="max-sm:hidden" />
                <p>Hi, Seller</p>
            </div>
        </div>
    )
}

export default StoreNavbar
