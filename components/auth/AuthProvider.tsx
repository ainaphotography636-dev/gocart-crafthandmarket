"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import { useRouter } from "next/navigation"
import { useDispatch, useSelector } from "react-redux"
import type { User } from "@supabase/supabase-js"
import ClientAuthModal from "@/components/auth/ClientAuthModal"
import {
  consumePendingAuthNext,
  consumePendingCartAdd,
  readPersistedCart,
  setPendingAuthNext,
  setPendingCartAdd,
  writePersistedCart,
} from "@/lib/cartPersistence"
import { addToCart, hydrateCart } from "@/lib/features/cart/cartSlice"
import {
  isArtisanRole,
  isClientRole,
  normalizeMarketplaceRole,
  type MarketplaceRole,
} from "@/lib/supabase/roles"
import { isSupabaseConfigured } from "@/lib/supabase/config"
import { createClient } from "@/utils/supabase/client"

type AuthContextValue = {
  user: User | null
  role: MarketplaceRole | null
  loading: boolean
  isAuthenticated: boolean
  isClient: boolean
  isArtisan: boolean
  /** Gate Add-to-Cart / checkout: opens client auth modal when signed out. */
  requireClientAuth: (options?: {
    productId?: string
    nextPath?: string
  }) => boolean
  openClientAuth: (options?: { nextPath?: string; productId?: string }) => void
  refreshUser: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter()
  const dispatch = useDispatch()
  const cart = useSelector((state: { cart: { total: number; cartItems: Record<string, number> } }) => state.cart)

  const [user, setUser] = useState<User | null>(null)
  const [role, setRole] = useState<MarketplaceRole | null>(null)
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [modalNext, setModalNext] = useState("/cart")
  const [hydratedCart, setHydratedCart] = useState(false)

  const refreshUser = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setUser(null)
      setRole(null)
      setLoading(false)
      return
    }

    try {
      const supabase = createClient()
      const {
        data: { user: nextUser },
      } = await supabase.auth.getUser()
      setUser(nextUser)
      setRole(normalizeMarketplaceRole(nextUser?.user_metadata?.role))
    } catch {
      setUser(null)
      setRole(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const persisted = readPersistedCart()
    if (persisted) {
      dispatch(hydrateCart(persisted))
    }
    setHydratedCart(true)
  }, [dispatch])

  useEffect(() => {
    if (!hydratedCart) return
    writePersistedCart({
      total: cart.total,
      cartItems: cart.cartItems,
    })
  }, [cart, hydratedCart])

  useEffect(() => {
    void refreshUser()
    if (!isSupabaseConfigured()) return

    const supabase = createClient()
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setRole(normalizeMarketplaceRole(session?.user?.user_metadata?.role))
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [refreshUser])

  const openClientAuth = useCallback(
    (options?: { nextPath?: string; productId?: string }) => {
      const nextPath = options?.nextPath || "/cart"
      setModalNext(nextPath)
      setPendingAuthNext(nextPath)
      if (options?.productId) {
        setPendingCartAdd(options.productId)
      }
      setModalOpen(true)
    },
    []
  )

  const requireClientAuth = useCallback(
    (options?: { productId?: string; nextPath?: string }) => {
      if (user) return true
      openClientAuth(options)
      return false
    },
    [openClientAuth, user]
  )

  const handleAuthSuccess = useCallback(
    (nextPath: string) => {
      setModalOpen(false)
      void refreshUser()

      const pendingProductId = consumePendingCartAdd()
      if (pendingProductId) {
        dispatch(addToCart({ productId: pendingProductId }))
      }

      const destination = consumePendingAuthNext(nextPath)
      router.replace(destination)
      router.refresh()
    },
    [dispatch, refreshUser, router]
  )

  const signOut = useCallback(async () => {
    if (!isSupabaseConfigured()) return
    const supabase = createClient()
    await supabase.auth.signOut()
    setUser(null)
    setRole(null)
    router.refresh()
  }, [router])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      role,
      loading,
      isAuthenticated: Boolean(user),
      isClient: isClientRole(role),
      isArtisan: isArtisanRole(role),
      requireClientAuth,
      openClientAuth,
      refreshUser,
      signOut,
    }),
    [
      user,
      role,
      loading,
      requireClientAuth,
      openClientAuth,
      refreshUser,
      signOut,
    ]
  )

  return (
    <AuthContext.Provider value={value}>
      {children}
      <ClientAuthModal
        open={modalOpen}
        nextPath={modalNext}
        onClose={() => setModalOpen(false)}
        onSuccess={handleAuthSuccess}
      />
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider")
  }
  return ctx
}
