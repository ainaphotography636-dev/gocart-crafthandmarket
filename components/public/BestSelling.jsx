'use client'

import Title from './Title'
import ProductCard from './ProductCard'
import { useSelector } from 'react-redux'

export default function BestSelling({ products: productsProp }) {
  const displayQuantity = 8
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

  const shown = ranked.length

  return (
    <div className="mx-auto my-30 max-w-6xl px-6">
      <Title
        title="Best Selling"
        description={
          shown
            ? `Showing ${shown} of ${products.length} products`
            : 'Published workshop pieces will appear here'
        }
        href="/shop"
        visibleButton={shown > 0}
      />
      {shown ? (
        <div className="mt-12 grid grid-cols-2 gap-6 sm:flex sm:flex-wrap xl:gap-12">
          {ranked.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <div className="mt-10 rounded-xl border border-dashed border-slate-200 bg-slate-50/80 px-6 py-12 text-center text-sm text-slate-600">
          No storefront products yet. Publish from Add Product while signed in.
        </div>
      )}
    </div>
  )
}
