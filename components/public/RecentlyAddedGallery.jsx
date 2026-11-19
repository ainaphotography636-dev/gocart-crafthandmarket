'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import LuxuryProductCard from './LuxuryProductCard'
import { HANDICRAFT_CATEGORIES } from '@/lib/handicraftCategories'

export default function RecentlyAddedGallery({ products = [] }) {
  const items = Array.isArray(products) ? products : []
  const [category, setCategory] = useState('all')

  const filtered = useMemo(() => {
    if (category === 'all') return items
    const needle = category.toLowerCase()
    return items.filter((product) => {
      const hay = [
        product?.category,
        product?.giTag,
        product?.craftTechnique,
        product?.material,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return hay.includes(needle) || needle.split(/\s+/).some((part) => hay.includes(part))
    })
  }, [items, category])

  const count = filtered.length

  return (
    <section
      id="masterpieces"
      className="scroll-mt-24 bg-brand-cream px-6 py-16 sm:px-8 sm:py-20"
    >
      <div className="mx-auto max-w-[90rem]">
        <div className="flex flex-col gap-4 border-b border-slate-200/80 pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-brand-terracotta">
              Exquisite Catalog
            </p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-brand-slate sm:text-3xl">
              Featured Luxury Handicrafts
            </h2>
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-500">
            <span className="whitespace-nowrap">Category:</span>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="min-w-[220px] rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-brand-slate outline-none transition focus:border-brand-forest"
            >
              <option value="all">All Categories &amp; Sub-categories</option>
              {HANDICRAFT_CATEGORIES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
        </div>

        {items.length === 0 ? (
          <div className="mt-10 border border-dashed border-brand-forest/20 bg-white/70 px-6 py-14 text-center">
            <p className="text-sm text-slate-600">
              No masterpieces published yet. Add a workshop piece with photos and publish
              to feature it here.
            </p>
            <Link
              href="/store/add-product"
              className="mt-4 inline-flex text-sm font-medium text-brand-terracotta hover:underline"
            >
              Add a product
            </Link>
          </div>
        ) : count === 0 ? (
          <div className="mt-10 border border-dashed border-slate-200 bg-white/70 px-6 py-12 text-center text-sm text-slate-600">
            No pieces match this category. Try another filter or{' '}
            <button
              type="button"
              onClick={() => setCategory('all')}
              className="font-medium text-brand-terracotta hover:underline"
            >
              view all masterpieces
            </button>
            .
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {filtered.slice(0, 4).map((product) => (
              <LuxuryProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
