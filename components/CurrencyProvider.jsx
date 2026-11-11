'use client'
import { createContext, useContext, useEffect, useState } from 'react'
import {
  CURRENCIES,
  CURRENCY_STORAGE_KEY,
  DEFAULT_CURRENCY,
  getCurrency,
  resolveInitialCurrency,
} from '@/lib/currency'

const CurrencyContext = createContext({
  currencyCode: DEFAULT_CURRENCY,
  currency: CURRENCIES[DEFAULT_CURRENCY],
  setCurrencyCode: () => {},
  currencies: CURRENCIES,
})

export function CurrencyProvider({ children }) {
  const [currencyCode, setCurrencyCodeState] = useState(DEFAULT_CURRENCY)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(CURRENCY_STORAGE_KEY)
      if (stored && CURRENCIES[stored]) {
        setCurrencyCodeState(stored)
      } else {
        setCurrencyCodeState(resolveInitialCurrency())
      }
    } catch {
      setCurrencyCodeState(resolveInitialCurrency())
    }
    setReady(true)
  }, [])

  const setCurrencyCode = (code) => {
    if (!CURRENCIES[code]) return
    setCurrencyCodeState(code)
    try {
      localStorage.setItem(CURRENCY_STORAGE_KEY, code)
    } catch {
      // ignore storage errors
    }
  }

  return (
    <CurrencyContext.Provider
      value={{
        currencyCode,
        currency: getCurrency(currencyCode),
        setCurrencyCode,
        currencies: CURRENCIES,
        ready,
      }}
    >
      {children}
    </CurrencyContext.Provider>
  )
}

export function useCurrency() {
  return useContext(CurrencyContext)
}
