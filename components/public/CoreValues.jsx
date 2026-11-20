const values = [
  {
    title: "Authenticity",
    detail: "Video Verified Provenance",
    copy: "Every piece ships with workshop coding and optional making-of video so collectors know the atelier of origin.",
  },
  {
    title: "Transparency",
    detail: "Direct Workshop Pricing",
    copy: "Listings carry material specs, GI tags, and fair direct-from-atelier pricing without opaque middle layers.",
  },
  {
    title: "Craftsmanship",
    detail: "Heritage Handicraft Traditions",
    copy: "Textiles, metalwork, ceramics, and woodworking rooted in living regional techniques across India.",
  },
  {
    title: "Security",
    detail: "Escrow Protected Funds",
    copy: "Payments stay held until verified dispatch — protecting both rural workshops and global buyers.",
  },
]

/**
 * Core Values section — linked from the CORE VALUES navbar item.
 */
export default function CoreValues() {
  return (
    <section id="core-values" className="scroll-mt-24 bg-[#F9F6F1] px-5 py-16 sm:px-8 sm:py-20">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-brand-terracotta">
            Core Values
          </p>
          <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl text-[#1B3B2B] sm:text-4xl">
            What We Stand For
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-600 sm:text-base">
            Four principles that keep CraftHand Market honest for artisans and collectors alike.
          </p>
        </div>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {values.map((item) => (
            <div
              key={item.title}
              className="rounded-xl border border-[#1B3B2B]/8 bg-white px-5 py-6 shadow-[0_8px_28px_-20px_rgba(27,59,43,0.35)]"
            >
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-terracotta">
                {item.detail}
              </p>
              <h3 className="mt-2 font-[family-name:var(--font-display)] text-xl text-[#1B3B2B]">
                {item.title}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">{item.copy}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
