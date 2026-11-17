export const CURRENCIES = {
  INR: { code: 'INR', label: 'INR (₹)', symbol: '₹', locale: 'en-IN' },
  USD: { code: 'USD', label: 'USD ($)', symbol: '$', locale: 'en-US' },
  GBP: { code: 'GBP', label: 'GBP (£)', symbol: '£', locale: 'en-GB' },
  CAD: { code: 'CAD', label: 'CAD (C$)', symbol: 'C$', locale: 'en-CA' },
}

export const DEFAULT_CURRENCY = 'INR'

export const CURRENCY_STORAGE_KEY = 'crafthand_currency'

export function getCurrency(code = DEFAULT_CURRENCY) {
  return CURRENCIES[code] || CURRENCIES[DEFAULT_CURRENCY]
}

export function resolveInitialCurrency() {
  const envCode = process.env.NEXT_PUBLIC_CURRENCY_CODE?.toUpperCase()
  if (envCode && CURRENCIES[envCode]) return envCode
  return DEFAULT_CURRENCY
}

export function formatInr(amount) {
  const value = Number(amount)
  if (!Number.isFinite(value)) return '₹0'
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(value)
}
