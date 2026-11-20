'use client'

import Link from "next/link"
import { HANDICRAFT_CATEGORIES } from "@/lib/handicraftCategories"

/**
 * Craft categories banner — same items, cream banner, and continuous
 * running marquee with soft edge fades.
 */
const CategoriesMarquee = () => {
  const loop = [...HANDICRAFT_CATEGORIES, ...HANDICRAFT_CATEGORIES]

  return (
    <section
      id="categories"
      className="scroll-mt-24 w-full border-y border-brand-forest/10 bg-brand-cream py-8 sm:py-12"
    >
      <div className="mx-auto mb-5 flex max-w-7xl items-end justify-between gap-3 px-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-terracotta">
            Categories
          </p>
          <h2 className="mt-2 text-xl font-medium text-brand-slate sm:text-2xl">
            Brass · Handlooms · GI-Tag artifacts
          </h2>
        </div>
        <Link
          href="/shop"
          className="shrink-0 text-sm font-medium text-brand-forest hover:underline"
        >
          Shop all
        </Link>
      </div>

      <div className="group relative mx-auto w-full max-w-7xl select-none overflow-hidden">
        <div className="pointer-events-none absolute left-0 top-0 z-10 h-full w-16 bg-gradient-to-r from-brand-cream to-transparent" />
        <div className="flex min-w-[200%] animate-[marqueeScroll_28s_linear_infinite] gap-3 px-6 group-hover:[animation-play-state:paused]">
          {loop.map((category, index) => (
            <Link
              key={`${category}-${index}`}
              href={`/shop?search=${encodeURIComponent(category)}`}
              className="shrink-0 rounded-md border border-slate-200/90 bg-white px-5 py-2.5 text-xs text-brand-slate transition hover:border-brand-forest hover:text-brand-forest sm:text-sm"
            >
              {category}
            </Link>
          ))}
        </div>
        <div className="pointer-events-none absolute right-0 top-0 z-10 h-full w-16 bg-gradient-to-l from-brand-cream to-transparent" />
      </div>
    </section>
  )
}

export default CategoriesMarquee
