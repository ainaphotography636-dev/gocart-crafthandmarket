'use client'
import Link from 'next/link'

const badgeStyles = {
  plus: 'bg-brand-gold text-white',
  admin: 'bg-brand-amber text-white',
  store: 'bg-brand-emerald text-white',
}

/**
 * Crafthand Market brand mark — shared across public, store, and admin shells.
 */
export default function BrandLogo({ href = '/', badge, className = '' }) {
  return (
    <Link
      href={href}
      aria-label="Crafthand Market home"
      className={`relative inline-flex items-center gap-2 text-xl sm:text-2xl font-semibold tracking-tight text-slate-800 ${className}`}
    >
      <span className="leading-none">
        <span className="text-brand-amber">Craft</span>
        <span className="text-slate-800">hand</span>
        {' '}
        <span className="text-brand-emerald">Market</span>
      </span>
      {badge ? (
        <span
          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${badgeStyles[badge] || badgeStyles.plus}`}
        >
          {badge}
        </span>
      ) : null}
    </Link>
  )
}
