'use client'

import { FormEvent, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import toast from "react-hot-toast"
import { createClient } from "@/utils/supabase/client"

type RoleChoice = "buyer" | "artisan"

export default function AuthSignUpPage() {
  const router = useRouter()
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [role, setRole] = useState<RoleChoice>("buyer")
  const [busy, setBusy] = useState(false)

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: fullName.trim(),
            role,
          },
        },
      })
      if (error) throw error

      if (data.session) {
        toast.success("Account created")
        router.replace(role === "artisan" ? "/store" : "/shop")
        router.refresh()
      } else {
        toast.success("Check your email to confirm your account")
        router.replace("/auth/login")
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Sign-up failed")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-emerald-soft/40 via-white to-brand-amber-soft/30 px-6 py-16">
      <div className="mx-auto max-w-md">
        <p className="text-xs uppercase tracking-[0.18em] text-brand-gold">Account</p>
        <h1 className="mt-2 font-display text-3xl text-brand-ink tracking-tight">
          Join <span className="text-brand-emerald">Crafthand Market</span>
        </h1>
        <p className="mt-3 text-sm text-slate-500">
          Create a buyer or artisan account. Profiles are stored in Supabase and linked to Auth.
        </p>

        <form
          onSubmit={onSubmit}
          className="mt-8 space-y-4 rounded-xl border border-slate-200 bg-white/90 p-6"
        >
          <label className="flex flex-col gap-2 text-sm text-slate-600">
            Full name
            <input
              required
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              className="rounded border border-slate-200 px-3 py-2 outline-none focus:border-brand-emerald"
            />
          </label>
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
              autoComplete="new-password"
            />
          </label>
          <fieldset className="text-sm text-slate-600">
            <legend className="mb-2">I am joining as</legend>
            <div className="flex gap-4">
              <label className="inline-flex items-center gap-2">
                <input
                  type="radio"
                  name="role"
                  checked={role === "buyer"}
                  onChange={() => setRole("buyer")}
                />
                Buyer
              </label>
              <label className="inline-flex items-center gap-2">
                <input
                  type="radio"
                  name="role"
                  checked={role === "artisan"}
                  onChange={() => setRole("artisan")}
                />
                Artisan
              </label>
            </div>
          </fieldset>
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-md bg-brand-emerald px-4 py-2.5 text-white transition hover:bg-brand-amber disabled:opacity-60"
          >
            {busy ? "Creating account…" : "Create account"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          Already registered?{" "}
          <Link href="/auth/login" className="text-brand-emerald hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
