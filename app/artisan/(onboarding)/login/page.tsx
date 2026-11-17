import { redirect } from "next/navigation"

type SearchParams = Promise<Record<string, string | string[] | undefined>>

/**
 * Dedicated artisan login entry — reuses `/artisan/join` with login mode.
 */
export default async function ArtisanLoginPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const params = await searchParams
  const nextValue = params.next
  const next = Array.isArray(nextValue) ? nextValue[0] : nextValue
  const query = new URLSearchParams({ mode: "login" })
  if (next) query.set("next", next)
  redirect(`/artisan/join?${query.toString()}`)
}
