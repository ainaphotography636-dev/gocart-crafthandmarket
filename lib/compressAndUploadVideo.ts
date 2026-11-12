/**
 * Compress a workshop video in-browser, then upload to Cloudflare R2 under
 * artisans/{artisanId}/products/{productId}/.
 *
 * Small clips POST through `/api/upload/video`. Larger clips (typical after
 * 720p encode, and anything over Vercel's ~4.5MB body limit) use a presigned
 * PUT so the browser talks to R2 directly.
 */

"use client"

import {
  COMPRESS_THRESHOLD_BYTES,
  prepareWorkshopVideoForUpload,
  type CompressVideoProgress,
} from "@/lib/video-compressor"

export const FORM_MAX_VIDEO_BYTES = 200 * 1024 * 1024

/** Stay under Vercel serverless request body limits for the proxy route. */
const SERVER_PROXY_LIMIT_BYTES = 3.5 * 1024 * 1024

export type CompressAndUploadProgress = {
  /** 0–100 for UI percentage displays. */
  percent: number
  stage: "validating" | "compressing" | "uploading" | "done" | "error"
  message: string
}

export type CompressAndUploadOptions = {
  artisanId: string
  productId: string
  onProgress?: (progress: CompressAndUploadProgress) => void
}

export type CompressAndUploadResult = {
  ok: true
  url: string
  key: string | null
  originalBytes: number
  compressedBytes: number
  skippedCompression: boolean
}

function mapCompressProgress(
  progress: CompressVideoProgress
): CompressAndUploadProgress {
  const ratio = typeof progress.ratio === "number" ? progress.ratio : undefined
  const percent =
    progress.stage === "done"
      ? 88
      : progress.stage === "loading"
        ? 5
        : progress.stage === "writing"
          ? 12
          : progress.stage === "reading"
            ? 82
            : Math.round(15 + Math.min(1, Math.max(0, ratio ?? 0)) * 65)

  const percentLabel =
    typeof ratio === "number" ? Math.round(Math.min(1, Math.max(0, ratio)) * 100) : null

  let message = progress.message
  if (progress.stage === "encoding" && percentLabel !== null) {
    message = `Compressing video... ${percentLabel}%`
  } else if (progress.stage === "loading") {
    message = "Loading compressor..."
  } else if (progress.stage === "writing") {
    message = "Preparing video..."
  }

  return {
    percent,
    stage: "compressing",
    message,
  }
}

async function readErrorMessage(response: Response, fallback: string) {
  const contentType = response.headers.get("content-type") || ""
  if (contentType.includes("application/json")) {
    const payload = await response.json().catch(() => ({} as Record<string, unknown>))
    if (payload && typeof payload === "object" && "error" in payload && payload.error) {
      return String(payload.error)
    }
  } else {
    const text = await response.text().catch(() => "")
    if (response.status === 413 || /request entity too large|payload too large/i.test(text)) {
      return "Video is too large for server upload. Compression or R2 presign is required."
    }
    if (text && text.length < 280 && !text.trim().startsWith("<")) {
      return text
    }
  }
  if (response.status === 503) {
    return "Cloudflare R2 is not configured for video uploads."
  }
  if (response.status === 413) {
    return "Video is too large for server upload. Try again after compression."
  }
  return fallback
}

async function uploadViaServerProxy(
  file: File,
  artisanId: string,
  productId: string
): Promise<{ url: string; key: string | null }> {
  const formData = new FormData()
  formData.append("file", file)
  formData.append("artisanId", artisanId)
  formData.append("productId", productId)

  const response = await fetch("/api/upload/video", {
    method: "POST",
    body: formData,
  })

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "Video upload failed."))
  }

  const payload = await response.json().catch(() => ({}))
  if (!payload?.ok || !payload?.url) {
    throw new Error(payload?.error || "Video upload failed.")
  }

  return {
    url: String(payload.url),
    key: payload.key ? String(payload.key) : null,
  }
}

async function uploadViaPresign(
  file: File,
  artisanId: string,
  productId: string,
  onProgress?: (progress: CompressAndUploadProgress) => void
): Promise<{ url: string; key: string | null }> {
  onProgress?.({
    percent: 90,
    stage: "uploading",
    message: "Preparing direct R2 upload...",
  })

  const signResponse = await fetch("/api/upload/presign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      filename: file.name || "workshop-video.mp4",
      contentType: file.type || "video/mp4",
      artisanId,
      productId,
      kind: "video",
    }),
  })

  if (!signResponse.ok) {
    throw new Error(
      await readErrorMessage(
        signResponse,
        "Could not prepare Cloudflare R2 upload for video."
      )
    )
  }

  const signed = await signResponse.json().catch(() => ({}))
  if (!signed?.ok || !signed?.uploadUrl || !signed?.publicUrl) {
    throw new Error(signed?.error || "Could not prepare Cloudflare R2 upload for video.")
  }

  onProgress?.({
    percent: 94,
    stage: "uploading",
    message: "Uploading video to Cloudflare R2...",
  })

  let put: Response
  try {
    put = await fetch(String(signed.uploadUrl), {
      method: "PUT",
      headers: {
        "Content-Type": signed.contentType || file.type || "video/mp4",
      },
      body: file,
    })
  } catch {
    throw new Error(
      "Browser upload to R2 was blocked (Failed to fetch). Enable CORS PUT on the crafthandmarket bucket for your Vercel domain."
    )
  }

  if (!put.ok) {
    throw new Error(
      `R2 rejected the video upload (${put.status}). Check bucket credentials and CORS.`
    )
  }

  return {
    url: String(signed.publicUrl),
    key: signed.key ? String(signed.key) : null,
  }
}

/**
 * Compress (when helpful) then upload via proxy or presigned PUT.
 * Progress spans compression (~0–88%) and upload (~90–100%).
 */
export async function compressAndUploadVideo(
  file: File,
  options: CompressAndUploadOptions
): Promise<CompressAndUploadResult> {
  const artisanId = String(options.artisanId || "").trim()
  const productId = String(options.productId || "").trim()

  if (!(file instanceof File)) {
    throw new Error("A video File is required.")
  }
  if (!artisanId || !productId) {
    throw new Error("artisanId and productId are required before uploading video.")
  }
  if (file.size > FORM_MAX_VIDEO_BYTES) {
    throw new Error(
      `Video must be ${Math.round(FORM_MAX_VIDEO_BYTES / (1024 * 1024))}MB or smaller.`
    )
  }

  options.onProgress?.({
    percent: 2,
    stage: "validating",
    message: "Validating video...",
  })

  const compressed = await prepareWorkshopVideoForUpload(file, {
    onProgress: (progress) => {
      options.onProgress?.(mapCompressProgress(progress))
    },
  })

  const uploadFile = compressed?.file || file
  const skippedCompression = Boolean(compressed?.skipped)
  const compressionFailed =
    skippedCompression &&
    compressed?.reason &&
    compressed.reason !== "below-threshold"

  // If WASM compression failed and the source is still large, don't pretend the
  // proxy upload will work — surface the real compressor error.
  if (compressionFailed && file.size > SERVER_PROXY_LIMIT_BYTES) {
    const reason = compressed?.reason || "Video compression failed."
    options.onProgress?.({
      percent: 0,
      stage: "error",
      message: reason,
    })
    throw new Error(
      `${reason} Large videos need in-browser compression before R2 upload.`
    )
  }

  options.onProgress?.({
    percent: 90,
    stage: "uploading",
    message:
      uploadFile.size > SERVER_PROXY_LIMIT_BYTES
        ? "Uploading compressed video to R2..."
        : "Uploading video...",
  })

  let uploaded: { url: string; key: string | null }
  try {
    if (uploadFile.size <= SERVER_PROXY_LIMIT_BYTES) {
      try {
        uploaded = await uploadViaServerProxy(uploadFile, artisanId, productId)
      } catch (proxyError) {
        // Body-limit / proxy failures → fall through to direct R2 PUT.
        const message =
          proxyError instanceof Error ? proxyError.message : String(proxyError)
        if (/too large|413|entity too large|payload/i.test(message)) {
          uploaded = await uploadViaPresign(
            uploadFile,
            artisanId,
            productId,
            options.onProgress
          )
        } else {
          throw proxyError
        }
      }
    } else {
      uploaded = await uploadViaPresign(
        uploadFile,
        artisanId,
        productId,
        options.onProgress
      )
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Video upload failed."
    options.onProgress?.({
      percent: 0,
      stage: "error",
      message,
    })
    throw new Error(message)
  }

  options.onProgress?.({
    percent: 100,
    stage: "done",
    message:
      skippedCompression && compressed?.reason === "below-threshold"
        ? "Video uploaded."
        : `Video uploaded (${(uploadFile.size / (1024 * 1024)).toFixed(1)}MB).`,
  })

  return {
    ok: true,
    url: uploaded.url,
    key: uploaded.key,
    originalBytes: compressed?.originalBytes ?? file.size,
    compressedBytes: compressed?.compressedBytes ?? uploadFile.size,
    skippedCompression,
  }
}

export { COMPRESS_THRESHOLD_BYTES }
