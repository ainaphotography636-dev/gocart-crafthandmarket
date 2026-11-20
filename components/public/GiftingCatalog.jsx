'use client'

import { useMemo, useState } from "react"
import Link from "next/link"
import LuxuryProductCard from "@/components/public/LuxuryProductCard"
import {
  GIFTING_GROUPS,
  productMatchesGiftingTag,
} from "@/lib/giftingCategories"

/**
 * Interactive gifting browser — group sidebar + subcategory chips + product grid.
 */
export default function GiftingCatalog({ products = [] }) {
  const [activeGroupId, setActiveGroupId] = useState(GIFTING_GROUPS[0].id)
  const [activeTag, setActiveTag] = useState("")

  const activeGroup =
    GIFTING_GROUPS.find((group) => group.id === activeGroupId) || GIFTING_GROUPS[0]

  const filtered = useMemo(() => {
    if (!activeTag) {
      // Show products that match any tag in the active group
      return products.filter((product) =>
        activeGroup.items.some((tag) => productMatchesGiftingTag(product, tag))
      )
    }
    return products.filter((product) => productMatchesGiftingTag(product, activeTag))
  }, [products, activeGroup, activeTag])

  return (
    <div className="mx-auto max-w-7xl px-5 py-12 sm:px-8 sm:py-16">
      <div className="max-w-3xl">
        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-brand-terracotta">
          Gifting
        </p>
        <h1 className="mt-3 font-[family-name:var(--font-display)] text-3xl text-[#1B3B2B] sm:text-4xl lg:text-5xl">
          Curated Handicraft Gifts for Every Occasion
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-slate-600 sm:text-base">
          Browse hampers, festivals, relationships, return gifts, Diwali décor, and
          corporate sets — then choose a piece tagged by verified artisans for that moment.
        </p>
      </div>

      {/* Full taxonomy overview (matches the category sheet) */}
      <div className="mt-12 grid gap-8 border border-[#1B3B2B]/10 bg-white p-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 sm:p-8">
        {GIFTING_GROUPS.map((group) => (
          <div key={group.id}>
            <button
              type="button"
              onClick={() => {
                setActiveGroupId(group.id)
                setActiveTag("")
              }}
              className={`w-full border-b pb-2 text-left text-xs font-semibold uppercase tracking-[0.16em] transition ${
                activeGroupId === group.id
                  ? "border-brand-terracotta text-brand-terracotta"
                  : "border-slate-200 text-brand-slate hover:text-brand-terracotta"
              }`}
            >
              {group.title}
            </button>
            <ul className="mt-3 space-y-1.5">
              {group.items.map((item) => (
                <li key={item}>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveGroupId(group.id)
                      setActiveTag(item)
                    }}
                    className={`text-left text-sm transition ${
                      activeTag === item
                        ? "font-medium text-brand-terracotta"
                        : "text-slate-600 hover:text-brand-slate"
                    }`}
                  >
                    {item}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Active filter + products */}
      <div className="mt-14">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brand-terracotta">
              {activeGroup.title}
            </p>
            <h2 className="mt-2 font-[family-name:var(--font-display)] text-2xl text-[#1B3B2B] sm:text-3xl">
              {activeTag || `All ${activeGroup.title}`}
            </h2>
          </div>
          {activeTag ? (
            <button
              type="button"
              onClick={() => setActiveTag("")}
              className="text-sm font-medium text-brand-forest hover:underline"
            >
              Clear filter
            </button>
          ) : null}
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {activeGroup.items.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setActiveTag(item === activeTag ? "" : item)}
              className={`rounded-full border px-3.5 py-1.5 text-xs transition ${
                activeTag === item
                  ? "border-brand-terracotta bg-brand-terracotta text-white"
                  : "border-slate-200 bg-white text-slate-600 hover:border-brand-forest hover:text-brand-forest"
              }`}
            >
              {item}
            </button>
          ))}
        </div>

        {filtered.length ? (
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((product) => (
              <LuxuryProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="mt-10 border border-dashed border-brand-forest/20 bg-white/70 px-6 py-14 text-center">
            <p className="text-sm text-slate-600">
              No pieces tagged for this gift category yet. Artisans can select gifting
              tags when publishing a product.
            </p>
            <Link
              href="/shop"
              className="mt-4 inline-flex text-sm font-medium text-brand-terracotta hover:underline"
            >
              Browse full storefront
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
