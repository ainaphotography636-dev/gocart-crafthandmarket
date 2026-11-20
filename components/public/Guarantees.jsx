'use client'

import Image from "next/image"
import { assets } from "@/assets/assets"

const guarantees = [
  {
    title: "Escrow Protected Payments",
    detail: "Funds release only after verified dispatch from the workshop.",
  },
  {
    title: "Pre-Dispatch HD Video",
    detail: "Optional making-of and condition video before the piece leaves the atelier.",
  },
  {
    title: "Tracked Air Cargo",
    detail: "International logistics with door-to-door tracking from rural pickup.",
  },
  {
    title: "Authenticity Coding",
    detail: "Every SKU carries its artisan prefix so provenance stays permanent.",
  },
]

/**
 * Guarantees section — linked from the GUARANTEES navbar item.
 */
export default function Guarantees() {
  return (
    <section id="guarantees" className="scroll-mt-24 bg-brand-forest text-brand-cream">
      <div className="mx-auto grid max-w-7xl items-center gap-10 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-2 lg:gap-14">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-brand-terracotta">
            Guarantees
          </p>
          <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl leading-tight text-white sm:text-4xl">
            Trust Protocol for Every Purchase
          </h2>
          <p className="mt-4 max-w-lg text-sm leading-relaxed text-white/70 sm:text-base">
            From escrow to video proof and tracked air cargo, every order is built so
            authenticity and payment stay aligned — for rural ateliers and global buyers.
          </p>

          <ul className="mt-8 space-y-5">
            {guarantees.map((item) => (
              <li key={item.title} className="border-l-2 border-brand-terracotta pl-4">
                <p className="font-[family-name:var(--font-display)] text-lg text-white">
                  {item.title}
                </p>
                <p className="mt-1 text-sm text-white/65">{item.detail}</p>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative aspect-[5/4] overflow-hidden bg-black/20">
          <Image
            src={assets.hero_model_img}
            alt="Artisan hands at work in a rural workshop"
            fill
            className="object-cover"
            sizes="(max-width: 1024px) 100vw, 45vw"
          />
        </div>
      </div>
    </section>
  )
}
