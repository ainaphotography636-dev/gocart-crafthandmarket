'use client'

import Link from 'next/link'
import { Lock } from 'lucide-react'
import SafeImage from '@/components/shared/SafeImage'
import { useCurrency } from '@/components/shared/CurrencyProvider'
import { formatProductTitle } from '@/lib/productCodes'
import { getProductThumbnailUrl } from '@/lib/marketplace/media'

function formatPrice(value, currency) {
  const amount = Number(value) || 0
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency?.code || 'INR',
      maximumFractionDigits: 0,
    }).format(amount)
  } catch {
    return `${currency?.symbol || '₹'}${amount.toLocaleString('en-IN')}`
  }
}

function meta(value, fallback = '—') {
  const text = String(value || '').trim()
  return text || fallback
}

function stockBadge(product) {
  if (product?.specs?.series) return String(product.specs.series)
  const qty = Number(product?.specs?.stockQuantity)
  if (Number.isFinite(qty) && qty > 0 && qty <= 3) return 'Limited Series'
  if (product?.inStock === false || qty === 0) return 'Waitlist'
  if (product?.giTag) return 'Ready to Ship'
  return 'In Stock'
}

function accentBadge(product) {
  if (product?.specs?.badge) return String(product.specs.badge)
  if (product?.giTag) {
    const tag = String(product.giTag)
    return /kannadi|gi|handloom|saree/i.test(tag)
      ? tag.toUpperCase().includes('GI')
        ? 'GI-TAG CERTIFIED'
        : `${tag.toUpperCase()}`
      : tag.toUpperCase()
  }
  if (product?.material) return String(product.material).toUpperCase()
  if (product?.category) return String(product.category).toUpperCase()
  return 'WORKSHOP CODED'
}

function shortDescription(product) {
  const raw = String(product?.description || '').trim()
  if (raw) return raw
  const bits = [
    product?.material ? `${product.material}` : null,
    product?.craftTechnique ? `${product.craftTechnique}` : null,
    product?.regionOrigin || product?.region_origin
      ? `from ${product.regionOrigin || product.region_origin}`
      : null,
  ].filter(Boolean)
  if (bits.length) {
    return `A collector piece in ${bits.join(' · ')}, coded to its verified workshop.`
  }
  return 'Authenticated handicraft with workshop coding and collector-grade finish.'
}

export default function LuxuryProductCard({ product }) {
  const { currency } = useCurrency()
  const image = getProductThumbnailUrl(product)
  const title = formatProductTitle(product)
  const displayName = String(
    product?.specs?.displayName ||
      product?.name ||
      product?.title ||
      title
  ).trim()
  const category = meta(product?.category, 'Handicraft')
  const technique = meta(product?.craftTechnique || product?.giTag, 'Heritage craft')
  const origin = meta(product?.regionOrigin || product?.region_origin)
  const dimensions = meta(product?.dimensions)
  const weight = meta(product?.weight)
  const breadcrumb = `${category.toUpperCase()} › ${technique.toUpperCase()}`

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-xl bg-white shadow-[0_10px_28px_-20px_rgba(30,41,59,0.4)] ring-1 ring-slate-200/70">
      <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden bg-[#f3ebe4]">
        {image ? (
          <SafeImage
            width={560}
            height={420}
            className="absolute inset-0 h-full w-full object-cover"
            src={image}
            alt={title}
          />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-t from-[#f3ebe4]/90 via-[#f3ebe4]/20 to-transparent" />
        <span className="absolute left-2 top-2 max-w-[48%] truncate rounded-full bg-brand-slate px-2 py-0.5 text-[8px] font-semibold uppercase tracking-[0.1em] text-[#e8c87a]">
          {accentBadge(product)}
        </span>
        <span className="absolute right-2 top-2 rounded-full bg-white px-2 py-0.5 text-[8px] font-semibold uppercase tracking-[0.06em] text-brand-slate shadow-sm">
          {stockBadge(product)}
        </span>
        <p className="relative z-10 max-w-[90%] px-3 text-center font-[family-name:var(--font-display)] text-lg leading-tight text-brand-terracotta sm:text-xl">
          {displayName}
        </p>
      </div>

      <div className="flex flex-1 flex-col px-3.5 pb-3.5 pt-3">
        <p className="truncate text-[9px] font-semibold uppercase tracking-[0.12em] text-brand-terracotta">
          {breadcrumb}
        </p>
        <h3 className="mt-1.5 text-sm font-bold leading-snug text-brand-slate line-clamp-2">
          <Link href={`/product/${product.id}`} className="hover:text-brand-terracotta transition">
            {title}
          </Link>
        </h3>
        <p className="mt-1.5 text-xs leading-relaxed text-slate-500 line-clamp-2">
          {shortDescription(product)}
        </p>

        <dl className="mt-3 grid grid-cols-2 gap-x-2 gap-y-1 border-t border-slate-100 pt-2 text-[10px]">
          <div className="truncate">
            <dt className="inline font-semibold text-brand-slate">Technique: </dt>
            <dd className="inline text-slate-500">{technique}</dd>
          </div>
          <div className="truncate">
            <dt className="inline font-semibold text-brand-slate">Origin: </dt>
            <dd className="inline text-slate-500">{origin}</dd>
          </div>
          <div className="truncate">
            <dt className="inline font-semibold text-brand-slate">Dimensions: </dt>
            <dd className="inline text-slate-500">{dimensions}</dd>
          </div>
          <div className="truncate">
            <dt className="inline font-semibold text-brand-slate">Weight: </dt>
            <dd className="inline text-slate-500">{weight}</dd>
          </div>
        </dl>

        <div className="mt-auto flex items-end justify-between gap-2 pt-3">
          <div className="min-w-0">
            <p className="text-[9px] font-medium uppercase tracking-[0.12em] text-slate-400">
              Collector Price
            </p>
            <p className="mt-0.5 truncate text-base font-bold text-brand-slate">
              {formatPrice(product.price, currency)}
            </p>
          </div>
          <Link
            href={`/product/${product.id}`}
            className="inline-flex shrink-0 items-center gap-1 rounded-md bg-brand-slate px-2.5 py-2 text-[9px] font-semibold uppercase tracking-[0.1em] text-white transition hover:bg-brand-terracotta"
          >
            <Lock size={11} />
            Secure Piece
          </Link>
        </div>
      </div>
    </article>
  )
}
