import Link from "next/link"
import ArtisanCard from "@/components/public/ArtisanCard"
import { listStorefrontArtisans } from "@/lib/marketplace/catalog"

export default async function ArtisansPage() {
  const { items: artisans, source, error } = await listStorefrontArtisans()

  return (
    <div className="mx-6 my-12 mx-auto mb-28 max-w-7xl">
      <p className="text-xs uppercase tracking-[0.2em] text-brand-gold">Workshops</p>
      <h1 className="mt-2 text-3xl font-medium text-slate-800">
        Artisan profiles & stores
      </h1>
      <p className="mt-3 max-w-2xl text-sm text-slate-500">
        Browse verified Crafthand Market workshops. Logos and product media are
        served from Cloudflare R2; listings come from the Supabase marketplace
        catalog.
      </p>
      <p className="mt-3 text-xs text-slate-400">
        Source: {source}
        {error ? ` · ${error}` : ` · ${artisans.length} verified workshop(s)`}
      </p>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          href="/artisan/join"
          className="rounded-md bg-brand-emerald px-4 py-2 text-sm text-white transition hover:bg-brand-amber"
        >
          Become an Artisan
        </Link>
        <Link
          href="/shop"
          className="rounded-md border border-brand-emerald/30 px-4 py-2 text-sm text-brand-emerald"
        >
          Browse products
        </Link>
      </div>

      <div className="mt-6">
        <Link href="/store/login" className="text-sm text-brand-emerald hover:underline">
          Already approved? Enter your workshop dashboard →
        </Link>
      </div>

      {artisans.length ? (
        <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {artisans.map((artisan) => (
            <ArtisanCard
              key={`${artisan.artisanCode}-${artisan.id}`}
              artisan={artisan}
            />
          ))}
        </div>
      ) : (
        <div className="mt-16 rounded-2xl border border-dashed border-brand-gold/30 p-10 text-center">
          <h2 className="text-xl font-medium text-slate-800">
            No verified artisan profiles yet
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            Approve a workshop in Supabase (`verification_status = verified`,
            `is_active = true`) to list it here.
          </p>
        </div>
      )}
    </div>
  )
}
