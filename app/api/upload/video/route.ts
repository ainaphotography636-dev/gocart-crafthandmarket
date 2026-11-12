import { NextResponse } from "next/server"
import { isR2Configured, uploadProductMediaToR2 } from "@/lib/r2"

export const runtime = "nodejs"

/**
 * Dedicated workshop video upload.
 *
 * Size choice: 25MB — slightly above the shared product-media /api/upload proxy
 * cap (4MB) so a client can POST a single compressed clip without switching to
 * presign, while still rejecting multi-hundred-MB phone reels. Prefer
 * `lib/video-compressor` client-side first for large sources.
 *
 * Object key: artisans/{artisanId}/products/{productId}/{timestamp}-{filename}
 */
const MAX_VIDEO_BYTES = 25 * 1024 * 1024

const ALLOWED_VIDEO_TYPES = new Set([
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/x-m4v",
  "video/x-matroska",
])

function looksLikeVideo(file: File) {
  const type = String(file.type || "").toLowerCase()
  if (type.startsWith("video/")) return true
  if (ALLOWED_VIDEO_TYPES.has(type)) return true
  return /\.(mp4|webm|mov|m4v|mkv)$/i.test(file.name || "")
}

/**
 * POST multipart FormData:
 *   - file: File (required, video)
 *   - artisanId: string (required)
 *   - productId: string (required)
 *
 * Success: { ok: true, url, key, pathTemplate }
 * R2 missing: 503 { ok: false, skipped: true, error }
 */
export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const artisanId = String(formData.get("artisanId") || "").trim().slice(0, 80)
    const productId = String(formData.get("productId") || "").trim().slice(0, 120)
    const entry = formData.get("file")
    const file =
      entry && typeof entry === "object" && "arrayBuffer" in entry
        ? (entry as File)
        : null

    if (!file) {
      return NextResponse.json(
        { ok: false, error: "A video `file` field is required." },
        { status: 400 }
      )
    }
    if (!artisanId || !productId) {
      return NextResponse.json(
        {
          ok: false,
          error: "artisanId and productId are required to build the R2 folder path.",
        },
        { status: 400 }
      )
    }
    if (!looksLikeVideo(file)) {
      return NextResponse.json(
        {
          ok: false,
          error: "Only video files are accepted (mp4, webm, mov, m4v, mkv).",
        },
        { status: 400 }
      )
    }
    if (file.size > MAX_VIDEO_BYTES) {
      return NextResponse.json(
        {
          ok: false,
          error: `Video must be ${Math.round(MAX_VIDEO_BYTES / (1024 * 1024))}MB or smaller for this endpoint. Compress client-side or use the presign flow for larger clips.`,
        },
        { status: 400 }
      )
    }

    if (!isR2Configured()) {
      return NextResponse.json(
        {
          ok: false,
          skipped: true,
          error:
            "Cloudflare R2 is not configured. Set CLOUDFLARE_ACCOUNT_ID (or CLOUDFLARE_R2_ACCOUNT_ID), CLOUDFLARE_R2_ACCESS_KEY_ID, CLOUDFLARE_R2_SECRET_ACCESS_KEY, CLOUDFLARE_R2_BUCKET_NAME, and CLOUDFLARE_R2_PUBLIC_URL (or NEXT_PUBLIC_CLOUDFLARE_R2_PUBLIC_URL).",
        },
        { status: 503 }
      )
    }

    const contentType = String(file.type || "video/mp4")
    const buffer = Buffer.from(await file.arrayBuffer())
    const uploaded = await uploadProductMediaToR2({
      fileBuffer: buffer,
      contentType,
      filename: file.name || "product.mp4",
      artisanId,
      productId,
      kind: "video",
    })

    return NextResponse.json({
      ok: true,
      url: uploaded.url,
      key: uploaded.key,
      pathTemplate: `artisans/${artisanId}/products/${productId}/`,
    })
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to upload video.",
      },
      { status: 500 }
    )
  }
}
