'use client'
import { dummyStoreDashboardData } from "@/assets/assets"
import Loading from "@/components/shared/Loading"
import { useCurrency } from "@/components/shared/CurrencyProvider"
import { getActiveStore } from "@/lib/storeRegistry"
import { getStoreDashboardStats } from "@/lib/productCatalog"
import { formatProductTitle } from "@/lib/productCodes"
import {
  CircleDollarSignIcon,
  ClapperboardIcon,
  PackageIcon,
  ShoppingBasketIcon,
  SquarePlusIcon,
  StarIcon,
  TagsIcon,
} from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

export default function Dashboard() {
  const { currency: currencyInfo } = useCurrency()
  const currency = currencyInfo.symbol
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [store, setStore] = useState(null)
  const [dashboardData, setDashboardData] = useState({
    totalProducts: 0,
    inStock: 0,
    withVideo: 0,
    totalEarnings: 0,
    totalOrders: 0,
    ratings: [],
    recentProducts: [],
  })

  const fetchDashboardData = async () => {
    const active = getActiveStore()
    const stats = getStoreDashboardStats()
    const hasOwnCatalog = stats.totalProducts > 0

    setStore(active)
    setDashboardData({
      totalProducts: hasOwnCatalog ? stats.totalProducts : dummyStoreDashboardData.totalProducts,
      inStock: hasOwnCatalog ? stats.inStock : dummyStoreDashboardData.totalProducts,
      withVideo: stats.withVideo,
      totalEarnings: hasOwnCatalog ? 0 : dummyStoreDashboardData.totalEarnings,
      totalOrders: hasOwnCatalog ? 0 : dummyStoreDashboardData.totalOrders,
      ratings: hasOwnCatalog ? stats.ratings : dummyStoreDashboardData.ratings,
      recentProducts: stats.recentProducts,
      usingSample: !hasOwnCatalog,
    })
    setLoading(false)
  }

  useEffect(() => {
    fetchDashboardData()
  }, [])

  if (loading) return <Loading />

  const cards = [
    {
      title: "Workshop pieces",
      value: dashboardData.totalProducts,
      icon: ShoppingBasketIcon,
    },
    {
      title: "In stock",
      value: dashboardData.inStock,
      icon: PackageIcon,
    },
    {
      title: "With video",
      value: dashboardData.withVideo,
      icon: ClapperboardIcon,
    },
    {
      title: "Orders",
      value: dashboardData.totalOrders,
      icon: TagsIcon,
    },
    {
      title: "Earnings",
      value: `${currency}${dashboardData.totalEarnings}`,
      icon: CircleDollarSignIcon,
    },
    {
      title: "Ratings",
      value: dashboardData.ratings.length,
      icon: StarIcon,
    },
  ]

  return (
    <div className="text-slate-500 mb-28">
      <div className="flex flex-col gap-3 max-w-5xl">
        <p className="text-xs uppercase tracking-[0.2em] text-brand-gold">Artisan studio</p>
        <h1 className="text-3xl text-slate-800 font-medium">
          {store?.name || "Seller"} dashboard
        </h1>
        <p className="max-w-2xl text-sm leading-6">
          Manage your Kerala workshop listings, upload craft photos and process videos to
          Cloudflare R2, and keep stock ready for Crafthand Market shoppers.
        </p>
      </div>

      <div className="flex flex-wrap gap-3 mt-6">
        <Link
          href="/store/add-product"
          className="inline-flex items-center gap-2 bg-brand-emerald text-white px-4 py-2.5 rounded-md text-sm hover:bg-brand-amber transition"
        >
          <SquarePlusIcon size={16} /> Add product + video
        </Link>
        <Link
          href="/store/manage-product"
          className="inline-flex items-center gap-2 border border-brand-emerald/30 text-brand-emerald px-4 py-2.5 rounded-md text-sm hover:bg-brand-emerald-soft transition"
        >
          Manage catalog
        </Link>
        <Link
          href="/store/orders"
          className="inline-flex items-center gap-2 border border-slate-200 text-slate-600 px-4 py-2.5 rounded-md text-sm hover:bg-white transition"
        >
          View orders
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 my-8 max-w-5xl">
        {cards.map((card) => (
          <div
            key={card.title}
            className="flex items-center justify-between gap-4 border border-brand-gold/15 bg-white/70 p-4 px-5 rounded-xl"
          >
            <div className="flex flex-col gap-2 text-xs">
              <p>{card.title}</p>
              <b className="text-2xl font-medium text-slate-700">{card.value}</b>
            </div>
            <card.icon
              size={44}
              className="w-11 h-11 p-2.5 text-brand-emerald bg-brand-emerald-soft rounded-full"
            />
          </div>
        ))}
      </div>

      {dashboardData.usingSample && (
        <p className="text-sm text-slate-500 mb-6 max-w-3xl">
          Showing sample market stats until you add your first workshop product.
        </p>
      )}

      <section className="max-w-5xl mb-12">
        <div className="flex items-end justify-between gap-3 mb-4">
          <div>
            <h2 className="text-slate-800 font-medium text-lg">Recent workshop pieces</h2>
            <p className="text-sm mt-1">Photos and craft videos saved for your storefront.</p>
          </div>
          <Link href="/store/add-product" className="text-sm text-brand-emerald hover:underline">
            Add another
          </Link>
        </div>

        {dashboardData.recentProducts?.length ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {dashboardData.recentProducts.map((product) => (
              <article
                key={product.id}
                className="border border-slate-200 bg-white/80 rounded-xl overflow-hidden"
              >
                <div className="relative aspect-[4/3] bg-slate-100">
                  {product.images?.[0] ? (
                    <Image
                      src={product.images[0]}
                      alt={product.name}
                      fill
                      className="object-cover"
                    />
                  ) : null}
                  {product.video ? (
                    <span className="absolute left-3 top-3 text-[11px] uppercase tracking-wide bg-brand-ink/80 text-white px-2 py-1 rounded">
                      Video
                    </span>
                  ) : null}
                </div>
                <div className="p-4">
                  <p className="text-xs text-brand-gold mb-1">{product.category}</p>
                  <h3 className="text-slate-800 font-medium">{formatProductTitle(product)}</h3>
                  <p className="text-sm mt-1 line-clamp-2">{product.description}</p>
                  <div className="flex items-center justify-between mt-3 text-sm">
                    <span className="text-slate-700 font-medium">
                      {currency}
                      {Number(product.price).toLocaleString()}
                    </span>
                    <span className={product.inStock ? "text-brand-emerald" : "text-slate-400"}>
                      {product.inStock ? "In stock" : "Hidden"}
                    </span>
                  </div>
                  {product.video ? (
                    <video
                      src={product.video}
                      controls
                      className="mt-3 w-full rounded-lg max-h-40 bg-black"
                    />
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="border border-dashed border-brand-gold/30 rounded-xl p-8 bg-brand-amber-soft/40">
            <h3 className="text-slate-800 font-medium">No products yet</h3>
            <p className="text-sm mt-2 max-w-md">
              Add your first piece with workshop photos and an optional making-of video. Media is
              stored in your Cloudflare R2 bucket.
            </p>
            <Link
              href="/store/add-product"
              className="inline-flex mt-4 text-sm text-white bg-brand-amber px-4 py-2 rounded-md"
            >
              Add product
            </Link>
          </div>
        )}
      </section>

      <h2 className="text-slate-800 font-medium text-lg">Customer reviews</h2>
      <div className="mt-5">
        {dashboardData.ratings.length ? (
          dashboardData.ratings.map((review, index) => (
            <div
              key={`${review.product?.id || "review"}-${index}`}
              className="flex max-sm:flex-col gap-5 sm:items-center justify-between py-6 border-b border-slate-200 text-sm text-slate-600 max-w-4xl"
            >
              <div>
                <div className="flex gap-3">
                  {review.user?.image ? (
                    <Image
                      src={review.user.image}
                      alt=""
                      className="w-10 aspect-square rounded-full"
                      width={100}
                      height={100}
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-brand-emerald-soft" />
                  )}
                  <div>
                    <p className="font-medium">{review.user?.name || "Customer"}</p>
                    <p className="font-light text-slate-500">
                      {review.createdAt
                        ? new Date(review.createdAt).toDateString()
                        : "Recent review"}
                    </p>
                  </div>
                </div>
                <p className="mt-3 text-slate-500 max-w-xs leading-6">
                  {review.review || "Loved this handmade piece."}
                </p>
              </div>
              <div className="flex flex-col justify-between gap-6 sm:items-end">
                <div className="flex flex-col sm:items-end">
                  <p className="text-slate-400">{review.product?.category}</p>
                  <p className="font-medium">
                    {review.product ? formatProductTitle(review.product) : ""}
                  </p>
                  <div className="flex items-center">
                    {Array(5)
                      .fill("")
                      .map((_, starIndex) => (
                        <StarIcon
                          key={starIndex}
                          size={17}
                          className="text-transparent mt-0.5"
                          fill={review.rating >= starIndex + 1 ? "#047857" : "#D1D5DB"}
                        />
                      ))}
                  </div>
                </div>
                {review.product?.id ? (
                  <button
                    onClick={() => router.push(`/product/${review.product.id}`)}
                    className="bg-slate-100 px-5 py-2 hover:bg-slate-200 rounded transition-all"
                  >
                    View Product
                  </button>
                ) : null}
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm text-slate-400 mt-3">No reviews on your workshop pieces yet.</p>
        )}
      </div>
    </div>
  )
}
