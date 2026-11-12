'use client'
import StoreInfo from "@/components/admin/StoreInfo"
import Loading from "@/components/shared/Loading"
import { useEffect, useMemo, useState } from "react"
import toast from "react-hot-toast"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  enterArtisanSession,
  listLiveStores,
  listStores,
  toggleStoreActive,
} from "@/lib/storeRegistry"
import { fetchArtisanDirectory, syncArtisanToR2 } from "@/lib/artisanDirectory"

function isApprovedArtisan(artisan) {
  if (!artisan) return false
  if (artisan.source === "demo") return false
  if (artisan.status && artisan.status !== "approved") return false
  if (artisan.isActive === false) return false
  return true
}

export default function AdminStores() {
  const router = useRouter()
  const [stores, setStores] = useState([])
  const [artisans, setArtisans] = useState([])
  const [meta, setMeta] = useState({ r2Configured: false, r2Count: 0, source: "local" })
  const [loading, setLoading] = useState(true)
  const [syncingId, setSyncingId] = useState("")

  const fetchStores = async () => {
    const live = listLiveStores()
    const allApproved = listStores().filter((store) => store.status === "approved")
    setStores(live.length ? live : allApproved)

    const directory = await fetchArtisanDirectory()
    setArtisans(directory.artisans || [])
    setMeta({
      r2Configured: directory.r2Configured,
      r2Count: directory.r2Count || 0,
      source: directory.source,
    })
    setLoading(false)
  }

  const approvedDirectory = useMemo(
    () => artisans.filter(isApprovedArtisan),
    [artisans]
  )

  // Merge local approved stores with directory-approved profiles for the Live section.
  const liveApproved = useMemo(() => {
    const byKey = new Map()
    stores.forEach((store) => {
      byKey.set(store.artisanCode || store.username || store.id, {
        ...store,
        source: "local",
      })
    })
    approvedDirectory.forEach((artisan) => {
      const key = artisan.artisanCode || artisan.username || artisan.id
      if (!byKey.has(key)) {
        byKey.set(key, artisan)
      }
    })
    return [...byKey.values()].sort((a, b) =>
      String(a.name || "").localeCompare(String(b.name || ""))
    )
  }, [stores, approvedDirectory])

  const toggleIsActive = async (storeId) => {
    const current = stores.find((store) => store.id === storeId)
    if (!current) {
      throw new Error("Activate/toggle is only available for locally registered stores.")
    }
    const updated = toggleStoreActive(storeId, !current?.isActive)
    if (!updated) throw new Error("Store not found")
    if (updated.isActive) {
      try {
        await syncArtisanToR2(updated)
      } catch {
        // Keep activation even if R2 sync fails.
      }
    }
    await fetchStores()
    return updated
  }

  const syncOne = async (store) => {
    setSyncingId(store.id || store.artisanCode)
    try {
      await syncArtisanToR2(store)
      toast.success(`${store.name} synced to Cloudflare R2`)
      await fetchStores()
    } catch (error) {
      toast.error(error?.message || "R2 sync failed")
    } finally {
      setSyncingId("")
    }
  }

  const syncAll = async () => {
    const targets = liveApproved.length
      ? liveApproved
      : artisans.filter((a) => a.source !== "demo")
    if (!targets.length) {
      toast.error("No artisan stores to sync")
      return
    }
    toast.loading("Syncing artisan profiles to R2...", { id: "sync-all" })
    let ok = 0
    for (const store of targets) {
      try {
        await syncArtisanToR2(store)
        ok += 1
      } catch {
        // continue
      }
    }
    toast.success(`Synced ${ok}/${targets.length} profiles to R2`, { id: "sync-all" })
    await fetchStores()
  }

  const openAsArtisan = (artisan) => {
    try {
      const store = enterArtisanSession({
        ...artisan,
        status: "approved",
        isActive: true,
      })
      toast.success(`Entered @${store.username} workshop session`)
      router.push("/store")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not enter workshop")
    }
  }

  useEffect(() => {
    fetchStores()
  }, [])

  return !loading ? (
    <div className="text-slate-500 mb-28 max-w-6xl">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-brand-gold">Directory</p>
          <h1 className="text-2xl mt-1">
            Artisan & <span className="text-slate-800 font-medium">Store Management</span>
          </h1>
          <p className="text-sm mt-2 max-w-2xl">
            Connected profiles from Cloudflare R2 (`artisans/&#123;code&#125;/profile.json`) plus local
            workshop registrations.
          </p>
          <p className="text-xs mt-2">
            Source: {meta.source}
            {meta.r2Configured ? ` · ${meta.r2Count} on R2` : " · R2 not configured"}
            {` · ${liveApproved.length} approved`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/artisans"
            className="text-sm border border-slate-200 px-3 py-2 rounded-md hover:bg-white"
          >
            Public artisan directory
          </Link>
          <Link
            href="/store/login"
            className="text-sm border border-brand-emerald/30 text-brand-emerald px-3 py-2 rounded-md"
          >
            Artisan login
          </Link>
          <button
            type="button"
            onClick={syncAll}
            className="text-sm bg-brand-emerald text-white px-3 py-2 rounded-md hover:bg-brand-amber transition"
          >
            Sync all to R2
          </button>
        </div>
      </div>

      <h2 className="text-lg text-slate-800 font-medium mt-10">
        Live / approved artisan profiles
      </h2>
      <p className="text-xs mt-1 text-slate-400">
        Local approvals plus R2 profiles marked approved (demo stores excluded).
      </p>
      {liveApproved.length ? (
        <div className="flex flex-col gap-4 mt-4">
          {liveApproved.map((store) => {
            const isLocal = Boolean(stores.find((item) => item.id === store.id))
            return (
              <div
                key={store.id || store.artisanCode}
                className="bg-white border border-slate-200 rounded-lg shadow-sm p-6 flex max-md:flex-col gap-4 md:items-end max-w-4xl"
              >
                <StoreInfo store={store} />
                <div className="flex items-center gap-3 pt-2 flex-wrap">
                  <span className="text-[11px] uppercase tracking-wide px-2 py-1 rounded bg-slate-100">
                    {store.source || (isLocal ? "local" : "directory")}
                  </span>
                  {isLocal ? (
                    <>
                      <p>Active</p>
                      <label className="relative inline-flex items-center cursor-pointer text-gray-900">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          onChange={() =>
                            toast.promise(toggleIsActive(store.id), {
                              loading: "Updating store...",
                            })
                          }
                          checked={store.isActive}
                        />
                        <div className="w-9 h-5 bg-slate-300 rounded-full peer peer-checked:bg-brand-emerald transition-colors duration-200"></div>
                        <span className="dot absolute left-1 top-1 w-3 h-3 bg-white rounded-full transition-transform duration-200 ease-in-out peer-checked:translate-x-4"></span>
                      </label>
                    </>
                  ) : null}
                  <button
                    type="button"
                    disabled={syncingId === (store.id || store.artisanCode)}
                    onClick={() => syncOne(store)}
                    className="text-xs border border-brand-emerald/30 text-brand-emerald px-3 py-1.5 rounded-md disabled:opacity-50"
                  >
                    Sync to R2
                  </button>
                  <button
                    type="button"
                    onClick={() => openAsArtisan(store)}
                    className="text-xs bg-brand-emerald text-white px-3 py-1.5 rounded-md hover:bg-brand-amber"
                  >
                    Enter as artisan
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-40 gap-2">
          <h1 className="text-2xl text-slate-400 font-medium">No approved stores yet</h1>
          <p className="text-sm text-slate-400">
            Approve applications at{" "}
            <Link href="/admin/approve" className="text-brand-emerald hover:underline">
              /admin/approve
            </Link>
          </p>
        </div>
      )}

      <h2 className="text-lg text-slate-800 font-medium mt-12">Full artisan directory</h2>
      <div className="mt-4 grid sm:grid-cols-2 gap-4">
        {artisans.map((artisan) => (
          <div
            key={`${artisan.artisanCode}-${artisan.id}`}
            className="border border-slate-200 rounded-xl p-4 bg-white/70"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-mono text-brand-emerald">{artisan.artisanCode}</p>
                <h3 className="text-slate-800 font-medium mt-1">{artisan.name}</h3>
                <p className="text-xs text-slate-400 mt-1">@{artisan.username}</p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className="text-[11px] uppercase tracking-wide px-2 py-1 rounded bg-slate-100">
                  {artisan.source}
                </span>
                <span className="text-[11px] text-slate-400">
                  {artisan.status || "approved"}
                </span>
              </div>
            </div>
            <p className="text-sm mt-3 line-clamp-2">{artisan.description}</p>
            <div className="flex flex-wrap gap-2 mt-4">
              {artisan.username ? (
                <Link
                  href={`/shop/${artisan.username}`}
                  className="text-xs text-brand-emerald hover:underline"
                >
                  Open storefront
                </Link>
              ) : null}
              <button
                type="button"
                disabled={syncingId === (artisan.id || artisan.artisanCode)}
                onClick={() => syncOne(artisan)}
                className="text-xs border border-slate-200 px-2 py-1 rounded disabled:opacity-50"
              >
                Sync profile
              </button>
              {isApprovedArtisan(artisan) ? (
                <button
                  type="button"
                  onClick={() => openAsArtisan(artisan)}
                  className="text-xs border border-brand-emerald/30 text-brand-emerald px-2 py-1 rounded"
                >
                  Enter as artisan
                </button>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  ) : (
    <Loading />
  )
}
