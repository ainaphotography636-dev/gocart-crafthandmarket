import { NextResponse } from "next/server"
import { isR2Configured, uploadProductMediaToR2 } from "@/lib/r2"

export const runtime = "nodejs"

const MAX_FILES = 4
const MAX_IMAGE_BYTES = 5 * 1024 * 1024
const MAX_VIDEO_BYTES = 4 * 1024 * 1024

export async function POST(request) {
  try {
    const formData = await request.formData()
    const artisanId = String(
      formData.get("artisanId") || formData.get("artisanCode") || ""
    ).slice(0, 80)
    const productId = String(
      formData.get("productId") || formData.get("sku") || ""
    ).slice(0, 120)
    const storeId = String(formData.get("storeId") || "anonymous").slice(0, 80)
    const kindHint = String(formData.get("kind") || "")
    const files = formData
      .getAll("files")
      .filter((entry) => entry && typeof entry === "object" && "arrayBuffer" in entry)

    if (!files.length) {
      return NextResponse.json({ ok: false, error: "No media files provided." }, { status: 400 })
    }
    if (files.length > MAX_FILES) {
      return NextResponse.json(
        { ok: false, error: `Upload at most ${MAX_FILES} files at once.` },
        { status: 400 }
      )
    }
    if (!artisanId || !productId) {
      return NextResponse.json(
        {
          ok: false,
          error: "artisanId and productId are required for R2 path artisans/{id}/products/{id}/...",
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
            "Cloudflare R2 is not configured. Add the R2 env vars from your old Crafthand Market project, then redeploy.",
        },
        { status: 503 }
      )
    }

    const uploads = []
    for (const file of files) {
      const type = String(file.type || "")
      const isVideo = type.startsWith("video/") || kindHint === "video"
      const isImage = type.startsWith("image/") || kindHint === "image"

      if (!isVideo && !isImage) {
        return NextResponse.json(
          { ok: false, error: "Only image or video files can be uploaded." },
          { status: 400 }
        )
      }

      const maxBytes = isVideo ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES
      if (file.size > maxBytes) {
        return NextResponse.json(
          {
            ok: false,
            error: isVideo
              ? "Server video upload max is 4MB. Enable R2 CORS for larger videos, or compress the file."
              : "Each image must be 5MB or smaller.",
          },
          { status: 400 }
        )
      }

      const buffer = Buffer.from(await file.arrayBuffer())
      const uploaded = await uploadProductMediaToR2({
        fileBuffer: buffer,
        contentType: type || (isVideo ? "video/mp4" : "image/jpeg"),
        filename: file.name || (isVideo ? "product.mp4" : "product.jpg"),
        artisanId,
        productId,
        storeId,
        kind: isVideo ? "video" : "image",
      })
      uploads.push(uploaded)
    }

    return NextResponse.json({
      ok: true,
      pathTemplate: `artisans/${artisanId}/products/${productId}/`,
      urls: uploads.map((item) => item.url),
      keys: uploads.map((item) => item.key),
    })
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error?.message || "Failed to upload product media." },
      { status: 500 }
    )
  }
}
