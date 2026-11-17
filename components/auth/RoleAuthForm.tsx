"use client"

import { FormEvent, useState } from "react"
import Link from "next/link"
import toast from "react-hot-toast"
import { ensureProfileRole } from "@/app/actions/auth-profile"
import { buildAuthEmailRedirect } from "@/lib/auth/siteUrl"
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
  const [awaitingEmail, setAwaitingEmail] = useState(false)
  const [resendBusy, setResendBusy] = useState(false)

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
      const trimmedEmail = email.trim().toLowerCase()

      if (mode === "signup") {
        const emailRedirectTo = buildAuthEmailRedirect({
          nextPath: fallbackNext,
          intent,
        })

        const { data, error } = await supabase.auth.signUp({
          email: trimmedEmail,
          password,
          options: {
            emailRedirectTo,
            data: {
              full_name: fullName.trim(),
              role: signupRoleForIntent(intent),
            },
          },
        })
        if (error) throw error

        // Supabase returns a user with empty identities when the email is
        // already registered — no confirmation email is sent again.
        const identities = data.user?.identities || []
        if (data.user && identities.length === 0) {
          toast.error(
            "This email is already registered. Log in instead, or use Resend confirmation below."
          )
          setMode("login")
          setAwaitingEmail(true)
          return
        }

        if (!data.session) {
          setAwaitingEmail(true)
          toast.success(
            "Account created. Check your inbox (and spam) for the confirmation link."
          )
          setMode("login")
          return
        }

        toast.success(
          intent === "artisan"
            ? "Welcome — your artisan account is ready"
            : "Welcome — your client account is ready"
        )
        setAwaitingEmail(false)
        await finish("signup")
        return
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password,
      })
      if (error) {
        if (/email not confirmed/i.test(error.message)) {
          setAwaitingEmail(true)
          toast.error(
            "Email not confirmed yet. Use Resend confirmation below, or confirm from your inbox."
          )
          return
        }
        throw error
      }
      toast.success("Signed in")
      setAwaitingEmail(false)
      await finish("login")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Authentication failed")
    } finally {
      setBusy(false)
    }
  }

  const resendConfirmation = async () => {
    const trimmedEmail = email.trim().toLowerCase()
    if (!trimmedEmail) {
      toast.error("Enter your email first.")
      return
    }
    if (!configured) {
      toast.error("Supabase is not configured yet.")
      return
    }

    setResendBusy(true)
    try {
      const supabase = createClient()
      const emailRedirectTo = buildAuthEmailRedirect({
        nextPath: fallbackNext,
        intent,
      })
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: trimmedEmail,
        options: { emailRedirectTo },
      })
      if (error) throw error
      toast.success("Confirmation email resent — check inbox and spam.")
      setAwaitingEmail(true)
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not resend confirmation email"
      )
    } finally {
      setResendBusy(false)
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

      {awaitingEmail ? (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <p>
            Waiting on the confirmation email. Check spam/junk. Supabase&apos;s
            built-in mailer is rate-limited — for production, add custom SMTP
            under <strong>Authentication → Emails</strong>, or temporarily
            disable <strong>Confirm email</strong> while testing.
          </p>
          <button
            type="button"
            onClick={() => void resendConfirmation()}
            disabled={resendBusy || !configured}
            className="mt-3 text-sm font-medium text-brand-emerald hover:underline disabled:opacity-60"
          >
            {resendBusy ? "Resending…" : "Resend confirmation email"}
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => void resendConfirmation()}
          disabled={resendBusy || !configured || !email.trim()}
          className="mt-3 w-full text-center text-xs text-slate-500 hover:text-brand-emerald disabled:opacity-40"
        >
          {resendBusy ? "Resending…" : "Resend confirmation email"}
        </button>
      )}

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
