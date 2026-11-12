'use client'
import { Menu, Search, ShoppingCart, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useSelector } from "react-redux";
import toast from "react-hot-toast";
import BrandLogo from "@/components/shared/BrandLogo";
import CurrencySwitcher from "@/components/shared/CurrencySwitcher";

const navLinks = [
    { href: "/", label: "Home" },
    { href: "/shop", label: "Shop" },
    { href: "/artisans", label: "Artisans" },
    { href: "/create-store", label: "Sell" },
    { href: "/pricing", label: "Pricing" },
]

/**
 * Crafthand Market public Navbar.
 * Preserves GoCart cart count via Redux (`state.cart.total`) and routes
 * cart interactions to `/cart` (storefront cart page — no separate drawer
 * provider exists in this codebase yet). Login remains an auth trigger hook.
 */
const Navbar = () => {
    const router = useRouter()
    const [search, setSearch] = useState('')
    const [mobileOpen, setMobileOpen] = useState(false)
    const cartCount = useSelector((state) => state.cart.total)

    const handleSearch = (e) => {
        e.preventDefault()
        const q = search.trim()
        router.push(q ? `/shop?search=${encodeURIComponent(q)}` : '/shop')
        setMobileOpen(false)
    }

    const handleAuthTrigger = () => {
        // Auth provider not wired yet — keep a visible trigger for Phase 1.
        toast("Sign in will open here once authentication is connected.")
    }

    const handleCartOpen = () => {
        // GoCart cart "drawer" equivalent: navigate to cart page with Redux state.
        setMobileOpen(false)
        router.push('/cart')
    }

    return (
        <nav className="relative bg-brand-cream/95 backdrop-blur-sm border-b border-brand-gold/20">
            <div className="mx-4 sm:mx-6">
                <div className="flex items-center justify-between max-w-7xl mx-auto py-3 sm:py-4 gap-3">
                    <BrandLogo badge="plus" />

                    {/* Desktop */}
                    <div className="hidden sm:flex items-center gap-4 lg:gap-7 text-slate-600">
                        {navLinks.map((link) => (
                            <Link
                                key={link.href + link.label}
                                href={link.href}
                                className="hover:text-brand-emerald transition"
                            >
                                {link.label}
                            </Link>
                        ))}

                        <form
                            onSubmit={handleSearch}
                            className="hidden xl:flex items-center w-xs text-sm gap-2 bg-amber-50 px-4 py-3 rounded-full border border-brand-gold/20"
                        >
                            <Search size={18} className="text-brand-amber" />
                            <input
                                className="w-full bg-transparent outline-none placeholder-slate-600"
                                type="text"
                                placeholder="Search artisan goods"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </form>

                        <CurrencySwitcher />

                        <button
                            type="button"
                            onClick={handleCartOpen}
                            className="relative flex items-center gap-2 text-slate-600 hover:text-brand-emerald transition"
                            aria-label={`Open cart, ${cartCount} items`}
                        >
                            <ShoppingCart size={18} />
                            Cart
                            <span className="absolute -top-1 left-3 text-[8px] text-white bg-brand-amber size-3.5 rounded-full flex items-center justify-center">
                                {cartCount}
                            </span>
                        </button>

                        <button
                            type="button"
                            onClick={handleAuthTrigger}
                            className="px-8 py-2 bg-brand-emerald hover:bg-brand-amber transition text-white rounded-full"
                        >
                            Login
                        </button>
                    </div>

                    {/* Mobile controls — cart + auth + menu */}
                    <div className="sm:hidden flex items-center gap-2">
                        <CurrencySwitcher />
                        <button
                            type="button"
                            onClick={handleCartOpen}
                            className="relative p-2 text-slate-700"
                            aria-label={`Open cart, ${cartCount} items`}
                        >
                            <ShoppingCart size={20} />
                            <span className="absolute top-0.5 right-0.5 text-[8px] text-white bg-brand-amber size-3.5 rounded-full flex items-center justify-center">
                                {cartCount}
                            </span>
                        </button>
                        <button
                            type="button"
                            onClick={handleAuthTrigger}
                            className="px-4 py-1.5 bg-brand-emerald hover:bg-brand-amber text-sm transition text-white rounded-full"
                        >
                            Login
                        </button>
                        <button
                            type="button"
                            onClick={() => setMobileOpen((v) => !v)}
                            className="p-2 text-slate-700"
                            aria-expanded={mobileOpen}
                            aria-label={mobileOpen ? "Close menu" : "Open menu"}
                        >
                            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
                        </button>
                    </div>
                </div>

                {mobileOpen && (
                    <div className="sm:hidden border-t border-brand-gold/20 py-4 max-w-7xl mx-auto">
                        <form onSubmit={handleSearch} className="flex items-center gap-2 bg-amber-50 px-3 py-2.5 rounded-full border border-brand-gold/20 mb-4">
                            <Search size={16} className="text-brand-amber" />
                            <input
                                className="w-full bg-transparent outline-none text-sm placeholder-slate-600"
                                type="text"
                                placeholder="Search artisan goods"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </form>
                        <div className="flex flex-col gap-1 text-slate-700">
                            {navLinks.map((link) => (
                                <Link
                                    key={link.href + link.label}
                                    href={link.href}
                                    onClick={() => setMobileOpen(false)}
                                    className="px-2 py-2.5 rounded-md hover:bg-brand-emerald-soft hover:text-brand-emerald transition"
                                >
                                    {link.label}
                                </Link>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </nav>
    )
}

export default Navbar
