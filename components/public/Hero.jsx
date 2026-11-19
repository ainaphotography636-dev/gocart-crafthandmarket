'use client'

import Image from "next/image"
import Link from "next/link"
import { useEffect, useState } from "react"

const stats = [
  { value: "100%", label: "Escrow Secured" },
  { value: "HD Video", label: "Dispatch Proof" },
  { value: "Global", label: "Tracked Air Cargo" },
]

const tickerItems = [
  "Direct Rural Artisan Access",
  "100% Escrow Protected Payments",
  "Pre-Dispatch HD Video Inspection",
  "Tracked Air Cargo Delivery",
]

/**
 * Homepage hero — matches the approved CraftHand Market mockup exactly:
 * verified protocol badge, dual CTAs, live workshop feed card, trust ticker.
 */
const Hero = () => {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const frame = requestAnimationFrame(() => setReady(true))
    return () => cancelAnimationFrame(frame)
  }, [])

  return (
    <section className="relative isolate overflow-hidden bg-[#F9F6F1]">
      <div className="mx-auto max-w-7xl px-5 pb-10 pt-12 sm:px-8 sm:pb-12 sm:pt-16 lg:px-10 lg:pt-20">
        <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-12 xl:gap-16">
          {/* Left copy */}
          <div
            className={`transition-all duration-700 ${
              ready ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
            }`}
          >
            <span className="inline-flex items-center gap-2 rounded-md border border-[#C85A32]/35 bg-[#F8EDE6] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#C85A32] sm:text-[11px]">
              <span className="size-1.5 rounded-full bg-[#1B3B2B]" aria-hidden />
              Verified Direct Protocol
            </span>

            <h1 className="mt-6 max-w-xl font-[family-name:var(--font-display)] text-[2.35rem] leading-[1.12] tracking-tight text-[#1B3B2B] sm:text-5xl lg:text-[3.35rem] lg:leading-[1.08]">
              Direct from Verified Artisans to the{" "}
              <em className="font-medium italic text-[#C85A32]">World.</em>
            </h1>

            <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-[#5F5F5F] sm:text-base sm:leading-[1.7]">
              Craft Hand Market connects verified rural Indian artisans directly with
              global buyers. The online marketplace offers video-verified, genuine
              handcrafted items—including textiles, metalwork, ceramics, and
              woodworking—backed by escrow payment protection and international shipping.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/shop"
                className="inline-flex items-center gap-2 rounded-md bg-[#C85A32] px-5 py-3 text-sm font-medium text-white transition hover:bg-[#b44e2a]"
              >
                Explore Storefront Portal
                <span aria-hidden>→</span>
              </Link>
              <Link
                href="/#guarantees"
                className="inline-flex items-center rounded-md border border-[#1B3B2B]/35 bg-transparent px-5 py-3 text-sm font-medium text-[#1B3B2B] transition hover:border-[#1B3B2B] hover:bg-white/60"
              >
                View Trust Protocol
              </Link>
            </div>

            <div className="mt-10 border-t border-[#1B3B2B]/10 pt-8">
              <div className="grid max-w-lg grid-cols-3 gap-4 sm:gap-6">
                {stats.map((stat) => (
                  <div key={stat.label}>
                    <p className="font-[family-name:var(--font-display)] text-xl text-[#1B3B2B] sm:text-2xl">
                      {stat.value}
                    </p>
                    <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#7A7A7A] sm:text-[11px]">
                      {stat.label}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right live feed card */}
          <div
            className={`transition-all delay-150 duration-700 ${
              ready ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
            }`}
          >
            <div className="overflow-hidden rounded-xl bg-white shadow-[0_18px_50px_-24px_rgba(27,59,43,0.45)] ring-1 ring-[#1B3B2B]/5">
              <div className="flex items-center justify-between gap-3 bg-[#1B3B2B] px-4 py-3">
                <p className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#F9F6F1]">
                  <span className="size-1.5 rounded-full bg-[#C85A32]" aria-hidden />
                  Live Workshop Feed
                </p>
                <span className="rounded border border-white/35 px-2 py-0.5 text-[10px] font-medium text-white">
                  Direct Sync
                </span>
              </div>

              <div className="relative aspect-[16/10] bg-[#EDE6DC]">
                <Image
                  src="/hero/live-workshop-feed.jpg"
                  alt="Live workshop feed — artisan hands crafting fiber arts"
                  fill
                  priority
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 42vw"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 bg-[#F4EFE7] px-4 py-3.5">
                <div className="rounded-md bg-[#F9F6F1] px-3 py-2.5">
                  <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-[#8A8A8A]">
                    Origin Location
                  </p>
                  <p className="mt-1 text-sm font-semibold text-[#1B3B2B]">
                    Kerala &amp; Bengal Workshops
                  </p>
                </div>
                <div className="rounded-md bg-[#F9F6F1] px-3 py-2.5">
                  <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-[#8A8A8A]">
                    Payment Vault
                  </p>
                  <p className="mt-1 text-sm font-semibold text-[#1B3B2B]">
                    Escrow Protected
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 border-t border-dashed border-[#1B3B2B]/15 px-4 py-3">
                <p className="text-sm text-[#6B6B6B]">Authenticity Status:</p>
                <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#2F9E5B]">
                  <span className="size-1.5 rounded-full bg-[#2F9E5B]" aria-hidden />
                  100% Video Verified
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom trust ticker */}
      <div className="bg-[#1B3B2B]">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-6 gap-y-3 px-5 py-3.5 sm:px-8 lg:px-10">
          {tickerItems.map((item) => (
            <p
              key={item}
              className="inline-flex items-center gap-2 text-[12px] font-medium text-[#F4EFE7] sm:text-[13px]"
            >
              <span className="text-[#C85A32]" aria-hidden>
                ✦
              </span>
              {item}
            </p>
          ))}
        </div>
      </div>
    </section>
  )
}

export default Hero
