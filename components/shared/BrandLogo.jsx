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
export default function BrandLogo({ href = '/', badge, className = '' }) {
  return (
    <Link
      href={href}
      aria-label="CraftHand Market home"
      className={`relative inline-flex items-center gap-2 font-[family-name:var(--font-display)] text-xl tracking-tight sm:text-2xl ${className}`}
    >
      <span className="leading-none">
        <span className="text-brand-terracotta">Craft</span>
        <span className="text-brand-slate">Hand</span>
        {' '}
        <span className="text-brand-forest">Market</span>
      </span>
      {badge ? (
        <span
          className={`px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${badgeStyles[badge] || badgeStyles.plus}`}
        >
          {badgeLabels[badge] || badge}
        </span>
      ) : null}
    </Link>
  )
}
