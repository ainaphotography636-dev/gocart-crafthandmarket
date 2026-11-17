"use client"

import Link from "next/link"
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ChangeEvent,
} from "react"
import {
  CheckCircle2Icon,
  ClapperboardIcon,
  ImagePlusIcon,
  Loader2Icon,
  PlusIcon,
  Trash2Icon,
  UploadCloudIcon,
  XIcon,
} from "lucide-react"
import { toast } from "react-hot-toast"
import {
  createMarketplaceProduct,
  type CustomSpec,
} from "@/app/actions/marketplace-products"
import { ARTISAN_CATEGORIES, addProduct } from "@/lib/productCatalog"
import {
  compressAndUploadVideo,
  FORM_MAX_VIDEO_BYTES,
  type CompressAndUploadProgress,
} from "@/lib/compressAndUploadVideo"
import { CRAFT_MATERIALS, GI_TAG_OPTIONS } from "@/lib/handicraftCategories"
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
  material: string
  craftTechnique: string
  dimensions: string
  weight: string
  regionOrigin: string
  careInstructions: string
  giTag: string
}

type RouteIds = {
  artisanId: string
  productId: string
  storeId: string
  skuSequence?: number | null
}

const MIN_PHOTOS = 4
const MAX_PHOTOS = 6
const IMAGE_ACCEPT = "image/jpeg,image/png,image/webp,image/gif,.jpg,.jpeg,.png,.webp,.gif"
const VIDEO_ACCEPT = "video/mp4,video/webm,video/quicktime,video/x-m4v,.mp4,.webm,.mov,.m4v"

const CRAFT_TECHNIQUES = [
  "Handloom weaving",
  "Lost-wax casting",
  "Hand carving",
  "Wheel-thrown pottery",
  "Block printing",
  "Embroidery",
  "Inlay / marquetry",
  "Beadwork",
  "Natural dyeing",
  "Other",
]

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

function emptyFields(): ProductFields {
  return {
    name: "",
    description: "",
    mrp: "",
    price: "",
    category: "",
    material: "",
    craftTechnique: "",
    dimensions: "",
    weight: "",
    regionOrigin: "",
    careInstructions: "",
    giTag: "",
  }
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
  const photoInputId = useId()
  const videoInputId = useId()
  const photoInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)
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
  const [productInfo, setProductInfo] = useState<ProductFields>(emptyFields())
  const [customSpecs, setCustomSpecs] = useState<CustomSpec[]>([])
  const [saving, setSaving] = useState<"draft" | "publish" | null>(null)

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

  const handlePhotoFiles = useCallback(
    async (fileList: FileList | File[]) => {
      const files = Array.from(fileList || []).filter(Boolean)
      if (!files.length) return

      setError("")
      setBusy(true)
      setProgress(null)

      try {
        const route = ensureRouteIds()
        const existingImages = imagesRef.current
        const imageBatch: File[] = []

        for (const file of files) {
          if (!isImageFile(file)) {
            throw new Error(`Unsupported image type: ${file.name}`)
          }
          if (file.size > 5 * 1024 * 1024) {
            throw new Error(`Image "${file.name}" must be 5MB or smaller.`)
          }
          imageBatch.push(file)
        }

        if (existingImages.length + imageBatch.length > MAX_PHOTOS) {
          throw new Error(`Upload ${MIN_PHOTOS}–${MAX_PHOTOS} product photos.`)
        }

        setProgress({
          percent: 25,
          stage: "uploading",
          message: `Uploading ${imageBatch.length} photo${imageBatch.length > 1 ? "s" : ""}…`,
        })
        const uploaded = await uploadImages(imageBatch, route)
        const added: UploadedImage[] = imageBatch.map((file, index) => ({
          id: `${Date.now()}-${index}-${file.name}`,
          url: uploaded.urls[index],
          key: uploaded.keys[index] || null,
          name: file.name,
          previewUrl: URL.createObjectURL(file),
        }))
        const nextImages = [...existingImages, ...added]
        setImages(nextImages)
        setProgress({
          percent: 100,
          stage: "done",
          message: "Photos uploaded to Cloudflare R2.",
        })
        onComplete?.({
          images: nextImages,
          video: videoRef.current,
          artisanId: route.artisanId,
          productId: route.productId,
        })
      } catch (err) {
        const message = err instanceof Error ? err.message : "Upload failed."
        setError(message)
        setProgress({
          percent: 0,
          stage: "error",
          message,
        })
        toast.error(message)
      } finally {
        setBusy(false)
        if (photoInputRef.current) photoInputRef.current.value = ""
      }
    },
    [ensureRouteIds, onComplete]
  )

  const handleVideoFile = useCallback(
    async (fileList: FileList | File[]) => {
      const files = Array.from(fileList || []).filter(Boolean)
      if (!files.length) return

      setError("")
      setBusy(true)
      setProgress(null)

      try {
        const route = ensureRouteIds()
        if (videoRef.current) {
          throw new Error("Only one product video can be attached.")
        }
        const file = files[0]
        if (!isVideoFile(file)) {
          throw new Error(`Unsupported video type: ${file.name}`)
        }
        if (file.size > FORM_MAX_VIDEO_BYTES) {
          throw new Error(
            `Video must be ${Math.round(FORM_MAX_VIDEO_BYTES / (1024 * 1024))}MB or smaller.`
          )
        }

        const localPreview = URL.createObjectURL(file)
        const result = await compressAndUploadVideo(file, {
          artisanId: route.artisanId,
          productId: route.productId,
          onProgress: setProgress,
        })
        const nextVideo: UploadedVideo = {
          url: result.url,
          key: result.key,
          name: file.name,
          previewUrl: localPreview,
          originalBytes: result.originalBytes,
          compressedBytes: result.compressedBytes,
        }
        setVideo(nextVideo)
        onComplete?.({
          images: imagesRef.current,
          video: nextVideo,
          artisanId: route.artisanId,
          productId: route.productId,
        })
      } catch (err) {
        const message = err instanceof Error ? err.message : "Video upload failed."
        setError(message)
        setProgress({
          percent: 0,
          stage: "error",
          message,
        })
        toast.error(message)
      } finally {
        setBusy(false)
        if (videoInputRef.current) videoInputRef.current.value = ""
      }
    },
    [ensureRouteIds, onComplete]
  )

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
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = event.target
    setProductInfo((prev) => ({ ...prev, [name]: value }))
  }

  const addCustomSpec = () => {
    setCustomSpecs((prev) => [...prev, { key: "", value: "" }])
  }

  const updateCustomSpec = (index: number, field: keyof CustomSpec, value: string) => {
    setCustomSpecs((prev) =>
      prev.map((row, rowIndex) =>
        rowIndex === index ? { ...row, [field]: value } : row
      )
    )
  }

  const removeCustomSpec = (index: number) => {
    setCustomSpecs((prev) => prev.filter((_, rowIndex) => rowIndex !== index))
  }

  const resetForm = (storeArtisanCode: string) => {
    images.forEach((item) => {
      if (item.previewUrl?.startsWith("blob:")) URL.revokeObjectURL(item.previewUrl)
    })
    if (video?.previewUrl?.startsWith("blob:")) URL.revokeObjectURL(video.previewUrl)
    setProductInfo(emptyFields())
    setCustomSpecs([])
    setImages([])
    setVideo(null)
    setProgress(null)
    setError("")
    claimedRef.current = null
    if (!productIdProp) setProductId("")
    if (!artisanIdProp) setArtisanId(storeArtisanCode)
  }

  const saveProduct = async (publish: boolean) => {
    if (publish && (images.length < MIN_PHOTOS || images.length > MAX_PHOTOS)) {
      toast.error(`Publish requires ${MIN_PHOTOS}–${MAX_PHOTOS} product photos.`)
      return
    }
    if (!images.length) {
      toast.error("Add at least one product photo.")
      return
    }

    setSaving(publish ? "publish" : "draft")
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
        throw new Error("Enter a valid actual price (₹).")
      }
      if (!Number.isFinite(price) || price <= 0) {
        throw new Error("Enter a valid offer price (₹).")
      }
      if (price > mrp) {
        throw new Error("Offer price cannot be higher than actual price.")
      }

      const imageUrls = images.map((item) => item.url)
      const videoUrl = video?.url || null

      const persisted = await createMarketplaceProduct({
        title: name,
        description,
        category,
        priceInr: price,
        mrpInr: mrp,
        images: imageUrls,
        videoProofUrl: videoUrl,
        sku,
        workshopName: store.name,
        username: store.username,
        artisanCode,
        publish,
        specs: {
          material: productInfo.material,
          craftTechnique: productInfo.craftTechnique,
          dimensions: productInfo.dimensions,
          weight: productInfo.weight,
          regionOrigin: productInfo.regionOrigin,
          careInstructions: productInfo.careInstructions,
          giTag: productInfo.giTag,
          custom: customSpecs,
        },
      })

      const now = new Date().toISOString()
      const product = {
        id: persisted.ok ? persisted.product.id : `prod_${Date.now()}`,
        storeId: store.id,
        storeUsername: store.username,
        artisanCode: persisted.ok ? persisted.product.artisanCode : artisanCode,
        sku: persisted.ok ? persisted.product.sku : sku,
        skuSequence,
        name,
        description,
        mrp,
        price,
        category,
        images: imageUrls,
        video: videoUrl,
        mediaStorage: "r2" as const,
        inStock: true,
        rating: [],
        createdAt: now,
        updatedAt: now,
        supabaseSynced: persisted.ok,
        isPublished: persisted.ok ? persisted.product.isPublished : false,
        currency: "INR",
      }

      addProduct(product)

      if (persisted.ok === false) {
        if (persisted.code === "UNAUTHORIZED") {
          toast.success(
            `${formatProductTitle(product)} saved locally — sign in to sync to Supabase`
          )
        } else if (persisted.code === "SUPABASE_UNAVAILABLE") {
          toast.success(`${formatProductTitle(product)} saved locally`)
        } else {
          toast.error(persisted.error)
          toast.success(
            `${formatProductTitle(product)} kept in local workshop catalog as a backup`
          )
        }
        resetForm(store.artisanCode || artisanCode)
      } else {
        if (publish && !persisted.product.isPublished) {
          toast.success(
            `${formatProductTitle(product)} saved as draft — workshop must be verified before public listing`
          )
        } else {
          toast.success(
            publish
              ? `${formatProductTitle(product)} published — media on Cloudflare R2`
              : `${formatProductTitle(product)} saved as draft`
          )
        }
        resetForm(persisted.product.artisanCode)
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save product")
    } finally {
      setSaving(null)
    }
  }

  const pathPreview = `artisans/${artisanId || "{artisanId}"}/products/${
    productId || "{sku}"
  }/`
  const photoCountLabel = `${images.length}/${MAX_PHOTOS} photos`

  return (
    <div className="relative pb-28 text-slate-600">
      <div className="mx-auto max-w-4xl">
        <p className="text-xs uppercase tracking-[0.18em] text-brand-gold">
          Artisan catalog
        </p>
        <h1 className="mt-2 font-display text-3xl tracking-tight text-brand-ink">
          Add a <span className="text-brand-emerald">handcrafted piece</span>
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-500">
          Upload 4–6 product photos{storeName ? ` for ${storeName}` : ""}. Optional
          product video compresses to ~720p in your browser before R2 upload. Prices
          are in Indian Rupees (₹).
        </p>

        <div className="mt-6 rounded-xl border border-brand-emerald/20 bg-gradient-to-br from-brand-emerald-soft/70 via-white to-brand-amber-soft/40 px-4 py-3">
          <p className="text-xs uppercase tracking-[0.14em] text-brand-gold">
            R2 folder
          </p>
          <p className="mt-1 break-all font-mono text-sm text-brand-emerald">
            {pathPreview}
          </p>
        </div>

        {/* Photos */}
        <section className="mt-8 rounded-2xl border border-brand-gold/20 bg-white/90 p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-medium text-slate-800">Product photos</h2>
              <p className="mt-1 text-sm text-slate-500">
                Required: {MIN_PHOTOS}–{MAX_PHOTOS} images (JPEG/PNG/WebP, max 5MB each).
              </p>
            </div>
            <span className="rounded-full bg-brand-amber-soft px-3 py-1 text-xs text-brand-gold">
              {photoCountLabel}
            </span>
          </div>

          <div
            role="button"
            tabIndex={0}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault()
                photoInputRef.current?.click()
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
            onDrop={(event) => {
              event.preventDefault()
              setDragActive(false)
              if (!busy) void handlePhotoFiles(event.dataTransfer.files)
            }}
            onClick={() => !busy && photoInputRef.current?.click()}
            className={`mt-4 cursor-pointer rounded-xl border-2 border-dashed px-6 py-10 text-center transition ${
              dragActive
                ? "scale-[1.01] border-brand-emerald bg-brand-emerald-soft/80"
                : "border-brand-emerald/30 bg-gradient-to-b from-white to-brand-emerald-soft/20 hover:border-brand-emerald/60"
            } ${busy ? "pointer-events-none opacity-70" : ""}`}
          >
            <span className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-full bg-brand-emerald text-white">
              {busy ? (
                <Loader2Icon className="animate-spin" size={22} />
              ) : (
                <UploadCloudIcon size={22} />
              )}
            </span>
            <p className="mt-3 font-medium text-brand-ink">
              Drop product photos or click to browse
            </p>
            <p className="mt-1 text-xs text-slate-500">
              <ImagePlusIcon className="mr-1 inline" size={12} />
              Stored under artisans/…/products/&#123;sku&#125;/
            </p>
            <input
              ref={photoInputRef}
              id={photoInputId}
              type="file"
              accept={IMAGE_ACCEPT}
              multiple
              hidden
              disabled={busy || images.length >= MAX_PHOTOS}
              onChange={(event) => {
                if (event.target.files?.length) void handlePhotoFiles(event.target.files)
              }}
            />
          </div>

          {images.length ? (
            <ul className="mt-4 flex flex-wrap gap-3">
              {images.map((item) => (
                <li key={item.id} className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.previewUrl || item.url}
                    alt={item.name}
                    className="h-24 w-24 rounded-md border border-brand-emerald/20 object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(item.id)}
                    className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-brand-ink text-white hover:bg-brand-amber"
                    aria-label={`Remove ${item.name}`}
                  >
                    <XIcon size={12} />
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </section>

        {/* Product video */}
        <section className="mt-6 rounded-2xl border border-brand-gold/20 bg-white/90 p-5 shadow-sm">
          <h2 className="text-lg font-medium text-slate-800">
            Product video <span className="text-sm font-normal text-slate-400">(optional)</span>
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Short clip for this specific item only. Compresses to ~720p before upload.
          </p>

          {!video ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => videoInputRef.current?.click()}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-brand-gold/35 bg-brand-amber-soft/40 px-4 py-8 text-sm text-brand-ink transition hover:border-brand-gold disabled:opacity-60"
            >
              <ClapperboardIcon size={18} className="text-brand-gold" />
              Add product-level video
            </button>
          ) : (
            <div className="mt-4 max-w-md">
              <div className="flex items-center justify-between gap-2">
                <p className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <CheckCircle2Icon size={16} className="text-brand-emerald" />
                  Product video ready
                </p>
                <button
                  type="button"
                  onClick={clearVideo}
                  className="text-xs text-brand-amber hover:underline"
                >
                  Remove
                </button>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                {video.name} · {formatMb(video.originalBytes)}
                {video.compressedBytes !== video.originalBytes
                  ? ` → ${formatMb(video.compressedBytes)}`
                  : ""}
              </p>
              <video
                src={video.previewUrl || video.url}
                controls
                className="mt-3 aspect-video w-full rounded-lg bg-brand-ink/90"
              />
            </div>
          )}
          <input
            ref={videoInputRef}
            id={videoInputId}
            type="file"
            accept={VIDEO_ACCEPT}
            hidden
            disabled={busy || Boolean(video)}
            onChange={(event) => {
              if (event.target.files?.length) void handleVideoFile(event.target.files)
            }}
          />
        </section>

        {/* Workshop video note */}
        <aside className="mt-6 rounded-2xl border border-dashed border-brand-emerald/30 bg-brand-emerald-soft/40 px-5 py-4 text-sm text-slate-600">
          <p className="font-medium text-brand-ink">Profile workshop video</p>
          <p className="mt-1">
            Your main workshop / atelier video is managed in{" "}
            <Link href="/store" className="text-brand-emerald hover:underline">
              profile settings
            </Link>{" "}
            and is shared across all of your catalog items. It is not uploaded here.
          </p>
        </aside>

        {progress ? (
          <div
            className={`mt-6 overflow-hidden rounded-xl border px-4 py-3 ${
              progress.stage === "error"
                ? "border-red-200 bg-red-50"
                : progress.stage === "done"
                  ? "border-brand-emerald/30 bg-brand-emerald-soft/60"
                  : "border-brand-gold/25 bg-brand-amber-soft/50"
            }`}
          >
            <div className="flex items-center justify-between gap-3 text-sm">
              <p className="flex items-center gap-2 font-medium text-brand-ink">
                {progress.stage === "done" ? (
                  <CheckCircle2Icon size={16} className="text-brand-emerald" />
                ) : progress.stage === "error" ? null : (
                  <Loader2Icon size={16} className="animate-spin text-brand-gold" />
                )}
                {progress.message}
              </p>
              <span className="font-mono text-xs tabular-nums text-slate-500">
                {Math.round(progress.percent)}%
              </span>
            </div>
            <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/70">
              <div
                className={`h-full rounded-full transition-[width] duration-300 ${
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

        {/* Basics + INR pricing */}
        <section className="mt-6 rounded-2xl border border-brand-gold/20 bg-white/90 p-5 shadow-sm">
          <h2 className="text-lg font-medium text-slate-800">Details & pricing (₹)</h2>
          <div className="mt-4 grid gap-4">
            <label className="flex flex-col gap-1.5 text-sm">
              Name
              <input
                type="text"
                name="name"
                value={productInfo.name}
                onChange={onChangeHandler}
                placeholder="e.g. Hand-thrown terracotta pot"
                className="rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-brand-emerald"
                required
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              Description
              <textarea
                name="description"
                value={productInfo.description}
                onChange={onChangeHandler}
                rows={4}
                placeholder="Tell the story of this piece, materials, and craft method"
                className="resize-none rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-brand-emerald"
                required
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              Craft category
              <select
                name="category"
                value={productInfo.category}
                onChange={onChangeHandler}
                className="rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-brand-emerald"
                required
              >
                <option value="">Select a craft category</option>
                {ARTISAN_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5 text-sm">
                Actual Price (₹)
                <input
                  type="number"
                  name="mrp"
                  min="0"
                  step="1"
                  value={productInfo.mrp}
                  onChange={onChangeHandler}
                  placeholder="0"
                  className="rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-brand-emerald"
                  required
                />
              </label>
              <label className="flex flex-col gap-1.5 text-sm">
                Offer Price (₹)
                <input
                  type="number"
                  name="price"
                  min="0"
                  step="1"
                  value={productInfo.price}
                  onChange={onChangeHandler}
                  placeholder="0"
                  className="rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-brand-emerald"
                  required
                />
              </label>
            </div>
          </div>
        </section>

        {/* Handicraft specs */}
        <section className="mt-6 rounded-2xl border border-brand-gold/20 bg-white/90 p-5 shadow-sm">
          <h2 className="text-lg font-medium text-slate-800">
            Handicraft specifications
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Standard fields for Indian craft listings. Add custom rows for unique traits.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5 text-sm">
              Material
              <select
                name="material"
                value={productInfo.material}
                onChange={onChangeHandler}
                className="rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-brand-emerald"
              >
                <option value="">Select material</option>
                {CRAFT_MATERIALS.map((material) => (
                  <option key={material} value={material}>
                    {material}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              Craft Technique
              <select
                name="craftTechnique"
                value={productInfo.craftTechnique}
                onChange={onChangeHandler}
                className="rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-brand-emerald"
              >
                <option value="">Select technique</option>
                {CRAFT_TECHNIQUES.map((technique) => (
                  <option key={technique} value={technique}>
                    {technique}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              Dimensions / Size
              <input
                type="text"
                name="dimensions"
                value={productInfo.dimensions}
                onChange={onChangeHandler}
                placeholder="e.g. 12 cm × 8 cm"
                className="rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-brand-emerald"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              Weight
              <input
                type="text"
                name="weight"
                value={productInfo.weight}
                onChange={onChangeHandler}
                placeholder="e.g. 450 g"
                className="rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-brand-emerald"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              Region / Origin
              <input
                type="text"
                name="regionOrigin"
                value={productInfo.regionOrigin}
                onChange={onChangeHandler}
                placeholder="e.g. Channapatna, Karnataka"
                className="rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-brand-emerald"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              GI Tag (optional)
              <select
                name="giTag"
                value={productInfo.giTag}
                onChange={onChangeHandler}
                className="rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-brand-emerald"
              >
                <option value="">None</option>
                {GI_TAG_OPTIONS.map((tag) => (
                  <option key={tag} value={tag}>
                    {tag}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1.5 text-sm sm:col-span-2">
              Care Instructions
              <textarea
                name="careInstructions"
                value={productInfo.careInstructions}
                onChange={onChangeHandler}
                rows={3}
                placeholder="e.g. Wipe with a dry cloth; avoid prolonged moisture"
                className="resize-none rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-brand-emerald"
              />
            </label>
          </div>

          <div className="mt-6 border-t border-slate-100 pt-5">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-medium text-slate-800">
                Custom specifications
              </h3>
              <button
                type="button"
                onClick={addCustomSpec}
                className="inline-flex items-center gap-1 rounded-md border border-brand-emerald/30 px-3 py-1.5 text-xs text-brand-emerald hover:bg-brand-emerald-soft"
              >
                <PlusIcon size={14} />
                Add Specification
              </button>
            </div>
            {customSpecs.length ? (
              <div className="mt-3 space-y-2">
                {customSpecs.map((row, index) => (
                  <div key={`spec-${index}`} className="flex flex-wrap items-center gap-2">
                    <input
                      type="text"
                      value={row.key}
                      onChange={(event) =>
                        updateCustomSpec(index, "key", event.target.value)
                      }
                      placeholder="Attribute"
                      className="min-w-[8rem] flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-emerald"
                    />
                    <input
                      type="text"
                      value={row.value}
                      onChange={(event) =>
                        updateCustomSpec(index, "value", event.target.value)
                      }
                      placeholder="Value"
                      className="min-w-[8rem] flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-emerald"
                    />
                    <button
                      type="button"
                      onClick={() => removeCustomSpec(index)}
                      className="rounded-md p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
                      aria-label="Remove specification"
                    >
                      <Trash2Icon size={16} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-xs text-slate-400">
                No custom attributes yet. Use Add Specification for unique traits.
              </p>
            )}
          </div>
        </section>
      </div>

      {/* Sticky action bar */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-brand-gold/20 bg-brand-cream/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <p className="text-xs text-slate-500">
            {images.length < MIN_PHOTOS
              ? `Add ${MIN_PHOTOS - images.length} more photo${MIN_PHOTOS - images.length === 1 ? "" : "s"} to publish`
              : "Ready to save draft or publish"}
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={Boolean(saving) || busy || !images.length}
              onClick={() => void saveProduct(false)}
              className="rounded-md border border-brand-emerald/40 bg-white px-4 py-2.5 text-sm text-brand-emerald transition hover:bg-brand-emerald-soft disabled:opacity-60"
            >
              {saving === "draft" ? "Saving draft…" : "Save Draft"}
            </button>
            <button
              type="button"
              disabled={
                Boolean(saving) ||
                busy ||
                images.length < MIN_PHOTOS ||
                images.length > MAX_PHOTOS
              }
              onClick={() => void saveProduct(true)}
              className="rounded-md bg-brand-emerald px-4 py-2.5 text-sm text-white transition hover:bg-brand-amber disabled:opacity-60"
            >
              {saving === "publish" ? "Publishing…" : "Publish Product"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
