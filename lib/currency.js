export const CURRENCIES = {
  USD: { code: 'USD', label: 'USD ($)', symbol: '$', locale: 'en-US' },
  GBP: { code: 'GBP', label: 'GBP (£)', symbol: '£', locale: 'en-GB' },
  CAD: { code: 'CAD', label: 'CAD (C$)', symbol: 'C$', locale: 'en-CA' },
}

export const DEFAULT_CURRENCY = 'USD'

export const CURRENCY_STORAGE_KEY = 'crafthand_currency'

export function getCurrency(code = DEFAULT_CURRENCY) {
  return CURRENCIES[code] || CURRENCIES[DEFAULT_CURRENCY]
}

export function resolveInitialCurrency() {
  const envCode = process.env.NEXT_PUBLIC_CURRENCY_CODE?.toUpperCase()
  if (envCode && CURRENCIES[envCode]) return envCode
  return DEFAULT_CURRENCY
}
