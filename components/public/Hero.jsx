'use client'

import { assets } from "@/assets/assets"
import Image from "next/image"
import Link from "next/link"
import { useEffect, useState } from "react"

const trustPills = [
  "HQ Video Proof",
  "Escrow Protected",
  "Tracked & Insured",
]

const Hero = () => {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const frame = requestAnimationFrame(() => setReady(true))
    return () => cancelAnimationFrame(frame)
  }, [])

  return (
    <section className="relative isolate overflow-hidden bg-brand-cream">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(196,90,48,0.08),transparent_50%)]" />

      <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-6 py-14 sm:px-8 sm:py-20 lg:grid-cols-2 lg:gap-14 lg:py-24">
        <div
          className={`transition-all duration-700 ${
            ready ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
          }`}
        >
          <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-brand-terracotta">
            Connecting Rural Artisan Marketplace
          </p>
          <h1 className="mt-4 font-[family-name:var(--font-display)] text-4xl leading-[1.1] text-brand-forest sm:text-5xl lg:text-[3.35rem]">
            Direct from Verified Artisans to the World.
          </h1>
          <p className="mt-5 max-w-lg text-sm leading-relaxed text-slate-600 sm:text-base">
            Authenticated Indian handicrafts — every piece coded to its workshop,
            with making-of video proof and escrow-protected international delivery.
          </p>

          <div className="mt-7 flex flex-wrap gap-2.5">
            {trustPills.map((label) => (
              <span
                key={label}
                className="inline-flex items-center border border-brand-forest/20 bg-white/70 px-3 py-1.5 text-[11px] font-medium tracking-wide text-brand-forest"
              >
                {label}
              </span>
            ))}
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/shop"
              className="bg-brand-terracotta px-6 py-3 text-sm font-medium text-white transition hover:bg-brand-amber-light"
            >
              Explore Marketplace
            </Link>
            <Link
              href="/artisan/join"
              className="border border-brand-forest/25 px-6 py-3 text-sm font-medium text-brand-forest transition hover:border-brand-forest hover:bg-brand-forest hover:text-white"
            >
              Join as Artisan
            </Link>
          </div>
        </div>

        <div
          className={`relative transition-all delay-150 duration-700 ${
            ready ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
          }`}
        >
          <div className="relative aspect-[5/4] overflow-hidden bg-brand-forest/5 shadow-[0_24px_60px_-28px_rgba(26,51,46,0.45)]">
            <Image
              src={assets.hero_product_img1}
              alt="Curated Indian handicrafts from verified workshops"
              fill
              priority
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 48vw"
            />
          </div>
        </div>
      </div>
    </section>
  )
}

export default Hero
