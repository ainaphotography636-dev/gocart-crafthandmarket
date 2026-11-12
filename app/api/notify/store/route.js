import { NextResponse } from "next/server"
import {
  isEmailConfigured,
  sendEmail,
  storeDecisionEmail,
  storeSubmittedEmail,
} from "@/lib/email"

function appUrlFromRequest(request) {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL
  if (envUrl) return envUrl.replace(/\/$/, "")
  try {
    return new URL(request.url).origin
  } catch {
    return "http://localhost:3000"
  }
}

export async function POST(request) {
  try {
    const body = await request.json()
    const { event, store } = body || {}

    if (!event || !store?.email || !store?.username || !store?.name) {
      return NextResponse.json(
        { ok: false, error: "Missing event or store details" },
        { status: 400 }
      )
    }

    if (!isEmailConfigured()) {
      return NextResponse.json({
        ok: false,
        skipped: true,
        reason:
          "Email is not configured. Set RESEND_API_KEY (and optionally EMAIL_FROM, ADMIN_EMAIL) in Vercel env vars.",
      })
    }

    const appUrl = appUrlFromRequest(request)
    const results = []

    if (event === "store_submitted") {
      const messages = storeSubmittedEmail({ store, appUrl })
      results.push(await sendEmail(messages.artisan))
      if (process.env.ADMIN_EMAIL) {
        results.push(await sendEmail(messages.admin))
      }
    } else if (event === "store_approved" || event === "store_rejected") {
      const status = event === "store_approved" ? "approved" : "rejected"
      const message = storeDecisionEmail({ store, status, appUrl })
      results.push(await sendEmail(message))
    } else {
      return NextResponse.json({ ok: false, error: "Unknown event" }, { status: 400 })
    }

    const failed = results.find((result) => !result.ok && !result.skipped)
    if (failed) {
      return NextResponse.json(
        { ok: false, error: failed.reason || "Failed to send email", results },
        { status: 502 }
      )
    }

    return NextResponse.json({
      ok: true,
      skipped: results.every((result) => result.skipped),
      results,
    })
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error?.message || "Notification failed" },
      { status: 500 }
    )
  }
}
