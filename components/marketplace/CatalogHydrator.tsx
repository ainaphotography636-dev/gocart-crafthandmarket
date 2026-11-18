"use client"

import { useEffect, useRef } from "react"
import { useDispatch } from "react-redux"
import { clearProduct, setProduct } from "@/lib/features/product/productSlice"
import type { StorefrontProduct } from "@/lib/marketplace/types"

/**
 * Replace the Redux catalog with server-fetched marketplace products so home /
 * shop widgets never keep stale dummy electronics data.
 */
export default function CatalogHydrator({
  products,
  replace = true,
}: {
  products: StorefrontProduct[]
  /** When true (default), server list fully replaces Redux catalog. */
  replace?: boolean
}) {
  const dispatch = useDispatch()
  const signature = `${replace ? "r" : "m"}:${(products || [])
    .map((item) => item.id)
    .join("|")}`
  const lastSignature = useRef("")

  useEffect(() => {
    if (lastSignature.current === signature) return
    lastSignature.current = signature

    if (!products?.length) {
      if (replace) dispatch(clearProduct())
      return
    }

    dispatch(setProduct(products))
  }, [dispatch, products, replace, signature])

  return null
}
