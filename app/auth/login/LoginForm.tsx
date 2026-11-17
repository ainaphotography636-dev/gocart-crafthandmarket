'use client'

import { FormEvent, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import toast from "react-hot-toast"
import { createClient } from "@/utils/supabase/client"

export default function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const nextPath = searchParams.get("next") || "/store"
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [busy, setBusy] = useState(false)

  const configured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  )

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!configured) {
      toast.error("Supabase is not configured. Add keys to .env.local first.")
      return
    }

    setBusy(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })
      if (error) throw error
      toast.success("Signed in")
      router.replace(nextPath)
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Sign-in failed")
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      {!configured ? (
        <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Add <code className="font-mono">NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
          <code className="font-mono">NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</code>{" "}
          to <code className="font-mono">.env.local</code>, then restart the
          dev server.
        </div>
      ) : null}

      <form
        onSubmit={onSubmit}
        className="mt-8 space-y-4 rounded-xl border border-slate-200 bg-white/90 p-6"
      >
        <label className="flex flex-col gap-2 text-sm text-slate-600">
          Email
          <input
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="rounded border border-slate-200 px-3 py-2 outline-none focus:border-brand-emerald"
            autoComplete="email"
          />
        </label>
        <label className="flex flex-col gap-2 text-sm text-slate-600">
          Password
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="rounded border border-slate-200 px-3 py-2 outline-none focus:border-brand-emerald"
            autoComplete="current-password"
          />
        </label>
        <button
          type="submit"
          disabled={busy || !configured}
          className="w-full rounded-md bg-brand-emerald px-4 py-2.5 text-white transition hover:bg-brand-amber disabled:opacity-60"
        >
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        Need an account?{" "}
        <Link href="/auth/sign-up" className="text-brand-emerald hover:underline">
          Create one
        </Link>
      </p>
    </>
  )
}
