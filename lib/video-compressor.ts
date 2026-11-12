/**
 * Client-side artisan video compression via ffmpeg.wasm (+ MediaRecorder fallback).
 *
 * Install (if missing):
 *   npm install @ffmpeg/ffmpeg @ffmpeg/util @ffmpeg/core
 *
 * Assets are copied to `/ffmpeg/*` by `scripts/copy-ffmpeg-assets.mjs`.
 * `next.config.js` must send COOP/COEP so the FFmpeg module worker can run.
 *
 * Target: 720p HD, libx264 CRF 28 — strips phone-reel bloat while keeping craft detail.
 */

"use client"

import { FFmpeg } from "@ffmpeg/ffmpeg"
import { fetchFile, toBlobURL } from "@ffmpeg/util"

/** Keep in sync with `public/ffmpeg` + `@ffmpeg/core` package version. */
export const FFMPEG_CORE_VERSION = "0.12.10"

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

function outputFileName(file: File, ext = "mp4") {
  const base = file.name.replace(/\.[^.]+$/, "") || "workshop-video"
  return `${base}-720p.${ext}`
}

function absoluteAsset(path: string) {
  if (path.startsWith("http://") || path.startsWith("https://") || path.startsWith("blob:")) {
    return path
  }
  const normalized = path.startsWith("/") ? path : `/${path}`
  return `${window.location.origin}${normalized}`
}

/**
 * Lazily load a single FFmpeg instance (and `@ffmpeg/core` WASM) for this tab.
 *
 * Important: `classWorkerURL` must be a same-origin /ffmpeg/worker.js URL (not a
 * blob). The package creates a module worker, and the ESM worker imports
 * ./const.js + ./errors.js relative to that URL.
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
      const coreJs = absoluteAsset("/ffmpeg/ffmpeg-core.js")
      const coreWasm = absoluteAsset("/ffmpeg/ffmpeg-core.wasm")
      const workerJs = absoluteAsset("/ffmpeg/worker.js")

      // Verify assets are reachable before invoking the worker (clearer errors).
      const assetChecks = await Promise.all(
        [coreJs, coreWasm, workerJs].map(async (url) => {
          try {
            const response = await fetch(url, { method: "HEAD", cache: "force-cache" })
            return { url, ok: response.ok, status: response.status }
          } catch (error) {
            return {
              url,
              ok: false,
              status: 0,
              error: error instanceof Error ? error.message : "fetch failed",
            }
          }
        })
      )
      const missing = assetChecks.filter((item) => !item.ok)
      if (missing.length) {
        throw new Error(
          `FFmpeg assets missing (${missing
            .map((item) => `${item.url} → ${item.status || item.error}`)
            .join(", ")}). Redeploy so /ffmpeg is published.`
        )
      }

      try {
        const coreURL = await toBlobURL(coreJs, "text/javascript")
        const wasmURL = await toBlobURL(coreWasm, "application/wasm")

        await ffmpeg.load({
          coreURL,
          wasmURL,
          // Absolute same-origin URL — do NOT blob this (breaks relative ESM imports).
          classWorkerURL: workerJs,
        })
      } catch (error) {
        const detail =
          error instanceof Error && error.message ? ` (${error.message})` : ""
        throw new Error(
          `Could not load FFmpeg WebAssembly for video compression${detail}. Hard-refresh the page after deploy so COOP/COEP headers apply (window.crossOriginIsolated should be true).`
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
 * Browser-native fallback when ffmpeg.wasm cannot load (still downscales to ~720p).
 * Outputs WebM (VP8/VP9) which R2 + modern browsers accept.
 */
async function compressWithMediaRecorder(
  file: File,
  {
    height = 720,
    onProgress,
  }: {
    height?: number
    onProgress?: (progress: CompressVideoProgress) => void
  }
): Promise<CompressVideoResult> {
  onProgress?.({
    stage: "loading",
    message: "Using browser encoder fallback…",
  })

  const objectUrl = URL.createObjectURL(file)
  const video = document.createElement("video")
  video.muted = true
  video.playsInline = true
  video.preload = "auto"
  video.src = objectUrl

  await new Promise<void>((resolve, reject) => {
    video.onloadedmetadata = () => resolve()
    video.onerror = () => reject(new Error("Could not read video for fallback compression."))
  })

  const sourceWidth = video.videoWidth || 1280
  const sourceHeight = video.videoHeight || 720
  const targetHeight = Math.min(height, sourceHeight)
  const targetWidth = Math.max(2, Math.round((sourceWidth / sourceHeight) * targetHeight / 2) * 2)

  const canvas = document.createElement("canvas")
  canvas.width = targetWidth
  canvas.height = targetHeight
  const ctx = canvas.getContext("2d")
  if (!ctx) {
    URL.revokeObjectURL(objectUrl)
    throw new Error("Canvas unavailable for fallback compression.")
  }

  const stream = canvas.captureStream(30)
  const audioTracks =
    // @ts-expect-error captureStream exists on HTMLMediaElement in Chromium
    typeof video.captureStream === "function"
      ? // @ts-expect-error captureStream
        (video.captureStream() as MediaStream).getAudioTracks()
      : []
  audioTracks.forEach((track: MediaStreamTrack) => stream.addTrack(track))

  const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
    ? "video/webm;codecs=vp9,opus"
    : MediaRecorder.isTypeSupported("video/webm;codecs=vp8,opus")
      ? "video/webm;codecs=vp8,opus"
      : "video/webm"

  const recorder = new MediaRecorder(stream, {
    mimeType,
    videoBitsPerSecond: 2_500_000,
  })
  const chunks: BlobPart[] = []
  recorder.ondataavailable = (event) => {
    if (event.data.size) chunks.push(event.data)
  }

  const recorded = new Promise<Blob>((resolve, reject) => {
    recorder.onerror = () => reject(new Error("Browser video encoder failed."))
    recorder.onstop = () => resolve(new Blob(chunks, { type: "video/webm" }))
  })

  onProgress?.({
    stage: "encoding",
    ratio: 0,
    message: "Compressing video... 0%",
  })

  recorder.start(250)
  await video.play()

  let frameId = 0
  const draw = () => {
    if (video.paused || video.ended) return
    ctx.drawImage(video, 0, 0, targetWidth, targetHeight)
    const ratio = video.duration > 0 ? Math.min(1, video.currentTime / video.duration) : 0
    onProgress?.({
      stage: "encoding",
      ratio,
      message: `Compressing video... ${Math.round(ratio * 100)}%`,
    })
    frameId = requestAnimationFrame(draw)
  }
  draw()

  await new Promise<void>((resolve) => {
    video.onended = () => resolve()
  })
  cancelAnimationFrame(frameId)
  if (recorder.state !== "inactive") recorder.stop()
  stream.getTracks().forEach((track) => track.stop())
  URL.revokeObjectURL(objectUrl)

  onProgress?.({
    stage: "reading",
    ratio: 1,
    message: "Reading compressed video…",
  })

  const blob = await recorded
  const compressed = new File([blob], outputFileName(file, "webm"), {
    type: "video/webm",
    lastModified: Date.now(),
  })

  onProgress?.({
    stage: "done",
    ratio: 1,
    message: `Compressed ${formatMb(file.size)} → ${formatMb(compressed.size)} (browser encoder)`,
  })

  return {
    file: compressed,
    blob,
    originalBytes: file.size,
    compressedBytes: compressed.size,
    skipped: false,
    reason: "mediarecorder-fallback",
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

  try {
    const ffmpeg = await loadVideoCompressor(onProgress)

    const progressHandler = ({ progress }: { progress: number }) => {
      onProgress?.({
        stage: "encoding",
        ratio: Math.min(1, Math.max(0, progress)),
        message: `Compressing video... ${Math.round(Math.min(1, progress) * 100)}%`,
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
        message: `Compressing video... 0%`,
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
        // ignore
      }
      try {
        await ffmpeg.deleteFile(outputName)
      } catch {
        // ignore
      }
    }
  } catch (ffmpegError) {
    // Fall back to MediaRecorder so artisans can still upload large phone reels.
    if (typeof MediaRecorder === "undefined") {
      throw ffmpegError
    }
    try {
      return await compressWithMediaRecorder(file, { height, onProgress })
    } catch {
      throw ffmpegError instanceof Error
        ? ffmpegError
        : new Error("Could not load FFmpeg WebAssembly for video compression.")
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
