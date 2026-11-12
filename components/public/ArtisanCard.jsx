'use client'

import Image from "next/image"
import Link from "next/link"

export default function ArtisanCard({ artisan }) {
  const logo = artisan.logoUrl || artisan.logo
  const href = artisan.username ? `/shop/${artisan.username}` : "/shop"

  return (
    <article className="border border-brand-gold/20 bg-white/80 rounded-2xl overflow-hidden hover:border-brand-emerald/40 transition">
      <div className="relative aspect-[4/3] bg-brand-amber-soft/40">
        {typeof logo === "string" && logo ? (
          <Image
            src={logo}
            alt={artisan.name}
            fill
            className="object-cover"
            unoptimized={logo.startsWith("data:")}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-brand-gold text-sm">
            No logo yet
          </div>
        )}
        <span className="absolute left-3 top-3 text-[11px] uppercase tracking-wide bg-brand-ink/80 text-white px-2 py-1 rounded">
          {artisan.artisanCode}
        </span>
        {artisan.source === "r2" ? (
          <span className="absolute right-3 top-3 text-[11px] uppercase tracking-wide bg-brand-emerald text-white px-2 py-1 rounded">
            R2
          </span>
        ) : null}
      </div>
      <div className="p-4">
        <p className="text-xs text-brand-gold">@{artisan.username || "workshop"}</p>
        <h3 className="text-slate-800 font-medium mt-1">{artisan.name}</h3>
        <p className="text-sm mt-2 line-clamp-3 text-slate-500">{artisan.description}</p>
        <div className="flex items-center justify-between mt-4 gap-2">
          <p className="text-xs text-slate-400 truncate">{artisan.address}</p>
          <Link
            href={href}
            className="shrink-0 text-sm text-white bg-brand-emerald px-3 py-1.5 rounded-md hover:bg-brand-amber transition"
          >
            View store
          </Link>
        </div>
      </div>
    </article>
  )
}
