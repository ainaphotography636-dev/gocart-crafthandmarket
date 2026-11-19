import Image from "next/image"
import Link from "next/link"

const pillars = [
  {
    tag: "MASTER WOODWORKING",
    title: "Hand-Carved Sculptures",
    description:
      "Detailed floral, ceremonial, and traditional relief sculptures chiseled from solid teak and dark rosewood with natural beeswax finishes.",
    href: "/shop?search=Woodcraft",
    images: [
      {
        src: "/traditions/wood-elephant.png",
        alt: "Hand-carved ceremonial wooden elephant sculpture",
      },
      {
        src: "/traditions/wood-relief.png",
        alt: "Close-up of intricate floral wood relief carving",
      },
    ],
  },
  {
    tag: "ANCIENT METALWORK",
    title: "Brass & Bell Metal Alloys",
    description:
      "Master-cast traditional mirrors, filigree jewelry boxes, and oil lamps crafted through generations of metalsmithing.",
    href: "/shop?search=Brass",
    images: [
      {
        src: "/traditions/metal-mirror.png",
        alt: "Ornate brass hand mirror on wooden surface",
      },
      {
        src: "/traditions/metal-texture.png",
        alt: "Close-up of hammered brass metal texture",
      },
    ],
  },
  {
    tag: "EARTHENWARE & POTTERY",
    title: "Terracotta & Earthen Pottery",
    description:
      "Unglazed ceramic vessels and hand-turned clay items preserving earthen textures and regional kiln firing variations.",
    href: "/shop?search=Pottery",
    images: [
      {
        src: "/traditions/pottery-ritual.png",
        alt: "Traditional ritual craft flat lay on woven mat",
      },
      {
        src: "/traditions/pottery-bowls.png",
        alt: "Stacked hand-carved terracotta bowls",
      },
    ],
  },
]

/**
 * Heritage Craft Pillars — Traditions landing section.
 * Layout and imagery match the approved mockup exactly.
 */
export default function HeritageCraftPillars() {
  return (
    <section
      id="traditions"
      className="scroll-mt-24 bg-[#FDFBF7] px-4 py-16 sm:px-6 sm:py-20 lg:px-8"
    >
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-3xl text-center">
          <p className="inline-block border border-[#C85A32]/70 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#C85A32] sm:text-[11px]">
            Vernacular Provenance &amp; Intricate Relief
          </p>
          <h2 className="mt-5 font-[family-name:var(--font-display)] text-3xl leading-tight text-[#1B332F] sm:text-4xl lg:text-[2.75rem]">
            Heritage Craft Pillars
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-[#5C5C5C] sm:text-[15px]">
            Direct access to four generations of regional Indian masterwork:
            textiles, metalwork, ceramics, and woodworking.
          </p>
        </div>

        <div className="mt-12 grid gap-6 sm:mt-14 sm:gap-7 lg:grid-cols-3">
          {pillars.map((pillar) => (
            <Link
              key={pillar.tag}
              href={pillar.href}
              className="group flex flex-col overflow-hidden rounded-md bg-white shadow-[0_6px_24px_rgba(27,51,47,0.07)] transition duration-300 hover:shadow-[0_12px_32px_rgba(27,51,47,0.1)]"
            >
              <div className="grid grid-cols-2 gap-2 p-2 sm:gap-2.5 sm:p-2.5">
                {pillar.images.map((image) => (
                  <div
                    key={image.src}
                    className="relative aspect-square overflow-hidden bg-[#F3EEE6]"
                  >
                    <Image
                      src={image.src}
                      alt={image.alt}
                      fill
                      className="object-cover transition duration-500 group-hover:scale-[1.03]"
                      sizes="(max-width: 1024px) 45vw, 180px"
                    />
                  </div>
                ))}
              </div>

              <div className="flex flex-1 flex-col px-5 pb-6 pt-3 sm:px-6 sm:pb-7">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#C85A32]">
                  {pillar.tag}
                </p>
                <h3 className="mt-2 font-[family-name:var(--font-display)] text-xl leading-snug text-[#1B332F] sm:text-[1.35rem]">
                  {pillar.title}
                </h3>
                <p className="mt-2.5 text-[13px] leading-relaxed text-[#5C5C5C] sm:text-sm">
                  {pillar.description}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
