import { NextResponse } from "next/server"
import { createPresignedProductUpload, isR2Configured } from "@/lib/r2"

export const runtime = "nodejs"

const ALLOWED_IMAGE = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/jpg"]
const ALLOWED_VIDEO = ["video/mp4", "video/webm", "video/quicktime"]

export async function POST(request) {
  try {
    if (!isR2Configured()) {
      return NextResponse.json(
        {
          ok: false,
          skipped: true,
          error:
            "Cloudflare R2 is not configured. Add R2 env vars and redeploy. For browser video uploads, also enable CORS PUT on the bucket.",
        },
        { status: 503 }
      )
    }

    const body = await request.json()
    const filename = String(body?.filename || "upload.bin")
    const contentType = String(body?.contentType || "application/octet-stream")
    const storeId = String(body?.storeId || "anonymous").slice(0, 80)
    const kind = body?.kind === "video" ? "video" : "image"

    if (kind === "image" && !ALLOWED_IMAGE.includes(contentType) && !contentType.startsWith("image/")) {
      return NextResponse.json({ ok: false, error: "Unsupported image type." }, { status: 400 })
    }
    if (kind === "video" && !ALLOWED_VIDEO.includes(contentType) && !contentType.startsWith("video/")) {
      return NextResponse.json({ ok: false, error: "Unsupported video type. Use MP4 or WebM." }, { status: 400 })
    }

    const signed = await createPresignedProductUpload({
      filename,
      contentType,
      storeId,
      kind,
    })

    return NextResponse.json({ ok: true, ...signed })
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error?.message || "Could not create upload URL." },
      { status: 500 }
    )
  }
}
