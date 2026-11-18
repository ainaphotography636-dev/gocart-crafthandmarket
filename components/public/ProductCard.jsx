'use client'

import Link from 'next/link'
import SafeImage from '@/components/shared/SafeImage'
import { useCurrency } from '@/components/shared/CurrencyProvider'
import { formatProductTitle } from '@/lib/productCodes'
import { getProductThumbnailUrl, getProductVideoUrl } from '@/lib/marketplace/media'

function formatPrice(value, currency) {
  const amount = Number(value) || 0
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currency?.code || 'INR',
      maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
    }).format(amount)
  } catch {
    return `${currency?.symbol || '₹'}${amount.toLocaleString()}`
  }
}

function metaValue(value, fallback = '—') {
  const text = String(value || '').trim()
  return text || fallback
}

const ProductCard = ({ product }) => {
  const { currency } = useCurrency()
  const image = getProductThumbnailUrl(product)
  const title = formatProductTitle(product)
  const origin = metaValue(
    product?.regionOrigin || product?.region_origin || product?.artisanRegion
  )
  const dimensions = metaValue(product?.dimensions)
  const weight = metaValue(product?.weight)
  const hasVideo = Boolean(getProductVideoUrl(product) || product?.video)
  const inStock = product?.inStock !== false

  return (
    <article className="group flex h-full flex-col bg-white">
      <Link
        href={`/product/${product.id}`}
        className="relative block aspect-[4/3] overflow-hidden bg-[#efeae3]"
      >
        <SafeImage
          width={640}
          height={480}
          className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
          src={image}
          alt={title}
        />
      </Link>

      <div className="flex flex-1 flex-col px-1 pt-4 pb-1">
        <h3 className="font-[family-name:var(--font-display)] text-lg leading-snug text-brand-forest line-clamp-2 sm:text-xl">
          <Link href={`/product/${product.id}`} className="hover:text-brand-terracotta transition">
            {title}
          </Link>
        </h3>

        <div className="mt-3 flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-brand-terracotta">
            {formatPrice(product.price, currency)}
          </p>
          <Link
            href={`/product/${product.id}`}
            className="shrink-0 border border-brand-forest/25 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-brand-forest transition hover:border-brand-terracotta hover:text-brand-terracotta"
          >
            Buy Now
          </Link>
        </div>

        {!inStock ? (
          <p className="mt-2 text-[11px] font-medium uppercase tracking-wide text-slate-400">
            Out of stock
          </p>
        ) : null}

        {/* Specs only — no product description on catalog cards */}
        <dl className="mt-4 grid grid-cols-2 border border-brand-forest/10 text-[11px]">
          <div className="border-b border-r border-brand-forest/10 px-2.5 py-2">
            <dt className="uppercase tracking-[0.12em] text-slate-400">Origin</dt>
            <dd className="mt-0.5 truncate font-medium text-brand-forest">{origin}</dd>
          </div>
          <div className="border-b border-brand-forest/10 px-2.5 py-2">
            <dt className="uppercase tracking-[0.12em] text-slate-400">Dimensions</dt>
            <dd className="mt-0.5 truncate font-medium text-brand-forest">{dimensions}</dd>
          </div>
          <div className="border-r border-brand-forest/10 px-2.5 py-2">
            <dt className="uppercase tracking-[0.12em] text-slate-400">Weight</dt>
            <dd className="mt-0.5 truncate font-medium text-brand-forest">{weight}</dd>
          </div>
          <div className="px-2.5 py-2">
            <dt className="uppercase tracking-[0.12em] text-slate-400">Verification</dt>
            <dd className="mt-0.5 truncate font-medium text-brand-forest">
              {hasVideo ? 'Video Confirmed' : 'Workshop Coded'}
            </dd>
          </div>
        </dl>

        <Link
          href={`/product/${product.id}`}
          className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-brand-terracotta transition hover:gap-1.5"
        >
          View Product Details
          <span aria-hidden>›</span>
        </Link>
      </div>
    </article>
  )
}

export default ProductCard
