'use client'
import { Search, ShoppingCart } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useSelector } from "react-redux";
import BrandLogo from "@/components/BrandLogo";
import CurrencySwitcher from "@/components/CurrencySwitcher";

const Navbar = () => {

    const router = useRouter();

    const [search, setSearch] = useState('')
    const cartCount = useSelector(state => state.cart.total)

    const handleSearch = (e) => {
        e.preventDefault()
        router.push(`/shop?search=${search}`)
    }

    return (
        <nav className="relative bg-brand-cream/90 backdrop-blur-sm">
            <div className="mx-6">
                <div className="flex items-center justify-between max-w-7xl mx-auto py-4  transition-all">

                    <BrandLogo badge="plus" />

                    {/* Desktop Menu */}
                    <div className="hidden sm:flex items-center gap-4 lg:gap-8 text-slate-600">
                        <Link href="/" className="hover:text-brand-emerald transition">Home</Link>
                        <Link href="/shop" className="hover:text-brand-emerald transition">Shop</Link>
                        <Link href="/" className="hover:text-brand-emerald transition">About</Link>
                        <Link href="/" className="hover:text-brand-emerald transition">Contact</Link>

                        <form onSubmit={handleSearch} className="hidden xl:flex items-center w-xs text-sm gap-2 bg-amber-50 px-4 py-3 rounded-full border border-brand-gold/20">
                            <Search size={18} className="text-brand-amber" />
                            <input className="w-full bg-transparent outline-none placeholder-slate-600" type="text" placeholder="Search products" value={search} onChange={(e) => setSearch(e.target.value)} required />
                        </form>

                        <CurrencySwitcher />

                        <Link href="/cart" className="relative flex items-center gap-2 text-slate-600 hover:text-brand-emerald transition">
                            <ShoppingCart size={18} />
                            Cart
                            <button className="absolute -top-1 left-3 text-[8px] text-white bg-brand-amber size-3.5 rounded-full">{cartCount}</button>
                        </Link>

                        <button className="px-8 py-2 bg-brand-emerald hover:bg-brand-amber transition text-white rounded-full">
                            Login
                        </button>

                    </div>

                    {/* Mobile User Button  */}
                    <div className="sm:hidden flex items-center gap-2">
                        <CurrencySwitcher />
                        <button className="px-7 py-1.5 bg-brand-emerald hover:bg-brand-amber text-sm transition text-white rounded-full">
                            Login
                        </button>
                    </div>
                </div>
            </div>
            <hr className="border-brand-gold/20" />
        </nav>
    )
}

export default Navbar
