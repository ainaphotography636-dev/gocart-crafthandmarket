const guarantees = [
  {
    title: 'Authenticity',
    detail: 'Video Verified Provenance',
  },
  {
    title: 'Transparency',
    detail: 'Direct Workshop Pricing',
  },
  {
    title: 'Craftsmanship',
    detail: 'Heritage Handicraft Traditions',
  },
  {
    title: 'Security',
    detail: 'Escrow Protected Funds',
  },
]

export default function GuaranteeStrip() {
  return (
    <section id="guarantees" className="scroll-mt-20 bg-brand-forest text-brand-cream">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-y-8 px-6 py-10 sm:px-8 lg:grid-cols-4 lg:gap-6 lg:py-11">
        {guarantees.map((item) => (
          <div key={item.title} className="text-center lg:text-left">
            <h3 className="font-[family-name:var(--font-display)] text-xl text-white sm:text-2xl">
              {item.title}
            </h3>
            <p className="mt-1.5 text-[10px] font-medium uppercase tracking-[0.18em] text-white/55">
              {item.detail}
            </p>
          </div>
        ))}
      </div>
    </section>
  )
}
