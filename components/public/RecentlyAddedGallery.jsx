'use client'

import Link from 'next/link'
import Title from './Title'
import SafeImage from '@/components/shared/SafeImage'
import { useCurrency } from '@/components/shared/CurrencyProvider'
import { formatProductTitle } from '@/lib/productCodes'

function stockLabel(product) {
  const qty = Number(product?.specs?.stockQuantity)
  if (Number.isFinite(qty) && qty >= 0) {
    if (qty === 0) return 'Out of stock'
    return `${qty} in stock`
  }
  return product?.inStock ? 'In stock' : 'Out of stock'
}

function GalleryCard({ product }) {
  const { currency } = useCurrency()
  const currencySymbol = currency.symbol
  const image =
    Array.isArray(product?.images) && product.images[0] ? product.images[0] : null
  const material = String(product?.material || '').trim()
  const dimensions = String(product?.dimensions || '').trim()
  const inStock = Boolean(product?.inStock)
  const stockText = stockLabel(product)

  return (
    <Link
      href={`/product/${product.id}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm transition hover:border-brand-emerald/40 hover:shadow-md"
    >
      <div className="relative flex h-44 items-center justify-center overflow-hidden bg-[#F5F5F5] sm:h-52">
        <SafeImage
          width={500}
          height={500}
          className="max-h-36 w-auto object-contain transition duration-300 group-hover:scale-105 sm:max-h-44"
          src={image}
          alt={formatProductTitle(product)}
        />
        {product.category ? (
          <span className="absolute left-2.5 top-2.5 rounded-md bg-white/90 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-600">
            {product.category}
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-3.5 sm:p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-medium leading-snug text-slate-800 line-clamp-2">
            {formatProductTitle(product)}
          </h3>
          <p className="shrink-0 text-sm font-semibold text-slate-900">
            {currencySymbol}
            {Number(product.price || 0).toLocaleString()}
          </p>
        </div>

        <p
          className={`text-xs font-medium ${
            inStock ? 'text-brand-emerald' : 'text-slate-400'
          }`}
        >
          {stockText}
        </p>

        <dl className="mt-auto space-y-1 border-t border-slate-100 pt-2 text-xs text-slate-500">
          <div className="flex justify-between gap-2">
            <dt className="text-slate-400">Material</dt>
            <dd className="truncate text-right text-slate-700">
              {material || '—'}
            </dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-slate-400">Dimensions</dt>
            <dd className="truncate text-right text-slate-700">
              {dimensions || '—'}
            </dd>
          </div>
        </dl>

        {product.artisanName ? (
          <p className="text-[11px] text-slate-400">by {product.artisanName}</p>
        ) : null}
      </div>
    </Link>
  )
}

export default function RecentlyAddedGallery({ products = [] }) {
  const items = Array.isArray(products) ? products : []
  const count = items.length

  return (
    <section className="mx-auto my-16 max-w-6xl px-6 sm:my-20">
      <Title
        title="Recently Added"
        description={
          count
            ? `Fresh workshop pieces — showing ${count} latest listing${count === 1 ? '' : 's'}`
            : 'Published handicrafts from verified workshops will appear here'
        }
        href="/shop"
        visibleButton={count > 0}
      />

      {count === 0 ? (
        <div className="mt-10 rounded-xl border border-dashed border-slate-200 bg-slate-50/80 px-6 py-12 text-center">
          <p className="text-sm text-slate-600">
            No storefront pieces yet. Sign in, open Add Product, upload 4+ photos,
            then click <span className="font-medium text-slate-800">Publish Piece</span> —
            your workshop and product will appear here.
          </p>
          <Link
            href="/store/add-product"
            className="mt-4 inline-flex text-sm font-medium text-brand-emerald hover:text-brand-amber"
          >
            Add a product
          </Link>
        </div>
      ) : (
        <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((product) => (
            <GalleryCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </section>
  )
}
