'use client'

import Link from 'next/link'
import ProductCard from './ProductCard'

export default function RecentlyAddedGallery({ products = [] }) {
  const items = Array.isArray(products) ? products : []
  const count = items.length

  return (
    <section className="mx-auto max-w-7xl px-6 py-16 sm:px-8 sm:py-20">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-brand-terracotta">
          Marketplace
        </p>
        <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl text-brand-slate sm:text-4xl">
          Curated Handcrafted Offerings
        </h2>
        <p className="mt-3 text-sm text-slate-600">
          {count
            ? `Workshop-coded pieces with material specs, dimensions, and video verification.`
            : 'Published handicrafts from verified workshops will appear here.'}
        </p>
      </div>

      {count === 0 ? (
        <div className="mt-12 border border-dashed border-brand-forest/20 bg-white/60 px-6 py-14 text-center">
          <p className="text-sm text-slate-600">
            No storefront pieces yet. Sign in, open Add Product, upload 4+ photos,
            then publish — your workshop and product will appear here.
          </p>
          <Link
            href="/store/add-product"
            className="mt-4 inline-flex text-sm font-medium text-brand-terracotta hover:underline"
          >
            Add a product
          </Link>
        </div>
      ) : (
        <div className="mt-12 grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}

      {count > 0 ? (
        <div className="mt-12 text-center">
          <Link
            href="/shop"
            className="inline-flex border border-brand-forest/25 px-6 py-3 text-sm font-medium text-brand-forest transition hover:border-brand-forest hover:bg-brand-forest hover:text-white"
          >
            View Full Marketplace
          </Link>
        </div>
      ) : null}
    </section>
  )
}
