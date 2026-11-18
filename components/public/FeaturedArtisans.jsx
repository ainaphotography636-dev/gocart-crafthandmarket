'use client'

import Link from 'next/link'
import ArtisanCard from '@/components/public/ArtisanCard'

export default function FeaturedArtisans({ artisans = [] }) {
  const items = Array.isArray(artisans) ? artisans : []
  const count = items.length

  return (
    <section className="mx-auto max-w-7xl px-6 pb-8 sm:px-8">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-brand-terracotta">
          Verified Workshops
        </p>
        <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl text-brand-forest sm:text-4xl">
          Featured Artisans
        </h2>
        <p className="mt-3 text-sm text-slate-600">
          {count
            ? `Meet ${count} verified workshop${count === 1 ? '' : 's'} on CraftHand Market`
            : 'Verified workshops appear here once approved and published'}
        </p>
      </div>

      {count === 0 ? (
        <div className="mt-10 border border-dashed border-brand-forest/20 bg-white/60 px-6 py-12 text-center">
          <p className="text-sm text-slate-600">
            No live artisans yet. Publish a piece from the artisan portal to activate
            your workshop on the storefront.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            <Link
              href="/artisan/join"
              className="inline-flex text-sm font-medium text-brand-terracotta hover:underline"
            >
              Become an artisan
            </Link>
            <Link
              href="/artisans"
              className="inline-flex text-sm text-slate-500 hover:text-slate-700"
            >
              Browse artisans
            </Link>
          </div>
        </div>
      ) : (
        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((artisan) => (
            <ArtisanCard
              key={`${artisan.artisanCode}-${artisan.id}`}
              artisan={artisan}
            />
          ))}
        </div>
      )}
    </section>
  )
}
