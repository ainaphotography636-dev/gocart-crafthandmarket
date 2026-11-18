'use client'

import Image from 'next/image'
import Link from 'next/link'
import { assets } from '@/assets/assets'

const disciplines = [
  {
    title: 'Heritage Metalwork',
    href: '/shop?search=Metalwork',
    image: assets.product_img3,
  },
  {
    title: 'Fine Woodworking',
    href: '/shop?search=Wood',
    image: assets.product_img7,
  },
  {
    title: 'Ceramics & Culture',
    href: '/shop?search=Ceramics',
    image: assets.product_img5,
  },
  {
    title: 'Natural Textiles',
    href: '/shop?search=Textile',
    image: assets.product_img1,
  },
]

export default function ArtisanDisciplines() {
  return (
    <section id="crafts" className="scroll-mt-20 bg-brand-cream px-6 py-16 sm:px-8 sm:py-20">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-brand-terracotta">
            Artisan Disciplines
          </p>
          <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl text-brand-forest sm:text-4xl">
            Textiles, Metalwork, Ceramics &amp; Woodworking
          </h2>
          <p className="mt-3 text-sm text-slate-600">
            Explore craft families shaped in rural workshops across India.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 lg:gap-5">
          {disciplines.map((item) => (
            <Link
              key={item.title}
              href={item.href}
              className="group relative aspect-[3/4] overflow-hidden bg-brand-forest/10"
            >
              <Image
                src={item.image}
                alt={item.title}
                fill
                className="object-cover transition duration-500 group-hover:scale-105"
                sizes="(max-width: 1024px) 50vw, 25vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-brand-forest/75 via-brand-forest/10 to-transparent" />
              <span className="absolute inset-x-0 bottom-0 px-3 pb-4 font-[family-name:var(--font-display)] text-base text-white sm:text-lg">
                {item.title}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
