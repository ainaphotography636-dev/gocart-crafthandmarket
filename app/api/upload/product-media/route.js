import { NextResponse } from "next/server"
import { isR2Configured, uploadProductMediaToR2 } from "@/lib/r2"

export const runtime = "nodejs"

const MAX_FILES = 4
const MAX_BYTES = 5 * 1024 * 1024

export async function POST(request) {
  try {
    const formData = await request.formData()
    const storeId = String(formData.get("storeId") || "anonymous").slice(0, 80)
    const files = formData
      .getAll("files")
      .filter((entry) => entry && typeof entry === "object" && "arrayBuffer" in entry)

    if (!files.length) {
      return NextResponse.json({ ok: false, error: "No product images provided." }, { status: 400 })
    }
    if (files.length > MAX_FILES) {
      return NextResponse.json(
        { ok: false, error: `Upload at most ${MAX_FILES} images.` },
        { status: 400 }
      )
    }

    if (!isR2Configured()) {
      return NextResponse.json(
        {
          ok: false,
          skipped: true,
          error:
            "Cloudflare R2 is not configured. Add CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_R2_ACCESS_KEY_ID, CLOUDFLARE_R2_SECRET_ACCESS_KEY, CLOUDFLARE_R2_BUCKET_NAME, and CLOUDFLARE_R2_PUBLIC_URL.",
        },
        { status: 503 }
      )
    }

    const uploads = []
    for (const file of files) {
      if (!String(file.type || "").startsWith("image/")) {
        return NextResponse.json(
          { ok: false, error: "Only image files can be uploaded." },
          { status: 400 }
        )
      }
      if (file.size > MAX_BYTES) {
        return NextResponse.json(
          { ok: false, error: "Each image must be 5MB or smaller." },
          { status: 400 }
        )
      }

      const buffer = Buffer.from(await file.arrayBuffer())
      const uploaded = await uploadProductMediaToR2({
        fileBuffer: buffer,
        contentType: file.type,
        filename: file.name || "product.jpg",
        storeId,
      })
      uploads.push(uploaded)
    }

    return NextResponse.json({
      ok: true,
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
