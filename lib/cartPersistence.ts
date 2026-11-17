const CART_STORAGE_KEY = "crafthand_cart_v1"
const PENDING_ADD_KEY = "crafthand_pending_cart_add"
const PENDING_NEXT_KEY = "crafthand_auth_next"

export type PersistedCart = {
  total: number
  cartItems: Record<string, number>
}

export function readPersistedCart(): PersistedCart | null {
  if (typeof window === "undefined") return null
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as PersistedCart
    if (!parsed || typeof parsed !== "object") return null
    return {
      total: Number(parsed.total) || 0,
      cartItems:
        parsed.cartItems && typeof parsed.cartItems === "object"
          ? parsed.cartItems
          : {},
    }
  } catch {
    return null
  }
}

export function writePersistedCart(cart: PersistedCart) {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart))
  } catch {
    // Quota / private mode — ignore.
  }
}

export function setPendingCartAdd(productId: string) {
  if (typeof window === "undefined") return
  sessionStorage.setItem(PENDING_ADD_KEY, productId)
}

export function consumePendingCartAdd() {
  if (typeof window === "undefined") return null
  const value = sessionStorage.getItem(PENDING_ADD_KEY)
  sessionStorage.removeItem(PENDING_ADD_KEY)
  return value
}

export function setPendingAuthNext(path: string) {
  if (typeof window === "undefined") return
  sessionStorage.setItem(PENDING_NEXT_KEY, path)
}

export function consumePendingAuthNext(fallback = "/cart") {
  if (typeof window === "undefined") return fallback
  const value = sessionStorage.getItem(PENDING_NEXT_KEY)
  sessionStorage.removeItem(PENDING_NEXT_KEY)
  return value || fallback
}
