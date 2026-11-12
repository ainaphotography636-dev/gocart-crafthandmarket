'use client'

import { useEffect, useState } from "react"
import Loading from "@/components/shared/Loading"
import ArtisanCard from "@/components/public/ArtisanCard"
import { fetchArtisanDirectory } from "@/lib/artisanDirectory"
import Link from "next/link"

export default function ArtisansPage() {
  const [loading, setLoading] = useState(true)
  const [artisans, setArtisans] = useState([])
  const [meta, setMeta] = useState({ source: "local", r2Configured: false, r2Count: 0 })

  useEffect(() => {
    let alive = true
    ;(async () => {
      const result = await fetchArtisanDirectory()
      if (!alive) return
      setArtisans(result.artisans || [])
      setMeta({
        source: result.source,
        r2Configured: result.r2Configured,
        r2Count: result.r2Count || 0,
      })
      setLoading(false)
    })()
    return () => {
      alive = false
    }
  }, [])

  if (loading) return <Loading />

  return (
    <div className="mx-6 my-12 max-w-7xl mx-auto mb-28">
      <p className="text-xs uppercase tracking-[0.2em] text-brand-gold">Workshops</p>
      <h1 className="text-3xl mt-2 text-slate-800 font-medium">Artisan profiles & stores</h1>
      <p className="text-sm mt-3 max-w-2xl text-slate-500">
        Browse every Crafthand Market workshop. Profiles synced to Cloudflare R2 appear with an R2
        badge; local and demo stores fill the directory until the bucket is fully connected.
      </p>
      <p className="text-xs mt-3 text-slate-400">
        Source: {meta.source}
        {meta.r2Configured ? ` · ${meta.r2Count} profile(s) from R2` : " · R2 not configured"}
      </p>

      <div className="flex flex-wrap gap-3 mt-6">
        <Link
          href="/create-store"
          className="text-sm bg-brand-emerald text-white px-4 py-2 rounded-md hover:bg-brand-amber transition"
        >
          Register your workshop
        </Link>
        <Link
          href="/shop"
          className="text-sm border border-brand-emerald/30 text-brand-emerald px-4 py-2 rounded-md"
        >
          Browse products
        </Link>
      </div>

      {artisans.length ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-10">
          {artisans.map((artisan) => (
            <ArtisanCard key={`${artisan.artisanCode}-${artisan.id}`} artisan={artisan} />
          ))}
        </div>
      ) : (
        <div className="mt-16 border border-dashed border-brand-gold/30 rounded-2xl p-10 text-center">
          <h2 className="text-slate-800 font-medium text-xl">No artisan profiles yet</h2>
          <p className="text-sm mt-2 text-slate-500">
            Approve a workshop or sync profiles to your Cloudflare R2 `artisans/` folder.
          </p>
        </div>
      )}
    </div>
  )
}
