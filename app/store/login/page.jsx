'use client'

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import toast from "react-hot-toast"
import {
  enterArtisanSession,
  findStoreByLogin,
  getActiveStore,
} from "@/lib/storeRegistry"
import { fetchArtisanDirectory } from "@/lib/artisanDirectory"

export default function StoreLoginPage() {
  const router = useRouter()
  const [identifier, setIdentifier] = useState("")
  const [busy, setBusy] = useState(false)
  const [approved, setApproved] = useState([])
  const [active, setActive] = useState(null)

  useEffect(() => {
    setActive(getActiveStore())
    ;(async () => {
      const directory = await fetchArtisanDirectory()
      const list = (directory.artisans || []).filter(
        (artisan) =>
          artisan.status === "approved" &&
          artisan.isActive !== false &&
          artisan.source !== "demo"
      )
      setApproved(list)
    })()
  }, [])

  const enter = async (profile) => {
    setBusy(true)
    try {
      const store = enterArtisanSession({
        ...profile,
        status: "approved",
        isActive: true,
      })
      if (store.status !== "approved" || !store.isActive) {
        throw new Error("This workshop is not approved yet. Ask an admin to approve it first.")
      }
      toast.success(`Signed in as @${store.username}`)
      router.push("/store")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not enter workshop")
    } finally {
      setBusy(false)
    }
  }

  const onSubmit = async (event) => {
    event.preventDefault()
    const needle = String(identifier || "").trim()
    if (!needle) {
      toast.error("Enter your workshop username or email.")
      return
    }

    setBusy(true)
    try {
      const local = findStoreByLogin(needle)
      if (local) {
        await enter(local)
        return
      }

      const directory = await fetchArtisanDirectory()
      const match = (directory.artisans || []).find(
        (artisan) =>
          artisan.username?.toLowerCase() === needle.toLowerCase() ||
          artisan.email?.toLowerCase() === needle.toLowerCase() ||
          artisan.artisanCode?.toLowerCase() === needle.toLowerCase()
      )
      if (!match) {
        throw new Error(
          "No workshop found for that username/email. Register at /create-store first."
        )
      }
      if (match.status && match.status !== "approved") {
        throw new Error(`Workshop @${match.username} is ${match.status}. Wait for admin approval.`)
      }
      await enter(match)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Login failed")
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-emerald-soft/40 via-white to-brand-amber-soft/30 px-6 py-16">
      <div className="mx-auto max-w-lg">
        <p className="text-xs uppercase tracking-[0.18em] text-brand-gold">Artisan access</p>
        <h1 className="mt-2 font-display text-3xl text-brand-ink tracking-tight">
          Enter your <span className="text-brand-emerald">workshop</span>
        </h1>
        <p className="mt-3 text-sm text-slate-500">
          Crafthand Market uses a browser workshop session (no password yet). Use the username from
          your approved application, or pick an approved profile below.
        </p>

        {active ? (
          <div className="mt-6 rounded-lg border border-brand-emerald/20 bg-white/80 px-4 py-3 text-sm">
            Currently connected:{" "}
            <span className="font-medium text-brand-ink">
              {active.name} (@{active.username})
            </span>{" "}
            · {active.status}
            {active.status === "approved" ? (
              <Link href="/store" className="ml-2 text-brand-emerald hover:underline">
                Open dashboard
              </Link>
            ) : null}
          </div>
        ) : null}

        <form onSubmit={onSubmit} className="mt-8 space-y-4 rounded-xl border border-slate-200 bg-white/90 p-6">
          <label className="flex flex-col gap-2 text-sm text-slate-600">
            Workshop username, email, or artisan code
            <input
              value={identifier}
              onChange={(event) => setIdentifier(event.target.value)}
              placeholder="e.g. greatstack or ART001"
              className="rounded border border-slate-200 px-3 py-2 outline-none focus:border-brand-emerald"
              autoComplete="username"
              required
            />
          </label>
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-md bg-brand-emerald px-4 py-2.5 text-white transition hover:bg-brand-amber disabled:opacity-60"
          >
            {busy ? "Entering…" : "Enter workshop dashboard"}
          </button>
        </form>

        <div className="mt-10">
          <h2 className="text-sm font-medium text-slate-800">Approved artisan profiles</h2>
          <p className="mt-1 text-xs text-slate-500">
            From Cloudflare R2 + local approvals (demo stores hidden).
          </p>
          {approved.length ? (
            <ul className="mt-4 space-y-3">
              {approved.map((artisan) => (
                <li
                  key={`${artisan.artisanCode}-${artisan.id}`}
                  className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white/80 px-4 py-3"
                >
                  <div>
                    <p className="font-mono text-xs text-brand-emerald">{artisan.artisanCode}</p>
                    <p className="text-sm text-brand-ink font-medium">{artisan.name}</p>
                    <p className="text-xs text-slate-400">@{artisan.username}</p>
                  </div>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => enter(artisan)}
                    className="text-xs rounded-md border border-brand-emerald/30 px-3 py-1.5 text-brand-emerald hover:bg-brand-emerald-soft disabled:opacity-50"
                  >
                    Enter
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-slate-400">
              No approved profiles yet. Submit at{" "}
              <Link href="/create-store" className="text-brand-emerald hover:underline">
                /create-store
              </Link>{" "}
              then ask an admin to approve at{" "}
              <Link href="/admin/approve" className="text-brand-emerald hover:underline">
                /admin/approve
              </Link>
              .
            </p>
          )}
        </div>

        <p className="mt-8 text-center text-xs text-slate-400">
          New workshop?{" "}
          <Link href="/create-store" className="text-brand-emerald hover:underline">
            Register here
          </Link>
        </p>
      </div>
    </div>
  )
}
