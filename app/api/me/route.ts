import { createSupabaseContext } from "@/lib/supabase/context"

/**
 * Smoke-test route for `@supabase/server` + cookie session composition.
 * Returns the signed-in user's claims and profile row when present.
 */
export async function GET() {
  const { data: ctx, error } = await createSupabaseContext({ auth: "user" })

  if (error || !ctx) {
    return Response.json(
      { message: error?.message || "Unauthorized" },
      { status: 401 }
    )
  }

  const { data: profile, error: profileError } = await ctx.supabase
    .from("profiles")
    .select("id, email, full_name, role, created_at")
    .eq("id", ctx.userClaims?.id ?? "")
    .maybeSingle()

  if (profileError) {
    return Response.json(
      {
        userClaims: ctx.userClaims,
        authMode: ctx.authMode,
        profile: null,
        profileError: profileError.message,
      },
      { status: 200 }
    )
  }

  return Response.json({
    userClaims: ctx.userClaims,
    authMode: ctx.authMode,
    profile,
  })
}
