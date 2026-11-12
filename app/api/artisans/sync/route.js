import { NextResponse } from "next/server"
import { isR2Configured, syncArtisanProfileToR2 } from "@/lib/r2"

export const runtime = "nodejs"

export async function POST(request) {
  try {
    if (!isR2Configured()) {
      return NextResponse.json(
        {
          ok: false,
          skipped: true,
          error:
            "Cloudflare R2 is not configured. Add R2 env vars on Vercel, then sync artisan profiles.",
        },
        { status: 503 }
      )
    }

    const body = await request.json()
    const store = body?.store
    if (!store?.name || !store?.username) {
      return NextResponse.json(
        { ok: false, error: "Store name and username are required." },
        { status: 400 }
      )
    }

    const artisan = await syncArtisanProfileToR2(store)
    return NextResponse.json({ ok: true, artisan })
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error?.message || "Failed to sync artisan profile." },
      { status: 500 }
    )
  }
}
