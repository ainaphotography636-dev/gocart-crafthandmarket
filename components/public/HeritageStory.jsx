'use client'

import Image from 'next/image'
import { assets } from '@/assets/assets'

export default function HeritageStory() {
  return (
    <section id="mission" className="scroll-mt-24 bg-brand-cream">
      <div className="mx-auto grid max-w-7xl items-center gap-10 px-6 py-16 sm:px-8 sm:py-20 lg:grid-cols-2 lg:gap-14">
        <div className="relative aspect-[4/5] overflow-hidden bg-brand-forest/5 sm:aspect-[5/4] lg:aspect-[4/5]">
          <Image
            src={assets.hero_product_img2}
            alt="Heritage workshop craftsmanship"
            fill
            className="object-cover"
            sizes="(max-width: 1024px) 100vw, 45vw"
          />
        </div>

        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-brand-terracotta">
            Mission
          </p>
          <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl leading-tight text-brand-slate sm:text-4xl">
            Bridging Rural Heritage Workshops and Global Buyers
          </h2>
          <p className="mt-5 text-sm leading-relaxed text-slate-600 sm:text-base">
            CraftHand Market connects verified rural ateliers with collectors
            worldwide. Every listing carries workshop coding, material specs, and
            optional making-of video so buyers know exactly where a piece was born.
          </p>
          <p className="mt-4 text-sm leading-relaxed text-slate-600 sm:text-base">
            Payments settle through escrow, and international air logistics are
            tracked from doorstep pickup to delivery — protecting both artisan and buyer.
          </p>

          <blockquote className="mt-8 border-l-2 border-brand-terracotta bg-[#efe8df] px-5 py-4 text-sm leading-relaxed text-brand-slate">
            “When a buyer receives video-verified craft with direct workshop pricing,
            heritage traditions stay solvent — and collectors receive the real piece,
            not a factory copy.”
          </blockquote>
        </div>
      </div>
    </section>
  )
}
