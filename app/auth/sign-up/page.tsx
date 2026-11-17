'use client'

import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Suspense } from "react"
import RoleAuthForm from "@/components/auth/RoleAuthForm"
import type { AuthIntent } from "@/lib/supabase/roles"

function SignUpInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const intentParam = searchParams.get("intent")
  const intent: AuthIntent = intentParam === "artisan" ? "artisan" : "client"
  const nextPath =
    searchParams.get("next") ||
    (intent === "artisan" ? "/store" : "/cart")

  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-emerald-soft/40 via-white to-brand-amber-soft/30 px-6 py-16">
      <div className="mx-auto max-w-md">
        <p className="text-xs uppercase tracking-[0.18em] text-brand-gold">
          {intent === "artisan" ? "Artisan partner" : "Client account"}
        </p>
        <h1 className="mt-2 font-display text-3xl tracking-tight text-brand-ink">
          {intent === "artisan" ? (
            <>
              Join as an <span className="text-brand-emerald">artisan</span>
            </>
          ) : (
            <>
              Join <span className="text-brand-emerald">Crafthand Market</span>
            </>
          )}
        </h1>
        <p className="mt-3 text-sm text-slate-500">
          {intent === "artisan"
            ? "Campaign and partner sign-ups land in your workshop dashboard."
            : "Client accounts save your cart and unlock checkout."}
        </p>

        <div className="mt-8 rounded-xl border border-slate-200 bg-white/90 p-6">
          <RoleAuthForm
            intent={intent}
            initialMode="signup"
            nextPath={nextPath}
            onSuccess={({ nextPath: destination }) => {
              router.replace(destination)
              router.refresh()
            }}
          />
        </div>

        <p className="mt-6 text-center text-sm text-slate-500">
          Prefer the dedicated partner page?{" "}
          <Link href="/artisan/join" className="text-brand-emerald hover:underline">
            Become an artisan
          </Link>
        </p>
      </div>
    </div>
  )
}

export default function AuthSignUpPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-slate-500">
          Loading…
        </div>
      }
    >
      <SignUpInner />
    </Suspense>
  )
}
