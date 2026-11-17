import { Suspense } from "react"
import LoginForm from "./LoginForm"

export default function AuthLoginPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-emerald-soft/40 via-white to-brand-amber-soft/30 px-6 py-16">
      <div className="mx-auto max-w-md">
        <p className="text-xs uppercase tracking-[0.18em] text-brand-gold">Account</p>
        <h1 className="mt-2 font-display text-3xl text-brand-ink tracking-tight">
          Sign in to <span className="text-brand-emerald">Crafthand Market</span>
        </h1>
        <p className="mt-3 text-sm text-slate-500">
          Artisan dashboards, checkout, and orders require a Supabase Auth session.
        </p>
        <Suspense fallback={<p className="mt-8 text-sm text-slate-400">Loading sign-in…</p>}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  )
}
