"use client"

import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Suspense } from "react"
import RoleAuthForm from "@/components/auth/RoleAuthForm"

function ArtisanJoinInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const nextPath = searchParams.get("next") || "/store"
  const mode = searchParams.get("mode") === "login" ? "login" : "signup"

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-emerald-soft/50 via-brand-cream to-brand-amber-soft/40 px-6 py-16">
      <div className="mx-auto grid max-w-5xl gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <section>
          <p className="text-xs uppercase tracking-[0.18em] text-brand-gold">
            Partner program
          </p>
          <h1 className="mt-3 font-display text-4xl tracking-tight text-brand-ink sm:text-5xl">
            Become an artisan on{" "}
            <span className="text-brand-emerald">Crafthand Market</span>
          </h1>
          <p className="mt-4 max-w-xl text-base text-slate-600">
            Join through this campaign entry point to register with the artisan
            role. After you sign in, you land in your workshop dashboard to manage
            products, Cloudflare R2 media, and shop settings.
          </p>
          <ul className="mt-8 space-y-3 text-sm text-slate-600">
            <li className="flex gap-2">
              <span className="text-brand-emerald">•</span>
              Structured R2 paths for product photos and workshop videos
            </li>
            <li className="flex gap-2">
              <span className="text-brand-emerald">•</span>
              Catalog tools under `/store` and `/artisan/products/new`
            </li>
            <li className="flex gap-2">
              <span className="text-brand-emerald">•</span>
              Role-gated middleware so only artisans reach the dashboard
            </li>
          </ul>
          <p className="mt-8 text-sm text-slate-500">
            Already shopping?{" "}
            <Link href="/shop" className="text-brand-emerald hover:underline">
              Browse the market
            </Link>
          </p>
        </section>

        <section className="rounded-2xl border border-brand-gold/20 bg-white/90 p-6 shadow-sm backdrop-blur-sm">
          <p className="text-xs uppercase tracking-[0.16em] text-brand-gold">
            Artisan onboarding
          </p>
          <h2 className="mt-2 font-display text-2xl text-brand-ink">
            {mode === "login" ? "Artisan login" : "Create your workshop account"}
          </h2>
          <div className="mt-5">
            <RoleAuthForm
              intent="artisan"
              initialMode={mode}
              nextPath={nextPath}
              message="This entry point registers you as an artisan partner — not a client shopper."
              onSuccess={({ nextPath: destination }) => {
                router.replace(destination)
                router.refresh()
              }}
            />
          </div>
          <p className="mt-4 text-center text-xs text-slate-500">
            {mode === "login" ? (
              <>
                New partner?{" "}
                <Link
                  href={`/artisan/join?next=${encodeURIComponent(nextPath)}`}
                  className="text-brand-emerald hover:underline"
                >
                  Start onboarding
                </Link>
              </>
            ) : (
              <>
                Already a partner?{" "}
                <Link
                  href={`/artisan/login?next=${encodeURIComponent(nextPath)}`}
                  className="text-brand-emerald hover:underline"
                >
                  Log in
                </Link>
              </>
            )}
          </p>
        </section>
      </div>
    </div>
  )
}

export default function ArtisanJoinPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-slate-500">
          Loading artisan onboarding…
        </div>
      }
    >
      <ArtisanJoinInner />
    </Suspense>
  )
}
