'use client'
import React from 'react'

export default function Banner() {
  const [isOpen, setIsOpen] = React.useState(true)

  if (!isOpen) return null

  return (
    <div className="w-full border-b border-brand-forest/10 bg-brand-forest px-6 py-2 text-center text-[11px] font-medium uppercase tracking-[0.22em] text-white/80">
      <div className="relative mx-auto flex max-w-7xl items-center justify-center">
        <p>Video-verified crafts · Escrow protected · Direct from rural workshops</p>
        <button
          onClick={() => setIsOpen(false)}
          type="button"
          aria-label="Dismiss banner"
          className="absolute right-0 p-1 text-white/70 hover:text-white"
        >
          <svg width="12" height="12" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect y="12.532" width="17.498" height="2.1" rx="1.05" transform="rotate(-45.74 0 12.532)" fill="currentColor" />
            <rect x="12.533" y="13.915" width="17.498" height="2.1" rx="1.05" transform="rotate(-135.74 12.533 13.915)" fill="currentColor" />
          </svg>
        </button>
      </div>
    </div>
  )
}
