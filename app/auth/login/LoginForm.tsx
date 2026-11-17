'use client'

import { useRouter, useSearchParams } from "next/navigation"
import RoleAuthForm from "@/components/auth/RoleAuthForm"
import type { AuthIntent } from "@/lib/supabase/roles"

export default function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const intentParam = searchParams.get("intent")
  const intent: AuthIntent = intentParam === "artisan" ? "artisan" : "client"
  const nextPath =
    searchParams.get("next") ||
    (intent === "artisan" ? "/store" : "/cart")

  return (
    <RoleAuthForm
      intent={intent}
      initialMode="login"
      nextPath={nextPath}
      message={
        intent === "client"
          ? "Log in or sign up to save your cart and complete your order."
          : "Artisan partners sign in here to reach the workshop dashboard."
      }
      onSuccess={({ nextPath: destination }) => {
        router.replace(destination)
        router.refresh()
      }}
    />
  )
}
