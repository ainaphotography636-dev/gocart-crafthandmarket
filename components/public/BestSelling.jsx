'use client'

import ProductCard from './ProductCard'
import { useSelector } from 'react-redux'
import Link from 'next/link'

export default function BestSelling({ products: productsProp }) {
  const displayQuantity = 4
  const reduxProducts = useSelector((state) => state.product.list)
  const products = Array.isArray(productsProp) && productsProp.length
    ? productsProp
    : Array.isArray(reduxProducts)
      ? reduxProducts
      : []

  const ranked = products
    .slice()
    .sort((a, b) => {
      const aRatings = Array.isArray(a?.rating) ? a.rating.length : 0
      const bRatings = Array.isArray(b?.rating) ? b.rating.length : 0
      if (bRatings !== aRatings) return bRatings - aRatings
      const aTime = a?.createdAt ? new Date(a.createdAt).getTime() : 0
      const bTime = b?.createdAt ? new Date(b.createdAt).getTime() : 0
      return bTime - aTime
    })
    .slice(0, displayQuantity)

  // Avoid duplicating the curated grid when the same short list is shown above.
  if (!ranked.length || products.length <= 8) return null

  return (
    <section className="mx-auto max-w-7xl px-6 pb-8 sm:px-8">
      <div className="flex items-end justify-between gap-4 border-t border-brand-forest/10 pt-12">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-brand-terracotta">
            Collector Favorites
          </p>
          <h2 className="mt-2 font-[family-name:var(--font-display)] text-2xl text-brand-slate sm:text-3xl">
            Best Selling
          </h2>
        </div>
        <Link href="/shop" className="text-sm text-brand-terracotta hover:underline">
          Shop all
        </Link>
      </div>
      <div className="mt-10 grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
        {ranked.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  )
}
