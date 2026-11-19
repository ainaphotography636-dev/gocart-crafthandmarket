'use client'

import Image from 'next/image'
import { assets } from '@/assets/assets'

export default function LogisticsBand() {
  return (
    <section className="bg-brand-forest text-brand-cream">
      <div className="mx-auto grid max-w-7xl items-center gap-10 px-6 py-14 sm:px-8 sm:py-16 lg:grid-cols-2 lg:gap-12">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-brand-terracotta">
            Direct Pickup &amp; Video Authenticity
          </p>
          <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl leading-tight text-white sm:text-4xl">
            International Air Delivery Directly from Rural Workshops
          </h2>
          <p className="mt-4 max-w-lg text-sm leading-relaxed text-white/70">
            Pieces leave the atelier with tracked logistics and escrow release only
            after verified dispatch — so authenticity and payment stay aligned.
          </p>
          <div className="mt-8 grid grid-cols-2 gap-6 max-w-md">
            <div>
              <p className="font-[family-name:var(--font-display)] text-3xl text-brand-terracotta">
                100%
              </p>
              <p className="mt-1 text-xs uppercase tracking-[0.16em] text-white/60">
                Authenticity Verified
              </p>
            </div>
            <div>
              <p className="font-[family-name:var(--font-display)] text-3xl text-brand-terracotta">
                Direct
              </p>
              <p className="mt-1 text-xs uppercase tracking-[0.16em] text-white/60">
                Escrow Protection
              </p>
            </div>
          </div>
        </div>

        <div className="relative aspect-[5/4] overflow-hidden">
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
