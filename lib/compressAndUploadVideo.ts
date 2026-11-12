/**
 * Compress a workshop video in-browser, then POST it to `/api/upload/video`
 * so the clip lands under artisans/{artisanId}/products/{productId}/.
 */

"use client"

import {
  prepareWorkshopVideoForUpload,
  type CompressVideoProgress,
} from "@/lib/video-compressor"

export const FORM_MAX_VIDEO_BYTES = 200 * 1024 * 1024

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
      ? 90
      : progress.stage === "loading"
        ? 5
        : progress.stage === "writing"
          ? 12
          : progress.stage === "reading"
            ? 85
            : Math.round(15 + Math.min(1, Math.max(0, ratio ?? 0)) * 70)

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

/**
 * Compress (when helpful) then upload via the dedicated video API.
 * Progress spans compression (~0–90%) and upload (~90–100%).
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
    percent: 0,
    stage: "validating",
    message: "Validating video...",
  })

  const compressed = await prepareWorkshopVideoForUpload(file, {
    onProgress: (progress) => {
      options.onProgress?.(mapCompressProgress(progress))
    },
  })

  const uploadFile = compressed?.file || file

  options.onProgress?.({
    percent: 92,
    stage: "uploading",
    message: "Uploading compressed video...",
  })

  const formData = new FormData()
  formData.append("file", uploadFile)
  formData.append("artisanId", artisanId)
  formData.append("productId", productId)

  const response = await fetch("/api/upload/video", {
    method: "POST",
    body: formData,
  })
  const payload = await response.json().catch(() => ({}))

  if (!response.ok || !payload?.ok || !payload?.url) {
    const message =
      payload?.error ||
      (response.status === 503
        ? "Cloudflare R2 is not configured for video uploads."
        : "Video upload failed.")
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
    message: "Video uploaded.",
  })

  return {
    ok: true,
    url: String(payload.url),
    key: payload.key ? String(payload.key) : null,
    originalBytes: compressed?.originalBytes ?? file.size,
    compressedBytes: compressed?.compressedBytes ?? uploadFile.size,
    skippedCompression: Boolean(compressed?.skipped),
  }
}
