'use client'
import { useCurrency } from '@/components/CurrencyProvider'

export default function CurrencySwitcher({ className = '' }) {
  const { currencyCode, setCurrencyCode, currencies } = useCurrency()

  return (
    <label className={`inline-flex items-center gap-1.5 text-sm text-slate-600 ${className}`}>
      <span className="sr-only">Currency</span>
      <select
        aria-label="Select currency"
        value={currencyCode}
        onChange={(e) => setCurrencyCode(e.target.value)}
        className="bg-amber-50 border border-brand-gold/40 text-slate-700 text-sm rounded-md px-2 py-1.5 outline-none focus:ring-2 focus:ring-brand-emerald/40 cursor-pointer"
      >
        {Object.values(currencies).map((currency) => (
          <option key={currency.code} value={currency.code}>
            {currency.label}
          </option>
        ))}
      </select>
    </label>
  )
}
