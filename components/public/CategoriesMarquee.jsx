'use client'

import Link from "next/link"
import { HANDICRAFT_CATEGORIES } from "@/lib/handicraftCategories"

const CategoriesMarquee = () => {
  const loop = [...HANDICRAFT_CATEGORIES, ...HANDICRAFT_CATEGORIES]

  return (
    <section className="w-full border-y border-brand-gold/15 bg-brand-cream py-8 sm:py-12">
      <div className="mx-auto max-w-7xl px-6 mb-5 flex items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-brand-gold">Craft categories</p>
          <h2 className="text-xl sm:text-2xl text-slate-800 mt-2 font-medium">
            Brass · Handlooms · GI-Tag artifacts
          </h2>
        </div>
        <Link href="/shop" className="text-sm text-brand-emerald hover:underline">
          Shop all
        </Link>
      </div>

      <div className="overflow-hidden w-full relative max-w-7xl mx-auto select-none group">
        <div className="absolute left-0 top-0 h-full w-16 z-10 pointer-events-none bg-gradient-to-r from-brand-cream to-transparent" />
        <div className="flex min-w-[200%] animate-[marqueeScroll_28s_linear_infinite] group-hover:[animation-play-state:paused] gap-3 px-6">
          {loop.map((category, index) => (
            <Link
              key={`${category}-${index}`}
              href={`/shop?search=${encodeURIComponent(category)}`}
              className="shrink-0 px-5 py-2.5 bg-white/80 border border-brand-gold/20 text-slate-600 text-xs sm:text-sm hover:border-brand-emerald hover:text-brand-emerald transition"
            >
              {category}
            </Link>
          ))}
        </div>
        <div className="absolute right-0 top-0 h-full w-16 z-10 pointer-events-none bg-gradient-to-l from-brand-cream to-transparent" />
      </div>
    </section>
  )
}

export default CategoriesMarquee
