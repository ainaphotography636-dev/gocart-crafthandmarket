"use client"

import { useEffect } from "react"
import { XIcon } from "lucide-react"
import RoleAuthForm from "@/components/auth/RoleAuthForm"

export type ClientAuthModalProps = {
  open: boolean
  nextPath?: string
  onClose: () => void
  onSuccess: (nextPath: string) => void
}

const CLIENT_MESSAGE =
  "Log in or sign up to save your cart and complete your order."

export default function ClientAuthModal({
  open,
  nextPath = "/cart",
  onClose,
  onSuccess,
}: ClientAuthModalProps) {
  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKeyDown)
    const previous = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      window.removeEventListener("keydown", onKeyDown)
      document.body.style.overflow = previous
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-brand-ink/45 p-4 sm:items-center motion-safe:animate-[fadeIn_0.2s_ease-out]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="client-auth-title"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md overflow-hidden rounded-2xl border border-brand-gold/20 bg-gradient-to-b from-white via-white to-brand-emerald-soft/40 p-6 shadow-xl motion-safe:animate-[slideUp_0.28s_ease-out]"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 rounded-full p-2 text-slate-500 hover:bg-slate-100 hover:text-brand-ink"
          aria-label="Close"
        >
          <XIcon size={18} />
        </button>

        <p className="text-xs uppercase tracking-[0.18em] text-brand-gold">
          Client checkout
        </p>
        <h2
          id="client-auth-title"
          className="mt-2 font-display text-2xl tracking-tight text-brand-ink"
        >
          Save your cart
        </h2>
        <p className="mt-2 text-sm text-slate-500">
          Create a client account or log in to keep your picks and finish ordering.
        </p>

        <div className="mt-5">
          <RoleAuthForm
            intent="client"
            initialMode="signup"
            nextPath={nextPath}
            message={CLIENT_MESSAGE}
            compact
            onSuccess={({ nextPath: destination }) => onSuccess(destination)}
          />
        </div>
      </div>
    </div>
  )
}
