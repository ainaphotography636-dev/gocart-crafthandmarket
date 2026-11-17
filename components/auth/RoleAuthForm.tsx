"use client"

import { FormEvent, useState } from "react"
import Link from "next/link"
import toast from "react-hot-toast"
import { ensureProfileRole } from "@/app/actions/auth-profile"
import {
  defaultPathForRole,
  signupRoleForIntent,
  type AuthIntent,
} from "@/lib/supabase/roles"
import { createClient } from "@/utils/supabase/client"

type Mode = "login" | "signup"

export type RoleAuthFormProps = {
  intent: AuthIntent
  initialMode?: Mode
  nextPath?: string
  message?: string
  onSuccess?: (payload: { mode: Mode; nextPath: string }) => void
  compact?: boolean
}

export default function RoleAuthForm({
  intent,
  initialMode = "login",
  nextPath,
  message,
  onSuccess,
  compact = false,
}: RoleAuthFormProps) {
  const [mode, setMode] = useState<Mode>(initialMode)
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [busy, setBusy] = useState(false)

  const configured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  )

  const roleLabel = intent === "artisan" ? "artisan" : "client"
  const fallbackNext =
    nextPath || defaultPathForRole(signupRoleForIntent(intent))

  const finish = async (activeMode: Mode) => {
    const ensured = await ensureProfileRole(intent)
    if (ensured.ok === false) {
      toast.error(ensured.error)
    }
    const destination = fallbackNext
    onSuccess?.({ mode: activeMode, nextPath: destination })
    return destination
  }

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!configured) {
      toast.error("Supabase is not configured yet.")
      return
    }

    setBusy(true)
    try {
      const supabase = createClient()

      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              full_name: fullName.trim(),
              role: signupRoleForIntent(intent),
            },
          },
        })
        if (error) throw error

        if (!data.session) {
          toast.success("Check your email to confirm your account")
          setMode("login")
          return
        }

        toast.success(
          intent === "artisan"
            ? "Welcome — your artisan account is ready"
            : "Welcome — your client account is ready"
        )
        await finish("signup")
        return
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })
      if (error) throw error
      toast.success("Signed in")
      await finish("login")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Authentication failed")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={compact ? "" : "space-y-4"}>
      {message ? (
        <div className="rounded-lg border border-brand-emerald/20 bg-brand-emerald-soft/50 px-4 py-3 text-sm text-brand-ink">
          {message}
        </div>
      ) : null}

      {!configured ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Add Supabase keys to <code className="font-mono">.env.local</code> to
          enable {roleLabel} auth.
        </div>
      ) : null}

      <div className="flex gap-2 rounded-lg bg-slate-100 p-1 text-sm">
        <button
          type="button"
          onClick={() => setMode("login")}
          className={`flex-1 rounded-md px-3 py-2 transition ${
            mode === "login"
              ? "bg-white text-brand-ink shadow-sm"
              : "text-slate-500 hover:text-brand-ink"
          }`}
        >
          Log in
        </button>
        <button
          type="button"
          onClick={() => setMode("signup")}
          className={`flex-1 rounded-md px-3 py-2 transition ${
            mode === "signup"
              ? "bg-white text-brand-ink shadow-sm"
              : "text-slate-500 hover:text-brand-ink"
          }`}
        >
          Sign up
        </button>
      </div>

      <form onSubmit={onSubmit} className="mt-4 space-y-3">
        {mode === "signup" ? (
          <label className="flex flex-col gap-1.5 text-sm text-slate-600">
            Full name
            <input
              required
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              className="rounded border border-slate-200 px-3 py-2 outline-none focus:border-brand-emerald"
              autoComplete="name"
            />
          </label>
        ) : null}
        <label className="flex flex-col gap-1.5 text-sm text-slate-600">
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
        <label className="flex flex-col gap-1.5 text-sm text-slate-600">
          Password
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="rounded border border-slate-200 px-3 py-2 outline-none focus:border-brand-emerald"
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
          />
        </label>
        <button
          type="submit"
          disabled={busy || !configured}
          className="w-full rounded-md bg-brand-emerald px-4 py-2.5 text-white transition hover:bg-brand-amber disabled:opacity-60"
        >
          {busy
            ? mode === "signup"
              ? "Creating account…"
              : "Signing in…"
            : mode === "signup"
              ? `Create ${roleLabel} account`
              : `Log in as ${roleLabel}`}
        </button>
      </form>

      {intent === "client" ? (
        <p className="mt-4 text-center text-xs text-slate-500">
          Making or selling crafts?{" "}
          <Link href="/artisan/join" className="text-brand-emerald hover:underline">
            Partner with us as an artisan
          </Link>
        </p>
      ) : (
        <p className="mt-4 text-center text-xs text-slate-500">
          Shopping instead?{" "}
          <Link href="/auth/login?intent=client" className="text-brand-emerald hover:underline">
            Continue as a client
          </Link>
        </p>
      )}
    </div>
  )
}
