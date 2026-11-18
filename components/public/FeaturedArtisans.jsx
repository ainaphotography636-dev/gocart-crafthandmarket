'use client'

import Link from 'next/link'
import ArtisanCard from '@/components/public/ArtisanCard'
import Title from './Title'

export default function FeaturedArtisans({ artisans = [] }) {
  const items = Array.isArray(artisans) ? artisans : []
  const count = items.length

  return (
    <section className="mx-auto my-16 max-w-6xl px-6 sm:my-20">
      <Title
        title="Featured Artisans"
        description={
          count
            ? `Meet ${count} verified workshop${count === 1 ? '' : 's'} on Crafthand Market`
            : 'Verified workshops appear here once approved and published'
        }
        href="/artisans"
        visibleButton={count > 0}
      />

      {count === 0 ? (
        <div className="mt-10 rounded-xl border border-dashed border-slate-200 bg-slate-50/80 px-6 py-12 text-center">
          <p className="text-sm text-slate-600">
            No live artisans yet. Publish a piece from the artisan portal (while
            signed in) to activate your workshop on the storefront.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            <Link
              href="/artisan/join"
              className="inline-flex text-sm font-medium text-brand-emerald hover:text-brand-amber"
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
