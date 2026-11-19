"use client"

import Link from "next/link"
import { MoveLeftIcon } from "lucide-react"
import { useRouter } from "next/navigation"
import ArtisanCard from "@/components/public/ArtisanCard"
import ProductCard from "@/components/public/ProductCard"
import type { StorefrontArtisan, StorefrontProduct } from "@/lib/marketplace/types"

type ShopCatalogProps = {
  products: StorefrontProduct[]
  artisans: StorefrontArtisan[]
  search?: string | null
  source?: string
  error?: string | null
}

export default function ShopCatalog({
  products,
  artisans,
  search,
  source,
  error,
}: ShopCatalogProps) {
  const router = useRouter()
  const query = String(search || "").trim()

  return (
    <div className="min-h-[70vh] mx-6">
      <div className="max-w-7xl mx-auto">
        {!query && artisans.length ? (
          <section className="mt-8 mb-10">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-brand-gold">
                  Artisans
                </p>
                <h2 className="text-xl text-slate-700 mt-1">Stores & workshops</h2>
              </div>
              <Link
                href="/artisans"
                className="text-sm text-brand-emerald hover:underline"
              >
                View all artisans
              </Link>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {artisans.map((artisan) => (
                <ArtisanCard
                  key={`${artisan.artisanCode}-${artisan.id}`}
                  artisan={artisan}
                />
              ))}
            </div>
          </section>
        ) : null}

        <h1
          onClick={() => router.push("/shop")}
          className="my-6 flex cursor-pointer items-center gap-2 text-2xl text-slate-500"
        >
          {query ? <MoveLeftIcon size={20} /> : null}
          All <span className="font-medium text-slate-700">Products</span>
        </h1>

        {source ? (
          <p className="mb-4 text-xs text-slate-400">
            Catalog source: {source}
            {error ? ` · ${error}` : null}
          </p>
        ) : null}

        {products.length ? (
          <div className="mx-auto mb-32 grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="mb-32 rounded-2xl border border-dashed border-brand-gold/30 bg-white/60 p-10 text-center">
            <h2 className="text-xl font-medium text-slate-800">
              {query ? "No products match your search" : "No published products yet"}
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
              {query
                ? "Try another keyword, or browse the full catalog."
                : "Verified artisans can publish pieces from the workshop dashboard. Media is served from Cloudflare R2."}
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              {query ? (
                <Link
                  href="/shop"
                  className="rounded-md bg-brand-emerald px-4 py-2 text-sm text-white hover:bg-brand-amber"
                >
                  Clear search
                </Link>
              ) : (
                <Link
                  href="/artisan/join"
                  className="rounded-md bg-brand-emerald px-4 py-2 text-sm text-white hover:bg-brand-amber"
                >
                  Become an artisan
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
