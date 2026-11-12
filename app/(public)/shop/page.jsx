'use client'
import { Suspense, useEffect, useState } from "react"
import ProductCard from "@/components/public/ProductCard"
import ArtisanCard from "@/components/public/ArtisanCard"
import { MoveLeftIcon } from "lucide-react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useSelector } from "react-redux"
import { fetchArtisanDirectory } from "@/lib/artisanDirectory"
import { formatProductTitle } from "@/lib/productCodes"

 function ShopContent() {

    // get query params ?search=abc
    const searchParams = useSearchParams()
    const search = searchParams.get('search')
    const router = useRouter()

    const products = useSelector(state => state.product.list)
    const [artisans, setArtisans] = useState([])

    useEffect(() => {
        let alive = true
        ;(async () => {
            const result = await fetchArtisanDirectory()
            if (alive) setArtisans((result.artisans || []).slice(0, 6))
        })()
        return () => {
            alive = false
        }
    }, [])

    const filteredProducts = search
        ? products.filter(product =>
            formatProductTitle(product).toLowerCase().includes(search.toLowerCase())
        )
        : products;

    return (
        <div className="min-h-[70vh] mx-6">
            <div className=" max-w-7xl mx-auto">
                {!search && artisans.length ? (
                    <section className="mt-8 mb-10">
                        <div className="flex items-end justify-between gap-3">
                            <div>
                                <p className="text-xs uppercase tracking-[0.18em] text-brand-gold">Artisans</p>
                                <h2 className="text-xl text-slate-700 mt-1">Stores & workshops</h2>
                            </div>
                            <Link href="/artisans" className="text-sm text-brand-emerald hover:underline">
                                View all artisans
                            </Link>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                            {artisans.map((artisan) => (
                                <ArtisanCard key={`${artisan.artisanCode}-${artisan.id}`} artisan={artisan} />
                            ))}
                        </div>
                    </section>
                ) : null}

                <h1 onClick={() => router.push('/shop')} className="text-2xl text-slate-500 my-6 flex items-center gap-2 cursor-pointer"> {search && <MoveLeftIcon size={20} />}  All <span className="text-slate-700 font-medium">Products</span></h1>
                <div className="grid grid-cols-2 sm:flex flex-wrap gap-6 xl:gap-12 mx-auto mb-32">
                    {filteredProducts.map((product) => <ProductCard key={product.id} product={product} />)}
                </div>
            </div>
        </div>
    )
}


export default function Shop() {
  return (
    <Suspense fallback={<div>Loading shop...</div>}>
      <ShopContent />
    </Suspense>
  );
}