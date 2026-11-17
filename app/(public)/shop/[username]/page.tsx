import Link from "next/link"
import { MailIcon, MapPinIcon } from "lucide-react"
import { notFound } from "next/navigation"
import CatalogHydrator from "@/components/marketplace/CatalogHydrator"
import ProductCard from "@/components/public/ProductCard"
import SafeImage from "@/components/shared/SafeImage"
import { getArtisanStorefrontByUsername } from "@/lib/marketplace/catalog"

type Params = Promise<{ username: string }>

export default async function ArtisanShopPage({
  params,
}: {
  params: Params
}) {
  const { username } = await params
  const { store, source, error } = await getArtisanStorefrontByUsername(username)

  if (!store) {
    if (source === "unavailable") {
      return (
        <div className="mx-6 my-20 text-center">
          <h1 className="text-2xl text-slate-800">Storefront unavailable</h1>
          <p className="mt-2 text-sm text-slate-500">
            Configure Supabase to load artisan workshops.
          </p>
        </div>
      )
    }
    if (error) {
      return (
        <div className="mx-6 my-20 text-center">
          <h1 className="text-2xl text-slate-800">Could not load this workshop</h1>
          <p className="mt-2 text-sm text-slate-500">{error}</p>
        </div>
      )
    }
    notFound()
  }

  const { artisan, products } = store

  return (
    <div className="mx-6 min-h-[70vh]">
      <CatalogHydrator products={products} />

      <div className="mx-auto mt-6 flex max-w-7xl flex-col items-center gap-6 rounded-xl bg-slate-50 p-6 shadow-xs md:flex-row md:p-10">
        <div className="relative size-32 overflow-hidden rounded-md border-2 border-slate-100 sm:size-38">
          <SafeImage
            src={artisan.logoUrl}
            alt={artisan.name}
            fill
            className="object-cover"
          />
        </div>
        <div className="text-center md:text-left">
          <p className="text-xs uppercase tracking-[0.16em] text-brand-gold">
            {artisan.artisanCode}
          </p>
          <h1 className="mt-1 text-3xl font-semibold text-slate-800">
            {artisan.name}
          </h1>
          <p className="mt-2 max-w-lg text-sm text-slate-600">
            {artisan.description || "An independent maker on Crafthand Market."}
          </p>
          <div className="mt-4 space-y-2 text-sm text-slate-500">
            {artisan.address || artisan.region ? (
              <div className="flex items-center justify-center md:justify-start">
                <MapPinIcon className="mr-2 h-4 w-4 text-gray-500" />
                <span>{artisan.address || artisan.region}</span>
              </div>
            ) : null}
            <div className="flex items-center justify-center md:justify-start">
              <MailIcon className="mr-2 h-4 w-4 text-gray-500" />
              <span>@{artisan.username}</span>
            </div>
          </div>
          {artisan.giTags?.length ? (
            <div className="mt-4 flex flex-wrap justify-center gap-2 md:justify-start">
              {artisan.giTags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-brand-emerald-soft px-2.5 py-1 text-xs text-brand-emerald"
                >
                  {tag}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <div className="mx-auto mb-40 max-w-7xl">
        <div className="mt-12 flex items-end justify-between gap-3">
          <h2 className="text-2xl text-slate-500">
            Shop <span className="font-medium text-slate-800">Products</span>
          </h2>
          <Link href="/shop" className="text-sm text-brand-emerald hover:underline">
            Back to market
          </Link>
        </div>

        {products.length ? (
          <div className="mx-auto mt-5 grid grid-cols-2 gap-6 sm:flex sm:flex-wrap xl:gap-12">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="mt-8 rounded-2xl border border-dashed border-brand-gold/30 p-8 text-center text-sm text-slate-500">
            This workshop has no published products yet.
          </div>
        )}
      </div>
    </div>
  )
}
