'use client'

import { assets } from "@/assets/assets"
import Image from "next/image"
import Link from "next/link"
import { useEffect, useState } from "react"

const Hero = () => {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const frame = requestAnimationFrame(() => setReady(true))
    return () => cancelAnimationFrame(frame)
  }, [])

  return (
    <section className="relative isolate min-h-[88vh] w-full overflow-hidden bg-brand-ink text-white">
      <Image
        src={assets.hero_model_img}
        alt="Indian artisan craftsmanship for Crafthand Market"
        fill
        priority
        className={`object-cover transition-transform duration-[1600ms] ease-out ${
          ready ? "scale-100" : "scale-110"
        }`}
      />
      <div className="absolute inset-0 bg-gradient-to-r from-brand-ink/90 via-brand-ink/65 to-brand-ink/25" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(180,83,9,0.28),transparent_45%)]" />

      <div className="relative z-10 mx-auto flex min-h-[88vh] max-w-7xl flex-col justify-end px-6 pb-16 pt-28 sm:px-8 sm:pb-20">
        <p
          className={`text-xs uppercase tracking-[0.35em] text-brand-gold-light transition-all duration-700 ${
            ready ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
          }`}
        >
          Crafthand Market
        </p>
        <h1
          className={`mt-4 max-w-3xl font-medium text-4xl leading-[1.05] sm:text-6xl transition-all delay-100 duration-700 ${
            ready ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
          }`}
        >
          Brass, handlooms, and GI-tag heirlooms from India&apos;s finest ateliers.
        </h1>
        <p
          className={`mt-5 max-w-xl text-sm sm:text-base text-white/80 leading-relaxed transition-all delay-200 duration-700 ${
            ready ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
          }`}
        >
          A luxury marketplace for authenticated Indian handicrafts — every piece coded to its
          artisan workshop.
        </p>
        <div
          className={`mt-8 flex flex-wrap gap-3 transition-all delay-300 duration-700 ${
            ready ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
          }`}
        >
          <Link
            href="/shop"
            className="bg-brand-emerald px-6 py-3 text-sm text-white hover:bg-brand-amber transition"
          >
            Explore the collection
          </Link>
          <Link
            href="/artisans"
            className="border border-white/35 px-6 py-3 text-sm text-white hover:bg-white/10 transition"
          >
            Meet the artisans
          </Link>
        </div>
      </div>
    </section>
  )
}

export default Hero
