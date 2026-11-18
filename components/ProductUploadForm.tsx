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
  ClapperboardIcon,
  ImagePlusIcon,
  InfoIcon,
  Loader2Icon,
  PackageIcon,
  RulerIcon,
  Trash2Icon,
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
import { claimNextProductSku, getActiveStore } from "@/lib/storeRegistry"
import { formatProductTitle } from "@/lib/productCodes"

type UploadedImage = {
  id: string
  url: string
  key?: string | null
  name: string
  previewUrl: string
  slotId: string
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
  stock: string
  category: string
  material: string
  craftTechnique: string
  dimensions: string
  regionOrigin: string
}

type RouteIds = {
  artisanId: string
  productId: string
  storeId: string
  skuSequence?: number | null
}

const MIN_PHOTOS = 4
const MAX_PHOTOS = 6
const IMAGE_ACCEPT =
  "image/jpeg,image/png,image/webp,image/gif,.jpg,.jpeg,.png,.webp,.gif"
const VIDEO_ACCEPT =
  "video/mp4,video/webm,video/quicktime,video/x-m4v,.mp4,.webm,.mov,.m4v"

const PHOTO_SLOTS = [
  { id: "main", label: "1. Main Shot", optional: false },
  { id: "angle", label: "2. Angle View", optional: false },
  { id: "detail", label: "3. Detail / Texture", optional: false },
  { id: "scale", label: "4. In-Use / Scale", optional: false },
  { id: "packaging", label: "5. Packaging (Opt.)", optional: true },
  { id: "back", label: "6. Back View (Opt.)", optional: true },
] as const

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
    stock: "10",
    category: "",
    material: "",
    craftTechnique: "",
    dimensions: "",
    regionOrigin: "",
  }
}

function emptySlots(): Array<UploadedImage | null> {
  return PHOTO_SLOTS.map(() => null)
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

const inputClass =
  "w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-brand-emerald focus:ring-2 focus:ring-brand-emerald/15"
const labelClass = "mb-1.5 block text-sm font-medium text-slate-700"
const cardClass =
  "rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6"

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
  const videoInputId = useId()
  const slotInputRefs = useRef<Array<HTMLInputElement | null>>([])
  const videoInputRef = useRef<HTMLInputElement>(null)
  const claimedRef = useRef<RouteIds | null>(null)
  const slotsRef = useRef<Array<UploadedImage | null>>(emptySlots())
  const videoRef = useRef<UploadedVideo | null>(null)

  const [artisanId, setArtisanId] = useState(artisanIdProp || "")
  const [productId, setProductId] = useState(productIdProp || "")
  const [busySlot, setBusySlot] = useState<string | null>(null)
  const [busyVideo, setBusyVideo] = useState(false)
  const [progress, setProgress] = useState<CompressAndUploadProgress | null>(
    null
  )
  const [slots, setSlots] = useState<Array<UploadedImage | null>>(emptySlots())
  const [video, setVideo] = useState<UploadedVideo | null>(null)
  const [error, setError] = useState("")
  const [productInfo, setProductInfo] = useState<ProductFields>(emptyFields())
  const [customSpecs, setCustomSpecs] = useState<CustomSpec[]>([])
  const [saving, setSaving] = useState<"draft" | "publish" | null>(null)

  useEffect(() => {
    slotsRef.current = slots
  }, [slots])

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
    if (!artisanIdProp && store.artisanCode) {
      setArtisanId(store.artisanCode)
    }
  }, [artisanIdProp])

  const filledImages = slots.filter(Boolean) as UploadedImage[]
  const filledCount = filledImages.length

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
      throw new Error(
        "Approve and activate your workshop before uploading media."
      )
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
    return route
  }, [artisanIdProp, productIdProp])

  const handleSlotFile = useCallback(
    async (slotIndex: number, fileList: FileList | File[] | null) => {
      const files = Array.from(fileList || []).filter(Boolean)
      if (!files.length) return

      const slot = PHOTO_SLOTS[slotIndex]
      const file = files[0]
      setError("")
      setBusySlot(slot.id)
      setProgress(null)

      try {
        const route = ensureRouteIds()
        if (!isImageFile(file)) {
          throw new Error(`Unsupported image type: ${file.name}`)
        }
        if (file.size > 5 * 1024 * 1024) {
          throw new Error(`Image "${file.name}" must be 5MB or smaller.`)
        }

        setProgress({
          percent: 30,
          stage: "uploading",
          message: `Uploading ${slot.label}…`,
        })
        const uploaded = await uploadImages([file], route)
        const nextImage: UploadedImage = {
          id: `${slot.id}-${Date.now()}`,
          url: uploaded.urls[0],
          key: uploaded.keys[0] || null,
          name: file.name,
          previewUrl: URL.createObjectURL(file),
          slotId: slot.id,
        }

        const nextSlots = [...slotsRef.current]
        const previous = nextSlots[slotIndex]
        if (previous?.previewUrl?.startsWith("blob:")) {
          URL.revokeObjectURL(previous.previewUrl)
        }
        nextSlots[slotIndex] = nextImage
        setSlots(nextSlots)
        setProgress({
          percent: 100,
          stage: "done",
          message: "Photo uploaded to Cloudflare R2.",
        })
        onComplete?.({
          images: nextSlots.filter(Boolean) as UploadedImage[],
          video: videoRef.current,
          artisanId: route.artisanId,
          productId: route.productId,
        })
      } catch (err) {
        const message = err instanceof Error ? err.message : "Upload failed."
        setError(message)
        setProgress({ percent: 0, stage: "error", message })
        toast.error(message)
      } finally {
        setBusySlot(null)
        const input = slotInputRefs.current[slotIndex]
        if (input) input.value = ""
      }
    },
    [ensureRouteIds, onComplete]
  )

  const handleVideoFile = useCallback(
    async (fileList: FileList | File[] | null) => {
      const files = Array.from(fileList || []).filter(Boolean)
      if (!files.length) return

      setError("")
      setBusyVideo(true)
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
          images: slotsRef.current.filter(Boolean) as UploadedImage[],
          video: nextVideo,
          artisanId: route.artisanId,
          productId: route.productId,
        })
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Video upload failed."
        setError(message)
        setProgress({ percent: 0, stage: "error", message })
        toast.error(message)
      } finally {
        setBusyVideo(false)
        if (videoInputRef.current) videoInputRef.current.value = ""
      }
    },
    [ensureRouteIds, onComplete]
  )

  const clearSlot = (slotIndex: number) => {
    setSlots((prev) => {
      const next = [...prev]
      const target = next[slotIndex]
      if (target?.previewUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(target.previewUrl)
      }
      next[slotIndex] = null
      return next
    })
  }

  const clearVideo = () => {
    if (video?.previewUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(video.previewUrl)
    }
    setVideo(null)
  }

  const onChangeHandler = (
    event: ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = event.target
    setProductInfo((prev) => ({ ...prev, [name]: value }))
  }

  const addCustomSpec = () => {
    setCustomSpecs((prev) => [...prev, { key: "", value: "" }])
  }

  const updateCustomSpec = (
    index: number,
    field: keyof CustomSpec,
    value: string
  ) => {
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
    slots.forEach((item) => {
      if (item?.previewUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(item.previewUrl)
      }
    })
    if (video?.previewUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(video.previewUrl)
    }
    setProductInfo(emptyFields())
    setCustomSpecs([])
    setSlots(emptySlots())
    setVideo(null)
    setProgress(null)
    setError("")
    claimedRef.current = null
    if (!productIdProp) setProductId("")
    if (!artisanIdProp) setArtisanId(storeArtisanCode)
  }

  const saveProduct = async (publish: boolean) => {
    if (publish && (filledCount < MIN_PHOTOS || filledCount > MAX_PHOTOS)) {
      toast.error(`Publish requires ${MIN_PHOTOS}–${MAX_PHOTOS} product photos.`)
      return
    }
    if (!filledCount) {
      toast.error("Add at least one product photo.")
      return
    }

    setSaving(publish ? "publish" : "draft")
    try {
      const store = getActiveStore()
      if (!store) {
        throw new Error(
          "Connect an active workshop before saving products."
        )
      }
      if (store.status !== "approved" || !store.isActive) {
        throw new Error(
          "Approve and activate your workshop before adding products."
        )
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
      const stockQty = Number.parseInt(String(productInfo.stock), 10)

      if (!name) throw new Error("Product title is required.")
      if (!description) throw new Error("Story & description is required.")
      if (!category) throw new Error("Select a craft category.")
      if (!Number.isFinite(mrp) || mrp <= 0) {
        throw new Error("Enter a valid actual price (₹).")
      }
      if (!Number.isFinite(price) || price <= 0) {
        throw new Error("Enter a valid offer price (₹).")
      }
      if (price > mrp) {
        throw new Error("Offer price cannot be higher than actual price.")
      }
      if (!Number.isFinite(stockQty) || stockQty < 0) {
        throw new Error("Enter a valid stock quantity.")
      }

      const imageUrls = filledImages.map((item) => item.url)
      const videoUrl = video?.url || null

      const persisted = await createMarketplaceProduct({
        title: name,
        description,
        category,
        priceInr: price,
        mrpInr: mrp,
        stockQuantity: stockQty,
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
          regionOrigin: productInfo.regionOrigin,
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
        stock: stockQty,
        category,
        images: imageUrls,
        video: videoUrl,
        mediaStorage: "r2" as const,
        inStock: stockQty > 0,
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
            `${formatProductTitle(product)} saved to workshop catalog — sign in to sync to Supabase`
          )
        } else if (persisted.code === "SUPABASE_UNAVAILABLE") {
          toast.success(
            `${formatProductTitle(product)} saved to workshop catalog`
          )
        } else if (persisted.code === "VALIDATION") {
          toast.error(persisted.error)
          return
        } else {
          // Keep a local copy even when cloud insert fails (e.g. missing migration).
          toast.success(
            `${formatProductTitle(product)} saved to workshop catalog (cloud sync pending)`
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

  const pathPreview = `artisans/${artisanId || "ART001"}/products/`
  const busy = Boolean(busySlot) || busyVideo
  const photosNeededForPublish = Math.max(0, MIN_PHOTOS - filledCount)
  const canPublish =
    filledCount >= MIN_PHOTOS && filledCount <= MAX_PHOTOS && !busy && !saving
  const canSaveDraft = filledCount > 0 && !busy && !saving

  const focusNextRequiredSlot = () => {
    const nextRequired = PHOTO_SLOTS.findIndex(
      (slot, index) => !slot.optional && !slots[index]
    )
    if (nextRequired < 0) return
    const el = document.getElementById(
      `photo-slot-${PHOTO_SLOTS[nextRequired].id}`
    )
    el?.scrollIntoView({ behavior: "smooth", block: "center" })
    el?.classList.add("ring-2", "ring-brand-amber")
    window.setTimeout(() => {
      el?.classList.remove("ring-2", "ring-brand-amber")
    }, 1600)
  }

  return (
    <div className="relative pb-28 text-slate-600">
      <div className="mx-auto max-w-4xl space-y-5">
        {/* Page header */}
        <header>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            Add New Handicraft Piece
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-500">
            Upload high-resolution photos and optional item video. Files are
            stored securely in Cloudflare R2 under{" "}
            <span className="font-mono text-[13px] text-brand-emerald">
              {pathPreview}
            </span>
          </p>
        </header>

        {/* Master workshop video */}
        <aside className="flex flex-col gap-3 rounded-xl border border-brand-emerald/25 bg-brand-emerald-soft/70 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-5">
          <div className="flex gap-3">
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-brand-emerald shadow-sm">
              <ClapperboardIcon size={18} />
            </span>
            <div>
              <p className="text-sm font-semibold text-slate-800">
                Master Workshop Video{" "}
                <span className="font-normal text-slate-500">
                  (Shared across your catalog)
                </span>
              </p>
              <p className="mt-0.5 text-xs leading-relaxed text-slate-600 sm:text-sm">
                Your profile workshop video is already linked to all your
                product listings automatically. Manage it in profile settings —
                it is not uploaded here.
              </p>
            </div>
          </div>
          <Link
            href="/store"
            className="inline-flex shrink-0 items-center justify-center rounded-lg border border-brand-emerald/30 bg-white px-3.5 py-2 text-sm font-medium text-brand-emerald transition hover:bg-brand-emerald-soft"
          >
            Manage Workshop Video
          </Link>
        </aside>

        {/* Product media */}
        <section className={cardClass}>
          <div className="flex items-start gap-2">
            <ImagePlusIcon size={18} className="mt-0.5 text-brand-emerald" />
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Product Photos{" "}
                <span className="font-normal text-slate-500">
                  (Upload 4 to 6 Photos)
                </span>
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                JPEG / PNG / WebP · max 5MB each · {filledCount}/{MAX_PHOTOS}{" "}
                uploaded
              </p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
            {PHOTO_SLOTS.map((slot, index) => {
              const image = slots[index]
              const uploading = busySlot === slot.id
              const requiredEmpty = !slot.optional && !image
              return (
                <div
                  key={slot.id}
                  id={`photo-slot-${slot.id}`}
                  className="relative rounded-xl transition"
                >
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => slotInputRefs.current[index]?.click()}
                    className={`group relative flex aspect-[4/3] w-full flex-col items-center justify-center overflow-hidden rounded-xl border-2 border-dashed px-2 text-center transition ${
                      image
                        ? "border-brand-emerald/40 bg-slate-50"
                        : requiredEmpty
                          ? "border-brand-amber/50 bg-brand-amber-soft/40 hover:border-brand-amber"
                          : "border-slate-200 bg-slate-50/60 hover:border-brand-emerald/50 hover:bg-brand-emerald-soft/40"
                    } ${busy ? "cursor-wait opacity-70" : "cursor-pointer"}`}
                  >
                    {image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={image.previewUrl || image.url}
                        alt={slot.label}
                        className="absolute inset-0 h-full w-full object-cover"
                      />
                    ) : (
                      <>
                        <span className="mb-2 flex h-9 w-9 items-center justify-center rounded-full bg-white text-slate-400 shadow-sm group-hover:text-brand-emerald">
                          {uploading ? (
                            <Loader2Icon size={16} className="animate-spin" />
                          ) : (
                            <ImagePlusIcon size={16} />
                          )}
                        </span>
                        <span className="text-xs font-medium text-slate-600">
                          {slot.label}
                        </span>
                        {requiredEmpty ? (
                          <span className="mt-1 text-[10px] font-medium uppercase tracking-wide text-brand-amber">
                            Required
                          </span>
                        ) : null}
                      </>
                    )}
                    {image ? (
                      <span className="absolute inset-x-0 bottom-0 bg-black/55 px-2 py-1 text-[11px] font-medium text-white">
                        {slot.label}
                      </span>
                    ) : null}
                  </button>
                  {image ? (
                    <button
                      type="button"
                      onClick={() => clearSlot(index)}
                      className="absolute -right-1.5 -top-1.5 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-slate-800 text-white shadow hover:bg-red-600"
                      aria-label={`Remove ${slot.label}`}
                    >
                      <XIcon size={12} />
                    </button>
                  ) : null}
                  <input
                    ref={(el) => {
                      slotInputRefs.current[index] = el
                    }}
                    type="file"
                    accept={IMAGE_ACCEPT}
                    hidden
                    disabled={busy}
                    onChange={(event) => {
                      void handleSlotFile(index, event.target.files)
                    }}
                  />
                </div>
              )
            })}
          </div>

          <div className="mt-5 flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-brand-emerald shadow-sm">
                <ClapperboardIcon size={16} />
              </span>
              <div>
                <p className="text-sm font-medium text-slate-800">
                  Product Close-up Video{" "}
                  <span className="font-normal text-slate-500">(Optional)</span>
                </p>
                <p className="text-xs text-slate-500">
                  Short clip for this specific item. Compresses to ~720p before
                  R2 upload.
                </p>
                {video ? (
                  <p className="mt-1 text-xs text-brand-emerald">
                    {video.name} · {formatMb(video.originalBytes)}
                    {video.compressedBytes !== video.originalBytes
                      ? ` → ${formatMb(video.compressedBytes)}`
                      : ""}
                  </p>
                ) : null}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {video ? (
                <button
                  type="button"
                  onClick={clearVideo}
                  className="rounded-lg px-3 py-2 text-xs text-slate-500 hover:text-red-600"
                >
                  Remove
                </button>
              ) : null}
              <button
                type="button"
                disabled={busy || Boolean(video)}
                onClick={() => videoInputRef.current?.click()}
                className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 transition hover:border-brand-emerald/40 hover:text-brand-emerald disabled:opacity-60"
              >
                {busyVideo ? "Uploading…" : "Choose Item Video"}
              </button>
              <input
                ref={videoInputRef}
                id={videoInputId}
                type="file"
                accept={VIDEO_ACCEPT}
                hidden
                disabled={busy || Boolean(video)}
                onChange={(event) => {
                  void handleVideoFile(event.target.files)
                }}
              />
            </div>
          </div>

          {video ? (
            <video
              src={video.previewUrl || video.url}
              controls
              className="mt-4 aspect-video w-full max-w-md rounded-lg bg-slate-900"
            />
          ) : null}

          {progress ? (
            <div
              className={`mt-4 overflow-hidden rounded-lg border px-3 py-2.5 text-sm ${
                progress.stage === "error"
                  ? "border-red-200 bg-red-50 text-red-700"
                  : progress.stage === "done"
                    ? "border-brand-emerald/30 bg-brand-emerald-soft text-brand-emerald"
                    : "border-slate-200 bg-slate-50 text-slate-600"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="flex items-center gap-2">
                  {progress.stage !== "done" && progress.stage !== "error" ? (
                    <Loader2Icon size={14} className="animate-spin" />
                  ) : null}
                  {progress.message}
                </p>
                <span className="font-mono text-xs tabular-nums">
                  {Math.round(progress.percent)}%
                </span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/80">
                <div
                  className={`h-full rounded-full transition-[width] ${
                    progress.stage === "error"
                      ? "bg-red-400"
                      : "bg-brand-emerald"
                  }`}
                  style={{
                    width: `${Math.min(100, Math.max(0, progress.percent))}%`,
                  }}
                />
              </div>
            </div>
          ) : null}

          {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
        </section>

        {/* Basic information */}
        <section className={cardClass}>
          <div className="flex items-center gap-2">
            <InfoIcon size={18} className="text-brand-emerald" />
            <h2 className="text-base font-semibold text-slate-900">
              Basic Information
            </h2>
          </div>
          <div className="mt-5 space-y-4">
            <label className="block">
              <span className={labelClass}>Product Title</span>
              <input
                type="text"
                name="name"
                value={productInfo.name}
                onChange={onChangeHandler}
                placeholder="e.g., Hand-carved Rosewood Spice Box with Brass Inlay"
                className={inputClass}
                required
              />
            </label>
            <label className="block">
              <span className={labelClass}>Craft Category</span>
              <select
                name="category"
                value={productInfo.category}
                onChange={onChangeHandler}
                className={inputClass}
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
            <label className="block">
              <span className={labelClass}>Story & Description</span>
              <textarea
                name="description"
                value={productInfo.description}
                onChange={onChangeHandler}
                rows={5}
                placeholder="Share the heritage, materials, and craftsmanship behind this piece..."
                className={`${inputClass} resize-none`}
                required
              />
            </label>
          </div>
        </section>

        {/* Pricing & inventory */}
        <section className={cardClass}>
          <div className="flex items-center gap-2">
            <PackageIcon size={18} className="text-brand-emerald" />
            <h2 className="text-base font-semibold text-slate-900">
              Pricing & Inventory{" "}
              <span className="font-normal text-slate-500">(INR)</span>
            </h2>
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            <label className="block">
              <span className={labelClass}>Actual Price (₹)</span>
              <input
                type="number"
                name="mrp"
                min="0"
                step="1"
                value={productInfo.mrp}
                onChange={onChangeHandler}
                placeholder="₹ 4,500"
                className={inputClass}
                required
              />
            </label>
            <label className="block">
              <span className={labelClass}>Offer Price (₹)</span>
              <input
                type="number"
                name="price"
                min="0"
                step="1"
                value={productInfo.price}
                onChange={onChangeHandler}
                placeholder="₹ 3,499"
                className={inputClass}
                required
              />
            </label>
            <label className="block">
              <span className={labelClass}>Stock Quantity</span>
              <input
                type="number"
                name="stock"
                min="0"
                step="1"
                value={productInfo.stock}
                onChange={onChangeHandler}
                placeholder="10"
                className={inputClass}
                required
              />
            </label>
          </div>
        </section>

        {/* Handicraft specifications */}
        <section className={cardClass}>
          <div className="flex items-center gap-2">
            <RulerIcon size={18} className="text-brand-emerald" />
            <h2 className="text-base font-semibold text-slate-900">
              Handicraft Specifications
            </h2>
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className={labelClass}>Primary Material</span>
              <input
                type="text"
                name="material"
                value={productInfo.material}
                onChange={onChangeHandler}
                placeholder="e.g., Sheesham Wood & Brass"
                className={inputClass}
              />
            </label>
            <label className="block">
              <span className={labelClass}>Craft Technique</span>
              <input
                type="text"
                name="craftTechnique"
                value={productInfo.craftTechnique}
                onChange={onChangeHandler}
                placeholder="e.g., Tarkashi Brass Wire Inlay"
                className={inputClass}
              />
            </label>
            <label className="block">
              <span className={labelClass}>Dimensions (L x W x H)</span>
              <input
                type="text"
                name="dimensions"
                value={productInfo.dimensions}
                onChange={onChangeHandler}
                placeholder="e.g., 20cm x 15cm x 8cm"
                className={inputClass}
              />
            </label>
            <label className="block">
              <span className={labelClass}>Origin / Region</span>
              <input
                type="text"
                name="regionOrigin"
                value={productInfo.regionOrigin}
                onChange={onChangeHandler}
                placeholder="e.g., Saharanpur, Uttar Pradesh"
                className={inputClass}
              />
            </label>
          </div>

          <div className="mt-5 space-y-3 border-t border-slate-100 pt-5">
            {customSpecs.map((row, index) => (
              <div
                key={`spec-${index}`}
                className="flex flex-wrap items-center gap-2"
              >
                <input
                  type="text"
                  value={row.key}
                  onChange={(event) =>
                    updateCustomSpec(index, "key", event.target.value)
                  }
                  placeholder="Attribute"
                  className={`${inputClass} min-w-[8rem] flex-1`}
                />
                <input
                  type="text"
                  value={row.value}
                  onChange={(event) =>
                    updateCustomSpec(index, "value", event.target.value)
                  }
                  placeholder="Value"
                  className={`${inputClass} min-w-[8rem] flex-1`}
                />
                <button
                  type="button"
                  onClick={() => removeCustomSpec(index)}
                  className="rounded-lg p-2.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                  aria-label="Remove specification"
                >
                  <Trash2Icon size={16} />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={addCustomSpec}
              className="inline-flex items-center justify-center rounded-lg border border-brand-emerald/25 bg-brand-emerald-soft/80 px-4 py-2.5 text-sm font-medium text-brand-emerald transition hover:bg-brand-emerald-soft"
            >
              + Add Custom Specification
            </button>
          </div>
        </section>
      </div>

      {/* Sticky action bar */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="min-w-0 text-xs text-slate-500">
            {photosNeededForPublish > 0 ? (
              <button
                type="button"
                onClick={focusNextRequiredSlot}
                className="text-left text-brand-amber hover:underline"
              >
                {filledCount}/{MAX_PHOTOS} photos · add {photosNeededForPublish}{" "}
                more required shot
                {photosNeededForPublish === 1 ? "" : "s"} to enable Publish
              </button>
            ) : (
              <p className="text-brand-emerald">
                {filledCount}/{MAX_PHOTOS} photos · ready to publish
              </p>
            )}
            <p className="mt-0.5 text-[11px] text-slate-400">
              Save as Draft works with 1+ photo. Publish needs {MIN_PHOTOS}–{MAX_PHOTOS}.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={!canSaveDraft}
              onClick={() => void saveProduct(false)}
              className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-800 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving === "draft" ? "Saving…" : "Save as Draft"}
            </button>
            <button
              type="button"
              disabled={!canPublish}
              onClick={() => void saveProduct(true)}
              title={
                canPublish
                  ? "Publish this piece"
                  : `Upload at least ${MIN_PHOTOS} photos to publish`
              }
              className={`rounded-lg px-5 py-2.5 text-sm font-medium transition ${
                canPublish
                  ? "bg-brand-emerald text-white hover:bg-[#036647]"
                  : "cursor-not-allowed bg-slate-200 text-slate-500"
              }`}
            >
              {saving === "publish" ? "Publishing…" : "Publish Piece"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
