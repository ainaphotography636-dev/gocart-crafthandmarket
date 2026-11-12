"use client"

import { useCallback, useEffect, useId, useRef, useState } from "react"
import {
  CheckCircle2Icon,
  ClapperboardIcon,
  ImagePlusIcon,
  Loader2Icon,
  UploadCloudIcon,
  XIcon,
} from "lucide-react"
import { toast } from "react-hot-toast"
import { ARTISAN_CATEGORIES, addProduct } from "@/lib/productCatalog"
import {
  compressAndUploadVideo,
  FORM_MAX_VIDEO_BYTES,
  type CompressAndUploadProgress,
} from "@/lib/compressAndUploadVideo"
import { claimNextProductSku, getActiveStore } from "@/lib/storeRegistry"
import { formatProductTitle } from "@/lib/productCodes"

type UploadedImage = {
  id: string
  url: string
  key?: string | null
  name: string
  previewUrl: string
}

type UploadedVideo = {
  url: string
  key?: string | null
  name: string
  previewUrl: string
  originalBytes: number
  compressedBytes: number
}

type ProductFields = {
  name: string
  description: string
  mrp: string
  price: string
  category: string
}

type RouteIds = {
  artisanId: string
  productId: string
  storeId: string
  skuSequence?: number | null
}

const ACCEPT =
  "image/*,video/mp4,video/webm,video/quicktime,video/x-m4v,.mp4,.webm,.mov,.m4v"

function isVideoFile(file: File) {
  if (file.type.startsWith("video/")) return true
  return /\.(mp4|webm|mov|m4v|mkv)$/i.test(file.name)
}

function isImageFile(file: File) {
  if (file.type.startsWith("image/")) return true
  return /\.(jpe?g|png|gif|webp|avif|heic)$/i.test(file.name)
}

function formatMb(bytes: number) {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

async function uploadImages(
  files: File[],
  { artisanId, productId, storeId }: RouteIds
) {
  const formData = new FormData()
  formData.append("artisanId", artisanId)
  formData.append("productId", productId)
  formData.append("storeId", storeId)
  formData.append("kind", "image")
  files.forEach((file) => formData.append("files", file))

  const response = await fetch("/api/upload", {
    method: "POST",
    body: formData,
  })
  const payload = await response.json().catch(() => ({}))

  if (!response.ok || !payload?.ok || !Array.isArray(payload.urls)) {
    throw new Error(payload?.error || "Image upload failed.")
  }

  return {
    urls: payload.urls as string[],
    keys: (payload.keys || []) as string[],
  }
}

export type ProductUploadFormProps = {
  /** Optional override — otherwise claimed from the active store on first media drop. */
  productId?: string
  artisanId?: string
  onComplete?: (result: {
    images: UploadedImage[]
    video: UploadedVideo | null
    artisanId: string
    productId: string
  }) => void
}

export default function ProductUploadForm({
  productId: productIdProp,
  artisanId: artisanIdProp,
  onComplete,
}: ProductUploadFormProps = {}) {
  const inputId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const claimedRef = useRef<RouteIds | null>(null)
  const imagesRef = useRef<UploadedImage[]>([])
  const videoRef = useRef<UploadedVideo | null>(null)

  const [artisanId, setArtisanId] = useState(artisanIdProp || "")
  const [productId, setProductId] = useState(productIdProp || "")
  const [storeName, setStoreName] = useState("")
  const [dragActive, setDragActive] = useState(false)
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState<CompressAndUploadProgress | null>(null)
  const [images, setImages] = useState<UploadedImage[]>([])
  const [video, setVideo] = useState<UploadedVideo | null>(null)
  const [error, setError] = useState("")
  const [productInfo, setProductInfo] = useState<ProductFields>({
    name: "",
    description: "",
    mrp: "",
    price: "",
    category: "",
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    imagesRef.current = images
  }, [images])

  useEffect(() => {
    videoRef.current = video
  }, [video])

  useEffect(() => {
    if (artisanIdProp) setArtisanId(artisanIdProp)
  }, [artisanIdProp])

  useEffect(() => {
    if (productIdProp) setProductId(productIdProp)
  }, [productIdProp])

  useEffect(() => {
    const store = getActiveStore()
    if (!store) return
    setStoreName(store.name || "")
    if (!artisanIdProp && store.artisanCode) {
      setArtisanId(store.artisanCode)
    }
  }, [artisanIdProp])

  const ensureRouteIds = useCallback((): RouteIds => {
    if (claimedRef.current) return claimedRef.current

    if (artisanIdProp && productIdProp) {
      const store = getActiveStore()
      const route: RouteIds = {
        artisanId: artisanIdProp,
        productId: productIdProp,
        storeId: store?.id || "anonymous",
      }
      claimedRef.current = route
      setArtisanId(route.artisanId)
      setProductId(route.productId)
      return route
    }

    const store = getActiveStore()
    if (!store) {
      throw new Error("Connect an active workshop before uploading media.")
    }
    if (store.status !== "approved" || !store.isActive) {
      throw new Error("Approve and activate your workshop before uploading media.")
    }

    const claimed = claimNextProductSku(store.id)
    const route: RouteIds = {
      artisanId: claimed.artisanCode,
      productId: claimed.sku,
      storeId: store.id,
      skuSequence: claimed.skuSequence,
    }
    claimedRef.current = route
    setArtisanId(route.artisanId)
    setProductId(route.productId)
    setStoreName(store.name || "")
    return route
  }, [artisanIdProp, productIdProp])

  const handleFiles = useCallback(
    async (fileList: FileList | File[]) => {
      const files = Array.from(fileList || []).filter(Boolean)
      if (!files.length) return

      setError("")
      setBusy(true)
      setProgress(null)

      try {
        const route = ensureRouteIds()
        const imageBatch: File[] = []
        let videoFile: File | null = null
        const existingVideo = videoRef.current
        const existingImages = imagesRef.current

        for (const file of files) {
          if (isVideoFile(file)) {
            if (videoFile || existingVideo) {
              throw new Error("Only one workshop video can be attached per product.")
            }
            if (file.size > FORM_MAX_VIDEO_BYTES) {
              throw new Error(
                `Video must be ${Math.round(FORM_MAX_VIDEO_BYTES / (1024 * 1024))}MB or smaller.`
              )
            }
            videoFile = file
          } else if (isImageFile(file)) {
            if (file.size > 5 * 1024 * 1024) {
              throw new Error(`Image "${file.name}" must be 5MB or smaller.`)
            }
            imageBatch.push(file)
          } else {
            throw new Error(`Unsupported file type: ${file.name}`)
          }
        }

        if (existingImages.length + imageBatch.length > 8) {
          throw new Error("Upload at most 8 product images.")
        }

        let nextImages = existingImages
        let nextVideo = existingVideo

        if (imageBatch.length) {
          setProgress({
            percent: 20,
            stage: "uploading",
            message: `Uploading ${imageBatch.length} image${imageBatch.length > 1 ? "s" : ""}...`,
          })
          const uploaded = await uploadImages(imageBatch, route)
          const added: UploadedImage[] = imageBatch.map((file, index) => ({
            id: `${Date.now()}-${index}-${file.name}`,
            url: uploaded.urls[index],
            key: uploaded.keys[index] || null,
            name: file.name,
            previewUrl: URL.createObjectURL(file),
          }))
          nextImages = [...existingImages, ...added]
          setImages(nextImages)
        }

        if (videoFile) {
          const localPreview = URL.createObjectURL(videoFile)
          const result = await compressAndUploadVideo(videoFile, {
            artisanId: route.artisanId,
            productId: route.productId,
            onProgress: setProgress,
          })
          nextVideo = {
            url: result.url,
            key: result.key,
            name: videoFile.name,
            previewUrl: localPreview,
            originalBytes: result.originalBytes,
            compressedBytes: result.compressedBytes,
          }
          setVideo(nextVideo)
        }

        setProgress({
          percent: 100,
          stage: "done",
          message: "Upload complete.",
        })

        onComplete?.({
          images: nextImages,
          video: nextVideo,
          artisanId: route.artisanId,
          productId: route.productId,
        })
      } catch (err) {
        const message = err instanceof Error ? err.message : "Upload failed."
        setError(message)
        setProgress((prev) => ({
          percent: prev?.stage === "error" ? prev.percent : prev?.percent || 0,
          stage: "error",
          message,
        }))
        toast.error(message)
      } finally {
        setBusy(false)
        if (inputRef.current) inputRef.current.value = ""
      }
    },
    [ensureRouteIds, onComplete]
  )

  const onDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setDragActive(false)
    if (busy) return
    void handleFiles(event.dataTransfer.files)
  }

  const removeImage = (id: string) => {
    setImages((prev) => {
      const target = prev.find((item) => item.id === id)
      if (target?.previewUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(target.previewUrl)
      }
      return prev.filter((item) => item.id !== id)
    })
  }

  const clearVideo = () => {
    if (video?.previewUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(video.previewUrl)
    }
    setVideo(null)
  }

  const onChangeHandler = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = event.target
    setProductInfo((prev) => ({ ...prev, [name]: value }))
  }

  const onSubmitHandler = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!images.length) {
      toast.error("Add at least one product image.")
      return
    }

    setSaving(true)
    try {
      const store = getActiveStore()
      if (!store || store.status !== "approved") {
        throw new Error("Approve and activate your workshop before adding products.")
      }

      let sku = productId
      let artisanCode = artisanId
      let skuSequence: number | null = claimedRef.current?.skuSequence ?? null

      if (claimedRef.current) {
        sku = claimedRef.current.productId
        artisanCode = claimedRef.current.artisanId
      } else if (productIdProp && artisanIdProp) {
        sku = productIdProp
        artisanCode = artisanIdProp
      } else {
        const next = claimNextProductSku(store.id)
        sku = next.sku
        artisanCode = next.artisanCode
        skuSequence = next.skuSequence
        claimedRef.current = {
          artisanId: artisanCode,
          productId: sku,
          storeId: store.id,
          skuSequence,
        }
        setArtisanId(artisanCode)
        setProductId(sku)
      }

      const name = String(productInfo.name || "").trim()
      const description = String(productInfo.description || "").trim()
      const category = String(productInfo.category || "").trim()
      const mrp = Number(productInfo.mrp)
      const price = Number(productInfo.price)

      if (!name) throw new Error("Product name is required.")
      if (!description) throw new Error("Product description is required.")
      if (!category) throw new Error("Select a category.")
      if (!Number.isFinite(mrp) || mrp <= 0) {
        throw new Error("Enter a valid actual price.")
      }
      if (!Number.isFinite(price) || price <= 0) {
        throw new Error("Enter a valid offer price.")
      }
      if (price > mrp) {
        throw new Error("Offer price cannot be higher than actual price.")
      }

      const now = new Date().toISOString()
      const product = {
        id: `prod_${Date.now()}`,
        storeId: store.id,
        storeUsername: store.username,
        artisanCode,
        sku,
        skuSequence,
        name,
        description,
        mrp,
        price,
        category,
        images: images.map((item) => item.url),
        video: video?.url || null,
        mediaStorage: "r2" as const,
        inStock: true,
        rating: [],
        createdAt: now,
        updatedAt: now,
      }

      addProduct(product)
      toast.success(`${formatProductTitle(product)} added — media on Cloudflare R2`)

      setProductInfo({
        name: "",
        description: "",
        mrp: "",
        price: "",
        category: "",
      })
      images.forEach((item) => {
        if (item.previewUrl?.startsWith("blob:")) URL.revokeObjectURL(item.previewUrl)
      })
      if (video?.previewUrl?.startsWith("blob:")) URL.revokeObjectURL(video.previewUrl)
      setImages([])
      setVideo(null)
      setProgress(null)
      setError("")
      claimedRef.current = null
      if (!productIdProp) setProductId("")
      if (!artisanIdProp) setArtisanId(store.artisanCode || artisanCode)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not add product")
    } finally {
      setSaving(false)
    }
  }

  const pathPreview = `artisans/${artisanId || "{artisanId}"}/products/${
    productId || "{productId}"
  }/`

  const showPreview = images.length > 0 || Boolean(video)

  return (
    <form onSubmit={onSubmitHandler} className="text-slate-600 mb-28 max-w-3xl">
      <p className="text-xs uppercase tracking-[0.18em] text-brand-gold">Artisan catalog</p>
      <h1 className="font-display text-3xl mt-2 text-brand-ink tracking-tight">
        New <span className="text-brand-emerald">workshop piece</span>
      </h1>
      <p className="text-sm mt-2 max-w-xl text-slate-500">
        Drop product photos and an optional making-of video. Large clips compress to 720p in
        your browser before upload
        {storeName ? (
          <>
            {" "}
            for <span className="text-brand-ink font-medium">{storeName}</span>
          </>
        ) : null}
        .
      </p>

      <div className="mt-6 rounded-lg border border-brand-emerald/20 bg-gradient-to-br from-brand-emerald-soft/70 via-white to-brand-amber-soft/40 px-4 py-3">
        <p className="text-xs uppercase tracking-[0.14em] text-brand-gold">R2 folder</p>
        <p className="mt-1 font-mono text-sm text-brand-emerald break-all">{pathPreview}</p>
      </div>

      <section className="mt-10" aria-labelledby="media-upload-heading">
        <h2 id="media-upload-heading" className="text-slate-800 font-medium text-lg">
          Product media
        </h2>
        <p className="text-sm mt-1 text-slate-500">
          Images up to 5MB each. Videos up to 200MB — compressed to ~720p in your browser,
          then uploaded to Cloudflare R2.
        </p>

        <div
          role="button"
          tabIndex={0}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault()
              inputRef.current?.click()
            }
          }}
          onDragEnter={(event) => {
            event.preventDefault()
            setDragActive(true)
          }}
          onDragOver={(event) => {
            event.preventDefault()
            setDragActive(true)
          }}
          onDragLeave={(event) => {
            event.preventDefault()
            setDragActive(false)
          }}
          onDrop={onDrop}
          onClick={() => !busy && inputRef.current?.click()}
          className={`mt-4 relative overflow-hidden rounded-xl border-2 border-dashed px-6 py-12 text-center transition duration-300 cursor-pointer ${
            dragActive
              ? "border-brand-emerald bg-brand-emerald-soft/80 scale-[1.01]"
              : "border-brand-emerald/30 bg-gradient-to-b from-white/80 to-brand-emerald-soft/30 hover:border-brand-emerald/60"
          } ${busy ? "opacity-70 pointer-events-none" : ""}`}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-40"
            style={{
              backgroundImage:
                "radial-gradient(circle at 20% 20%, rgba(4,120,87,0.12), transparent 45%), radial-gradient(circle at 80% 0%, rgba(180,83,9,0.1), transparent 40%)",
            }}
          />
          <div className="relative flex flex-col items-center gap-3">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-brand-emerald text-white shadow-sm">
              {busy ? (
                <Loader2Icon className="animate-spin" size={22} />
              ) : (
                <UploadCloudIcon size={22} />
              )}
            </span>
            <p className="text-brand-ink font-medium">
              {busy ? "Working on your media…" : "Drop images or a workshop video"}
            </p>
            <p className="text-xs text-slate-500 max-w-sm">
              Accepts JPEG/PNG/WebP and MP4 / WebM / QuickTime. Tap or click to browse.
            </p>
            <div className="flex items-center gap-3 text-xs text-brand-gold mt-1">
              <span className="inline-flex items-center gap-1">
                <ImagePlusIcon size={14} /> Photos
              </span>
              <span className="inline-flex items-center gap-1">
                <ClapperboardIcon size={14} /> Video
              </span>
            </div>
          </div>
          <input
            ref={inputRef}
            id={inputId}
            type="file"
            accept={ACCEPT}
            multiple
            hidden
            disabled={busy}
            onChange={(event) => {
              if (event.target.files?.length) void handleFiles(event.target.files)
            }}
          />
        </div>

        {progress ? (
          <div
            className={`mt-4 overflow-hidden rounded-lg border px-4 py-3 transition ${
              progress.stage === "error"
                ? "border-red-200 bg-red-50"
                : progress.stage === "done"
                  ? "border-brand-emerald/30 bg-brand-emerald-soft/60"
                  : "border-brand-gold/25 bg-brand-amber-soft/50"
            }`}
          >
            <div className="flex items-center justify-between gap-3 text-sm">
              <p className="text-brand-ink font-medium flex items-center gap-2">
                {progress.stage === "done" ? (
                  <CheckCircle2Icon
                    size={16}
                    className="text-brand-emerald animate-[pulse_1.2s_ease-in-out_1]"
                  />
                ) : progress.stage === "error" ? null : (
                  <Loader2Icon size={16} className="animate-spin text-brand-gold" />
                )}
                {progress.message}
              </p>
              <span className="font-mono text-xs text-slate-500 tabular-nums">
                {Math.round(progress.percent)}%
              </span>
            </div>
            <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/70">
              <div
                className={`h-full rounded-full transition-[width] duration-300 ease-out ${
                  progress.stage === "error"
                    ? "bg-red-400"
                    : "bg-gradient-to-r from-brand-emerald to-brand-gold"
                }`}
                style={{ width: `${Math.min(100, Math.max(0, progress.percent))}%` }}
              />
            </div>
          </div>
        ) : null}

        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}

        {showPreview ? (
          <div className="mt-6 space-y-5 motion-safe:animate-[mediaReveal_0.45s_ease-out]">
            {images.length ? (
              <div>
                <p className="text-sm font-medium text-slate-700">Uploaded photos</p>
                <ul className="mt-3 flex flex-wrap gap-3">
                  {images.map((item) => (
                    <li key={item.id} className="relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={item.previewUrl || item.url}
                        alt={item.name}
                        className="h-24 w-24 object-cover rounded-md border border-brand-emerald/20"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(item.id)}
                        className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-brand-ink text-white flex items-center justify-center opacity-90 hover:bg-brand-amber"
                        aria-label={`Remove ${item.name}`}
                      >
                        <XIcon size={12} />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {video ? (
              <div className="max-w-md">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-slate-700 flex items-center gap-2">
                    <CheckCircle2Icon size={16} className="text-brand-emerald" />
                    Workshop video ready
                  </p>
                  <button
                    type="button"
                    onClick={clearVideo}
                    className="text-xs text-brand-amber hover:underline"
                  >
                    Remove
                  </button>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {video.name} · {formatMb(video.originalBytes)}
                  {video.compressedBytes !== video.originalBytes
                    ? ` → ${formatMb(video.compressedBytes)}`
                    : ""}
                </p>
                <video
                  src={video.previewUrl || video.url}
                  controls
                  className="mt-3 w-full rounded-lg bg-brand-ink/90 aspect-video"
                />
              </div>
            ) : null}
          </div>
        ) : null}
      </section>

      <label className="flex flex-col gap-2 my-6 mt-10">
        Name
        <input
          type="text"
          name="name"
          onChange={onChangeHandler}
          value={productInfo.name}
          placeholder="e.g. Hand-thrown terracotta pot"
          className="w-full max-w-sm p-2 px-4 outline-none border border-slate-200 rounded focus:border-brand-emerald"
          required
        />
      </label>

      <label className="flex flex-col gap-2 my-6">
        Description
        <textarea
          name="description"
          onChange={onChangeHandler}
          value={productInfo.description}
          placeholder="Tell the story of this piece, materials, and craft method"
          rows={5}
          className="w-full max-w-sm p-2 px-4 outline-none border border-slate-200 rounded resize-none focus:border-brand-emerald"
          required
        />
      </label>

      <div className="flex gap-5 flex-wrap">
        <label className="flex flex-col gap-2">
          Actual Price ($)
          <input
            type="number"
            name="mrp"
            min="0"
            step="0.01"
            onChange={onChangeHandler}
            value={productInfo.mrp}
            placeholder="0"
            className="w-full max-w-45 p-2 px-4 outline-none border border-slate-200 rounded focus:border-brand-emerald"
            required
          />
        </label>
        <label className="flex flex-col gap-2">
          Offer Price ($)
          <input
            type="number"
            name="price"
            min="0"
            step="0.01"
            onChange={onChangeHandler}
            value={productInfo.price}
            placeholder="0"
            className="w-full max-w-45 p-2 px-4 outline-none border border-slate-200 rounded focus:border-brand-emerald"
            required
          />
        </label>
      </div>

      <select
        onChange={onChangeHandler}
        name="category"
        value={productInfo.category}
        className="w-full max-w-sm p-2 px-4 my-6 outline-none border border-slate-200 rounded focus:border-brand-emerald"
        required
      >
        <option value="">Select a craft category</option>
        {ARTISAN_CATEGORIES.map((category) => (
          <option key={category} value={category}>
            {category}
          </option>
        ))}
      </select>

      <button
        type="submit"
        disabled={saving || busy || !images.length}
        className="bg-brand-emerald text-white px-6 mt-2 py-2.5 hover:bg-brand-amber rounded transition disabled:opacity-60"
      >
        {saving ? "Saving product…" : "Add Product"}
      </button>
    </form>
  )
}
