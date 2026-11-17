"use client"

import { useEffect, useRef } from "react"
import { useDispatch, useSelector } from "react-redux"
import { setProduct } from "@/lib/features/product/productSlice"
import type { StorefrontProduct } from "@/lib/marketplace/types"

/**
 * Merge server-fetched marketplace products into the Redux catalog so cart /
 * home widgets can resolve titles and prices by id.
 */
export default function CatalogHydrator({
  products,
}: {
  products: StorefrontProduct[]
}) {
  const dispatch = useDispatch()
  const existing = useSelector(
    (state: { product: { list: StorefrontProduct[] } }) => state.product.list
  )
  const signature = products.map((item) => item.id).join("|")
  const lastSignature = useRef("")

  useEffect(() => {
    if (!products?.length) return
    if (lastSignature.current === signature) return
    lastSignature.current = signature

    const byId = new Map<string, StorefrontProduct>()
    for (const item of existing || []) {
      if (item?.id) byId.set(String(item.id), item)
    }
    for (const item of products) {
      byId.set(String(item.id), item)
    }
    dispatch(setProduct([...byId.values()]))
  }, [dispatch, products, existing, signature])

  return null
}
