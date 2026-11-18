import React from 'react'

const Newsletter = () => {
  return (
    <section className="border-t border-brand-forest/10 bg-[#efe8df] px-6 py-16 sm:px-8 sm:py-20">
      <div className="mx-auto max-w-xl text-center">
        <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-brand-terracotta">
          Studio Notes
        </p>
        <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl text-brand-slate">
          Join the Workshop Letter
        </h2>
        <p className="mt-3 text-sm text-slate-600">
          New arrivals, artisan stories, and collector releases — delivered quietly.
        </p>
        <div className="mt-8 flex flex-col gap-2 sm:flex-row sm:bg-white sm:p-1 sm:ring-1 sm:ring-brand-forest/10">
          <input
            className="flex-1 bg-white px-4 py-3 text-sm outline-none ring-1 ring-brand-forest/10 sm:ring-0"
            type="email"
            placeholder="Enter your email address"
            aria-label="Email address"
          />
          <button
            type="button"
            className="bg-brand-forest px-6 py-3 text-sm font-medium text-white transition hover:bg-brand-terracotta"
          >
            Get Updates
          </button>
        </div>
      </div>
    </section>
  )
}

export default Newsletter
