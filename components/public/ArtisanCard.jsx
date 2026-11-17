'use client'

import Link from "next/link"
import SafeImage from "@/components/shared/SafeImage"

export default function ArtisanCard({ artisan }) {
  const logo = artisan.logoUrl || artisan.logo
  const href = artisan.username ? `/shop/${artisan.username}` : "/shop"
  const tags = Array.isArray(artisan.giTags) ? artisan.giTags.slice(0, 2) : []

  return (
    <article className="overflow-hidden rounded-2xl border border-brand-gold/20 bg-white/80 transition hover:border-brand-emerald/40">
      <div className="relative aspect-[4/3] bg-brand-amber-soft/40">
        <SafeImage
          src={logo}
          alt={artisan.name || "Artisan workshop"}
          fill
          className="object-cover"
        />
        <span className="absolute left-3 top-3 rounded bg-brand-ink/80 px-2 py-1 text-[11px] uppercase tracking-wide text-white">
          {artisan.artisanCode}
        </span>
        {artisan.source === "supabase" || artisan.source === "r2" ? (
          <span className="absolute right-3 top-3 rounded bg-brand-emerald px-2 py-1 text-[11px] uppercase tracking-wide text-white">
            {artisan.source === "supabase" ? "Live" : "R2"}
          </span>
        ) : null}
      </div>
      <div className="p-4">
        <p className="text-xs text-brand-gold">@{artisan.username || "workshop"}</p>
        <h3 className="mt-1 font-medium text-slate-800">{artisan.name}</h3>
        <p className="mt-2 line-clamp-3 text-sm text-slate-500">{artisan.description}</p>
        {tags.length ? (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-brand-emerald-soft px-2 py-0.5 text-[11px] text-brand-emerald"
              >
                {tag}
              </span>
            ))}
          </div>
        ) : null}
        <div className="mt-4 flex items-center justify-between gap-2">
          <p className="truncate text-xs text-slate-400">
            {artisan.region || artisan.address || "Handmade workshop"}
          </p>
          <Link
            href={href}
            className="shrink-0 rounded-md bg-brand-emerald px-3 py-1.5 text-sm text-white transition hover:bg-brand-amber"
          >
            View store
          </Link>
        </div>
      </div>
    </article>
  )
}
