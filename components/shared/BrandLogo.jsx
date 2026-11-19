'use client'
import Link from 'next/link'

const badgeStyles = {
  plus: 'bg-brand-terracotta text-white',
  admin: 'bg-brand-amber text-white',
  store: 'bg-brand-forest text-white',
}

const badgeLabels = {
  plus: 'Plus',
  admin: 'Admin',
  store: 'Artisan Portal',
}

/**
 * CraftHand Market brand mark — colors sampled from the logo:
 * Craft #C85A32 · Hand #1E293B · Market #0F766E
 */
export default function BrandLogo({ href = '/', badge, className = '', compact = false }) {
  return (
    <Link
      href={href}
      aria-label="CraftHand Market home"
      className={`relative inline-flex items-center gap-2.5 ${className}`}
    >
      <span
        aria-hidden
        className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#3a2a22] to-brand-slate text-base font-bold text-white sm:size-10 sm:text-lg"
      >
        C
      </span>
      <span className={`flex flex-col leading-none ${compact ? 'gap-0.5' : 'gap-1'}`}>
        <span className="text-lg font-bold tracking-tight sm:text-xl">
          <span className="text-brand-terracotta">Craft</span>
          <span className="text-brand-slate">hand</span>
        </span>
        <span className="text-[10px] font-semibold uppercase tracking-[0.28em] text-brand-forest">
          Market
        </span>
      </span>
      {badge ? (
        <span
          className={`ml-1 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${badgeStyles[badge] || badgeStyles.plus}`}
        >
          {badgeLabels[badge] || badge}
        </span>
      ) : null}
    </Link>
  )
}
