/**
 * Client-side artisan video compression via ffmpeg.wasm.
 *
 * Install (if missing):
 *   npm install @ffmpeg/ffmpeg @ffmpeg/util @ffmpeg/core
 *
 * Loads `@ffmpeg/core` WebAssembly from same-origin `/ffmpeg/*` (copied into
 * `public/ffmpeg`). Requires COOP/COEP headers in `next.config.js` so the
 * browser can use SharedArrayBuffer for the FFmpeg worker.
 *
 * Target: 720p HD, libx264 CRF 28 — strips phone-reel bloat while keeping craft detail.
 */

"use client"

import { FFmpeg } from "@ffmpeg/ffmpeg"
import { fetchFile, toBlobURL } from "@ffmpeg/util"

/** Keep in sync with `public/ffmpeg` + `@ffmpeg/core` package version. */
export const FFMPEG_CORE_VERSION = "0.12.10"

/**
 * Prefer same-origin UMD assets under /ffmpeg (COEP-safe + no relative imports).
 * CDN UMD builds are blob-URL fallbacks when local assets are missing.
 */
const CORE_BASES = [
  "/ffmpeg",
  `https://unpkg.com/@ffmpeg/core@${FFMPEG_CORE_VERSION}/dist/umd`,
  `https://cdn.jsdelivr.net/npm/@ffmpeg/core@${FFMPEG_CORE_VERSION}/dist/umd`,
]

const WORKER_URLS = [
  "/ffmpeg/worker.js",
  "https://unpkg.com/@ffmpeg/ffmpeg@0.12.15/dist/umd/814.ffmpeg.js",
  "https://cdn.jsdelivr.net/npm/@ffmpeg/ffmpeg@0.12.15/dist/umd/814.ffmpeg.js",
]

/** Compress when over Vercel proxy limits / phone-reel bloat. */
export const COMPRESS_THRESHOLD_BYTES = Math.round(3.5 * 1024 * 1024)

/** Soft ceiling for raw phone reels before compression. */
export const MAX_SOURCE_VIDEO_BYTES = 250 * 1024 * 1024

export type CompressVideoProgress = {
  /** 0–1 encode progress from ffmpeg.wasm (undefined while core is loading). */
  ratio?: number
  stage: "loading" | "writing" | "encoding" | "reading" | "done"
  message: string
}

export type CompressVideoOptions = {
  /** Height in pixels; width stays even via `scale=-2:HEIGHT`. Default 720. */
  height?: number
  /** x264 constant rate factor. Default 28 (high compression, craft-safe). */
  crf?: number
  /** x264 preset. Default `veryfast` for browser encode time. */
  preset?: string
  onProgress?: (progress: CompressVideoProgress) => void
}

export type CompressVideoResult = {
  file: File
  blob: Blob
  originalBytes: number
  compressedBytes: number
  skipped: boolean
  reason?: string
}

let ffmpegSingleton: FFmpeg | null = null
let loadPromise: Promise<FFmpeg> | null = null

function assertBrowser() {
  if (typeof window === "undefined") {
    throw new Error("Video compression only runs in the browser.")
  }
}

function extensionFor(file: File) {
  const fromName = file.name.split(".").pop()?.toLowerCase()
  if (fromName && /^[a-z0-9]{2,5}$/.test(fromName)) return fromName
  if (file.type.includes("webm")) return "webm"
  if (file.type.includes("quicktime") || file.type.includes("mov")) return "mov"
  return "mp4"
}

function outputFileName(file: File) {
  const base = file.name.replace(/\.[^.]+$/, "") || "workshop-video"
  return `${base}-720p.mp4`
}

async function toAssetURL(url: string, mimeType: string) {
  // Same-origin /ffmpeg assets can load directly; CDN URLs become blob: URLs.
  if (url.startsWith("/")) return url
  return toBlobURL(url, mimeType)
}

/**
 * Lazily load a single FFmpeg instance (and `@ffmpeg/core` WASM) for this tab.
 */
export async function loadVideoCompressor(
  onProgress?: (progress: CompressVideoProgress) => void
): Promise<FFmpeg> {
  assertBrowser()

  if (ffmpegSingleton?.loaded) return ffmpegSingleton
  if (loadPromise) return loadPromise

  onProgress?.({
    stage: "loading",
    message: "Loading FFmpeg WebAssembly (~30MB, one-time per session)…",
  })

  loadPromise = (async () => {
    const ffmpeg = ffmpegSingleton ?? new FFmpeg()
    ffmpegSingleton = ffmpeg

    if (!ffmpeg.loaded) {
      let lastError: unknown

      for (let i = 0; i < CORE_BASES.length; i += 1) {
        const coreBase = CORE_BASES[i]
        const workerSource = WORKER_URLS[Math.min(i, WORKER_URLS.length - 1)]
        try {
          const coreURL = await toAssetURL(
            `${coreBase}/ffmpeg-core.js`,
            "text/javascript"
          )
          const wasmURL = await toAssetURL(
            `${coreBase}/ffmpeg-core.wasm`,
            "application/wasm"
          )
          // Blob URL keeps the worker same-origin under COEP require-corp.
          const classWorkerURL = await toBlobURL(
            workerSource.startsWith("http")
              ? workerSource
              : `${window.location.origin}${workerSource}`,
            "text/javascript"
          )

          await ffmpeg.load({
            coreURL,
            wasmURL,
            classWorkerURL,
          })
          lastError = null
          break
        } catch (error) {
          lastError = error
        }
      }

      if (!ffmpeg.loaded) {
        const detail =
          lastError instanceof Error && lastError.message
            ? ` (${lastError.message})`
            : ""
        throw new Error(
          `Could not load FFmpeg WebAssembly for video compression${detail}. Ensure COOP/COEP headers are enabled and /ffmpeg assets are reachable.`
        )
      }
    }

    return ffmpeg
  })()

  try {
    return await loadPromise
  } catch (error) {
    loadPromise = null
    ffmpegSingleton = null
    throw error instanceof Error
      ? error
      : new Error("Could not load FFmpeg WebAssembly for video compression.")
  }
}

/**
 * Downscale + re-encode a workshop video for Cloudflare R2 upload.
 *
 * FFmpeg args (high compression, handicraft-safe quality):
 *   -vf scale=-2:720  -c:v libx264  -crf 28  -preset veryfast
 *   -c:a aac  -b:a 128k  -movflags +faststart
 */
export async function compressWorkshopVideo(
  file: File,
  options: CompressVideoOptions = {}
): Promise<CompressVideoResult> {
  assertBrowser()

  if (!(file instanceof File)) {
    throw new Error("A video File is required.")
  }
  if (!file.type.startsWith("video/") && !/\.(mp4|webm|mov|m4v|mkv)$/i.test(file.name)) {
    throw new Error("Only video files can be compressed.")
  }
  if (file.size > MAX_SOURCE_VIDEO_BYTES) {
    throw new Error(
      `Workshop video must be ${Math.round(MAX_SOURCE_VIDEO_BYTES / (1024 * 1024))}MB or smaller before compression.`
    )
  }

  const originalBytes = file.size
  const height = options.height ?? 720
  const crf = options.crf ?? 28
  const preset = options.preset ?? "veryfast"
  const onProgress = options.onProgress

  // Already small enough for a direct server/proxy upload — skip WASM encode.
  if (originalBytes <= COMPRESS_THRESHOLD_BYTES) {
    onProgress?.({
      stage: "done",
      ratio: 1,
      message: "Video is already compact; skipping compression.",
    })
    return {
      file,
      blob: file,
      originalBytes,
      compressedBytes: originalBytes,
      skipped: true,
      reason: "below-threshold",
    }
  }

  const ffmpeg = await loadVideoCompressor(onProgress)

  const progressHandler = ({ progress }: { progress: number }) => {
    onProgress?.({
      stage: "encoding",
      ratio: Math.min(1, Math.max(0, progress)),
      message: `Compressing to ${height}p (CRF ${crf})… ${Math.round(Math.min(1, progress) * 100)}%`,
    })
  }
  ffmpeg.on("progress", progressHandler)

  const inputName = `input.${extensionFor(file)}`
  const outputName = "output.mp4"

  try {
    onProgress?.({
      stage: "writing",
      message: "Preparing video for compression…",
    })
    await ffmpeg.writeFile(inputName, await fetchFile(file))

    onProgress?.({
      stage: "encoding",
      ratio: 0,
      message: `Compressing to ${height}p (libx264, CRF ${crf})…`,
    })

    const code = await ffmpeg.exec([
      "-i",
      inputName,
      "-vf",
      `scale=-2:${height}`,
      "-c:v",
      "libx264",
      "-preset",
      preset,
      "-crf",
      String(crf),
      "-c:a",
      "aac",
      "-b:a",
      "128k",
      "-ac",
      "2",
      "-movflags",
      "+faststart",
      "-y",
      outputName,
    ])

    if (code !== 0) {
      throw new Error(`FFmpeg exited with code ${code}. Try a shorter MP4 clip.`)
    }

    onProgress?.({
      stage: "reading",
      ratio: 1,
      message: "Reading compressed video…",
    })

    const data = await ffmpeg.readFile(outputName)
    const bytes =
      data instanceof Uint8Array
        ? data
        : new TextEncoder().encode(String(data))
    // Copy into a fresh ArrayBuffer so BlobPart typing stays clean under strict DOM libs.
    const buffer = bytes.buffer.slice(
      bytes.byteOffset,
      bytes.byteOffset + bytes.byteLength
    ) as ArrayBuffer
    const blob = new Blob([buffer], { type: "video/mp4" })
    const compressed = new File([blob], outputFileName(file), {
      type: "video/mp4",
      lastModified: Date.now(),
    })

    onProgress?.({
      stage: "done",
      ratio: 1,
      message: `Compressed ${formatMb(originalBytes)} → ${formatMb(compressed.size)}`,
    })

    return {
      file: compressed,
      blob,
      originalBytes,
      compressedBytes: compressed.size,
      skipped: false,
    }
  } finally {
    ffmpeg.off("progress", progressHandler)
    try {
      await ffmpeg.deleteFile(inputName)
    } catch {
      // ignore missing input
    }
    try {
      await ffmpeg.deleteFile(outputName)
    } catch {
      // ignore missing output
    }
  }
}

function formatMb(bytes: number) {
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
}

/**
 * Compress when helpful; always returns a File ready for R2 upload.
 * Falls back to the original file if WASM load/encode fails (caller may still reject by size).
 */
export async function prepareWorkshopVideoForUpload(
  file: File | null | undefined,
  options: CompressVideoOptions = {}
): Promise<CompressVideoResult | null> {
  if (!file) return null

  try {
    return await compressWorkshopVideo(file, options)
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Video compression failed."
    options.onProgress?.({
      stage: "done",
      message: `Compression skipped: ${message}`,
    })
    return {
      file,
      blob: file,
      originalBytes: file.size,
      compressedBytes: file.size,
      skipped: true,
      reason: message,
    }
  }
}
