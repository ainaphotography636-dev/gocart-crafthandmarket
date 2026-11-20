'use client'
import { ChevronDown, Menu, Search, ShoppingBag, X } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import { useSelector } from "react-redux"
import BrandLogo from "@/components/shared/BrandLogo"
import CurrencySwitcher from "@/components/shared/CurrencySwitcher"
import { HANDICRAFT_CATEGORIES } from "@/lib/handicraftCategories"

const navLinks = [
  { href: "/#masterpieces", label: "MASTERPIECES" },
  { href: "/gifting", label: "GIFTING" },
  { href: "/#traditions", label: "TRADITIONS" },
  { href: "/#core-values", label: "CORE VALUES" },
  { href: "/#mission", label: "MISSION" },
  { href: "/#guarantees", label: "GUARANTEES" },
]

/**
 * CraftHand Market public Navbar — each item scrolls to its homepage section.
 * Categories opens a dropdown and also links to the Categories section.
 */
const Navbar = () => {
  const router = useRouter()
  const [search, setSearch] = useState("")
  const [mobileOpen, setMobileOpen] = useState(false)
  const [categoriesOpen, setCategoriesOpen] = useState(false)
  const categoriesRef = useRef(null)
  const cartCount = useSelector((state) => state.cart.total)

  useEffect(() => {
    const onPointer = (event) => {
      if (!categoriesRef.current?.contains(event.target)) {
        setCategoriesOpen(false)
      }
    }
    document.addEventListener("mousedown", onPointer)
    return () => document.removeEventListener("mousedown", onPointer)
  }, [])

  const handleSearch = (e) => {
    e.preventDefault()
    const q = search.trim()
    router.push(q ? `/shop?search=${encodeURIComponent(q)}` : "/shop")
    setMobileOpen(false)
  }

  const handleCartOpen = () => {
    setMobileOpen(false)
    router.push("/cart")
  }

  const closeMenus = () => {
    setMobileOpen(false)
    setCategoriesOpen(false)
  }

  return (
    <nav className="relative border-b border-slate-200/80 bg-white shadow-[0_1px_0_rgba(30,41,59,0.04)]">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 sm:py-3.5">
        <BrandLogo />

        <div className="hidden items-center gap-5 lg:flex xl:gap-6">
          <Link
            href="/#masterpieces"
            className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-slate transition hover:text-brand-terracotta"
          >
            Masterpieces
          </Link>

          <div className="relative" ref={categoriesRef}>
            <button
              type="button"
              onClick={() => setCategoriesOpen((open) => !open)}
              className="inline-flex items-center gap-1 text-sm font-medium text-brand-slate transition hover:text-brand-terracotta"
              aria-expanded={categoriesOpen}
            >
              Categories
              <ChevronDown size={14} className={categoriesOpen ? "rotate-180 transition" : "transition"} />
            </button>
            {categoriesOpen ? (
              <div className="absolute left-0 top-full z-50 mt-3 w-64 rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
                <Link
                  href="/#categories"
                  onClick={closeMenus}
                  className="block rounded-lg px-3 py-2 text-sm font-medium text-brand-slate hover:bg-brand-cream"
                >
                  Browse Categories
                </Link>
                <Link
                  href="/shop"
                  onClick={closeMenus}
                  className="block rounded-lg px-3 py-2 text-sm text-brand-slate hover:bg-brand-cream"
                >
                  All Categories
                </Link>
                {HANDICRAFT_CATEGORIES.map((category) => (
                  <Link
                    key={category}
                    href={`/shop?search=${encodeURIComponent(category)}`}
                    onClick={closeMenus}
                    className="block rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-brand-cream hover:text-brand-slate"
                  >
                    {category}
                  </Link>
                ))}
              </div>
            ) : null}
          </div>

          {navLinks.slice(1).map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-slate transition hover:text-brand-terracotta"
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="hidden items-center gap-3 md:flex">
          <form
            onSubmit={handleSearch}
            className="flex w-48 items-center gap-2 rounded-full bg-slate-100 px-3.5 py-2.5 text-sm lg:w-56 xl:w-64"
          >
            <Search size={16} className="shrink-0 text-slate-400" />
            <input
              className="w-full bg-transparent outline-none placeholder:text-slate-400"
              type="text"
              placeholder="Search luxury artifact..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </form>

          <CurrencySwitcher />

          <button
            type="button"
            onClick={handleCartOpen}
            className="relative flex size-10 items-center justify-center rounded-full bg-slate-100 text-brand-slate transition hover:bg-slate-200"
            aria-label={`Open cart, ${cartCount} items`}
          >
            <ShoppingBag size={18} />
            {cartCount > 0 ? (
              <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-brand-terracotta text-[9px] font-bold text-white">
                {cartCount > 9 ? "9+" : cartCount}
              </span>
            ) : null}
          </button>
        </div>

        <div className="flex items-center gap-2 md:hidden">
          <button
            type="button"
            onClick={handleCartOpen}
            className="relative flex size-10 items-center justify-center rounded-full bg-slate-100 text-brand-slate"
            aria-label={`Open cart, ${cartCount} items`}
          >
            <ShoppingBag size={18} />
            {cartCount > 0 ? (
              <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-brand-terracotta text-[9px] font-bold text-white">
                {cartCount > 9 ? "9+" : cartCount}
              </span>
            ) : null}
          </button>
          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            className="p-2 text-brand-slate"
            aria-expanded={mobileOpen}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {mobileOpen ? (
        <div className="border-t border-slate-200 px-4 py-4 md:hidden">
          <form
            onSubmit={handleSearch}
            className="mb-4 flex items-center gap-2 rounded-full bg-slate-100 px-3.5 py-2.5 text-sm"
          >
            <Search size={16} className="text-slate-400" />
            <input
              className="w-full bg-transparent outline-none placeholder:text-slate-400"
              type="text"
              placeholder="Search luxury artifact..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </form>
          <div className="flex flex-col gap-1">
            <Link
              href="/#masterpieces"
              onClick={closeMenus}
              className="px-2 py-2.5 text-sm font-semibold uppercase tracking-wide text-brand-slate"
            >
              Masterpieces
            </Link>
            <Link
              href="/#categories"
              onClick={closeMenus}
              className="px-2 py-2.5 text-sm font-semibold uppercase tracking-wide text-brand-slate"
            >
              Categories
            </Link>
            <p className="px-2 pt-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
              Shop by category
            </p>
            {HANDICRAFT_CATEGORIES.map((category) => (
              <Link
                key={category}
                href={`/shop?search=${encodeURIComponent(category)}`}
                onClick={closeMenus}
                className="px-2 py-2 text-sm text-slate-600"
              >
                {category}
              </Link>
            ))}
            {navLinks.slice(1).map((link) => (
              <Link
                key={link.label}
                href={link.href}
                onClick={closeMenus}
                className="px-2 py-2.5 text-sm font-semibold uppercase tracking-wide text-brand-slate"
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/auth/login"
              onClick={closeMenus}
              className="mt-2 px-2 py-2.5 text-sm text-brand-forest"
            >
              Login
            </Link>
          </div>
        </div>
      ) : null}
    </nav>
  )
}

export default Navbar
