'use client'

import { useEffect, useId, useRef, useState } from "react"
import { toast } from "react-hot-toast"
import Image from "next/image"
import Link from "next/link"
import Loading from "@/components/shared/Loading"
import { useCurrency } from "@/components/shared/CurrencyProvider"
import {
  ARTISAN_CATEGORIES,
  listStoreProducts,
  toggleProductStock,
  updateProduct,
} from "@/lib/productCatalog"
import { getArtisanWorkshopCatalog } from "@/app/actions/artisan-dashboard"
import {
  ClapperboardIcon,
  ImagePlusIcon,
  Loader2Icon,
  PencilIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react"
import { formatProductTitle } from "@/lib/productCodes"
import { updateMarketplaceProduct } from "@/app/actions/marketplace-products"
import { getActiveStore } from "@/lib/storeRegistry"
import { getProductImageUrls, getProductThumbnailUrl } from "@/lib/marketplace/media"

const MAX_PHOTOS = 6
const IMAGE_ACCEPT =
  "image/jpeg,image/png,image/webp,image/gif,.jpg,.jpeg,.png,.webp,.gif"

const inputClass =
  "w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-brand-emerald focus:ring-2 focus:ring-brand-emerald/15"
const labelClass = "mb-1.5 block text-sm font-medium text-slate-700"

function emptyDraft() {
  return {
    name: "",
    description: "",
    category: "",
    mrp: "",
    price: "",
    stock: "",
    material: "",
    craftTechnique: "",
    dimensions: "",
    regionOrigin: "",
    images: [],
    video: null,
    inStock: true,
  }
}

function productToDraft(product) {
  return {
    name: product.name || "",
    description: product.description || "",
    category: product.category || "",
    mrp: product.mrp != null ? String(product.mrp) : "",
    price: product.price != null ? String(product.price) : "",
    stock: product.stock != null ? String(product.stock) : "",
    material: product.material || "",
    craftTechnique: product.craftTechnique || "",
    dimensions: product.dimensions || "",
    regionOrigin: product.regionOrigin || "",
    images: getProductImageUrls(product),
    video: product.video || product.item_video_url || null,
    inStock: Boolean(product.inStock),
  }
}

async function uploadImages(files, { artisanId, productId, storeId }) {
  const formData = new FormData()
  formData.append("artisanId", artisanId || "")
  formData.append("productId", productId || "")
  formData.append("storeId", storeId || "")
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

  return payload.urls
}

export default function StoreManageProducts() {
  const { currency: currencyInfo } = useCurrency()
  const currency = currencyInfo.symbol
  const fileInputId = useId()
  const fileInputRef = useRef(null)

  const [loading, setLoading] = useState(true)
  const [products, setProducts] = useState([])
  const [catalogSource, setCatalogSource] = useState("empty")
  const [editingId, setEditingId] = useState(null)
  const [draft, setDraft] = useState(emptyDraft())
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)

  const editingProduct = products.find((product) => product.id === editingId) || null
  const usingSample = false

  const fetchProducts = async () => {
    const cloud = await getArtisanWorkshopCatalog()
    if (cloud.ok && cloud.products.length) {
      setProducts(cloud.products)
      setCatalogSource("supabase")
      setLoading(false)
      return
    }

    const storeProducts = listStoreProducts()
    setProducts(storeProducts)
    setCatalogSource(storeProducts.length ? "local" : "empty")
    setLoading(false)
  }

  const toggleStock = async (productId) => {
    if (catalogSource === "supabase") {
      const current = products.find((product) => product.id === productId)
      if (!current) throw new Error("Product not found.")
      const nextInStock = !current.inStock
      const result = await updateMarketplaceProduct({
        productId,
        inStock: nextInStock,
      })
      if (result.ok === false && result.code === "VALIDATION") {
        throw new Error(result.error)
      }
      setProducts((prev) =>
        prev.map((product) =>
          product.id === productId
            ? { ...product, inStock: nextInStock }
            : product
        )
      )
      if (editingId === productId) {
        setDraft((prev) => ({ ...prev, inStock: nextInStock }))
      }
      return { id: productId, inStock: nextInStock }
    }

    const updated = toggleProductStock(productId)
    if (!updated) {
      throw new Error("Stock toggle is available for products you added from this workshop.")
    }
    setProducts(listStoreProducts())
    if (editingId === productId) {
      setDraft((prev) => ({ ...prev, inStock: updated.inStock }))
    }
    return updated
  }

  const openEditor = (product) => {
    setEditingId(product.id)
    setDraft(productToDraft(product))
  }

  const closeEditor = () => {
    setEditingId(null)
    setDraft(emptyDraft())
  }

  const setField = (key, value) => {
    setDraft((prev) => ({ ...prev, [key]: value }))
  }

  const removeImage = (index) => {
    setDraft((prev) => {
      if (prev.images.length <= 1) {
        toast.error("Keep at least one product photo.")
        return prev
      }
      return {
        ...prev,
        images: prev.images.filter((_, i) => i !== index),
      }
    })
  }

  const onAddPhotos = async (event) => {
    const files = Array.from(event.target.files || []).filter((file) =>
      file.type.startsWith("image/")
    )
    event.target.value = ""
    if (!files.length || !editingProduct) return

    const remaining = MAX_PHOTOS - draft.images.length
    if (remaining <= 0) {
      toast.error(`You already have ${MAX_PHOTOS} photos (maximum).`)
      return
    }

    const selected = files.slice(0, remaining)
    if (files.length > remaining) {
      toast(`Only ${remaining} more photo${remaining === 1 ? "" : "s"} can be added.`)
    }

    const store = getActiveStore()
    setUploading(true)
    try {
      const urls = await uploadImages(selected, {
        artisanId: editingProduct.artisanCode || store?.artisanCode || "",
        productId: editingProduct.sku || editingProduct.id,
        storeId: store?.id || editingProduct.storeId || "",
      })
      setDraft((prev) => ({
        ...prev,
        images: [...prev.images, ...urls].slice(0, MAX_PHOTOS),
      }))
      toast.success(
        urls.length === 1 ? "Photo added" : `${urls.length} photos added`
      )
    } catch (error) {
      toast.error(error?.message || "Could not upload photos.")
    } finally {
      setUploading(false)
    }
  }

  const saveEdits = async () => {
    if (!editingProduct) {
      throw new Error("Nothing to save.")
    }

    const name = String(draft.name || "").trim()
    const description = String(draft.description || "").trim()
    const category = String(draft.category || "").trim()
    const mrp = Number(draft.mrp)
    const price = Number(draft.price)
    const stockRaw = String(draft.stock || "").trim()
    const stock =
      stockRaw === "" ? null : Number.parseInt(stockRaw, 10)
    const images = draft.images.filter(Boolean)

    if (!name) throw new Error("Product title is required.")
    if (!description) throw new Error("Description is required.")
    if (!category) throw new Error("Select a category.")
    if (!Number.isFinite(mrp) || mrp <= 0) {
      throw new Error("Enter a valid MRP (₹).")
    }
    if (!Number.isFinite(price) || price <= 0) {
      throw new Error("Enter a valid offer price (₹).")
    }
    if (price > mrp) {
      throw new Error("Offer price cannot be higher than MRP.")
    }
    if (stock !== null && (!Number.isFinite(stock) || stock < 0)) {
      throw new Error("Enter a valid stock quantity.")
    }
    if (!images.length) throw new Error("Keep at least one product photo.")
    if (images.length > MAX_PHOTOS) {
      throw new Error(`A product can have at most ${MAX_PHOTOS} photos.`)
    }

    const patch = {
      name,
      description,
      category,
      mrp,
      price,
      stock: stock === null ? undefined : stock,
      images,
      video: draft.video || null,
      inStock: stock === null ? draft.inStock : stock > 0,
      material: draft.material,
      craftTechnique: draft.craftTechnique,
      dimensions: draft.dimensions,
      regionOrigin: draft.regionOrigin,
    }

    const cloud = await updateMarketplaceProduct({
      productId: editingProduct.id,
      title: name,
      description,
      category,
      priceInr: price,
      mrpInr: mrp,
      stockQuantity: stock,
      images,
      videoProofUrl: draft.video || null,
      inStock: patch.inStock,
      specs: {
        material: draft.material,
        craftTechnique: draft.craftTechnique,
        dimensions: draft.dimensions,
        regionOrigin: draft.regionOrigin,
        stockQuantity: stock,
      },
    })

    // Keep a local mirror when this browser has a workshop catalog entry.
    let updated = null
    try {
      updated = updateProduct(editingProduct.id, patch)
    } catch {
      updated = null
    }

    if (cloud.ok) {
      await fetchProducts()
      setDraft(
        productToDraft({
          ...editingProduct,
          ...patch,
          images,
        })
      )
      return `${formatProductTitle({ ...editingProduct, ...patch, name })} updated`
    }

    if (updated) {
      setProducts(listStoreProducts())
      setDraft(productToDraft(updated))
      if (cloud.code === "VALIDATION") {
        throw new Error(cloud.error)
      }
      return `${formatProductTitle(updated)} saved locally`
    }

    if (cloud.code === "VALIDATION") {
      throw new Error(cloud.error)
    }
    throw new Error(cloud.error || "Could not update this product.")
  }

  useEffect(() => {
    fetchProducts()
  }, [])

  if (loading) return <Loading />

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3 mb-5 max-w-5xl">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-brand-gold">Catalog</p>
          <h1 className="text-2xl text-slate-500 mt-1">
            Manage <span className="text-slate-800 font-medium">Products</span>
          </h1>
        </div>
        <Link
          href="/store/add-product"
          className="text-sm bg-brand-emerald text-white px-4 py-2 rounded-md hover:bg-brand-amber transition"
        >
          Add product + video
        </Link>
      </div>

      {catalogSource === "supabase" ? (
        <p className="text-xs text-slate-400 mb-4">
          Showing products from your signed-in Supabase workshop.
        </p>
      ) : null}
      {catalogSource === "empty" ? (
        <p className="text-sm text-slate-500 mb-4">
          No products yet. Add your first piece to start managing the catalog.
        </p>
      ) : null}

      <table className="w-full max-w-5xl text-left ring ring-slate-200 rounded overflow-hidden text-sm bg-white/70">
        <thead className="bg-slate-50 text-gray-700 uppercase tracking-wider">
          <tr>
            <th className="px-4 py-3">Name</th>
            <th className="px-4 py-3 hidden md:table-cell">Description</th>
            <th className="px-4 py-3 hidden md:table-cell">MRP</th>
            <th className="px-4 py-3">Price</th>
            <th className="px-4 py-3">Media</th>
            <th className="px-4 py-3">Stock</th>
            <th className="px-4 py-3">Edit</th>
          </tr>
        </thead>
        <tbody className="text-slate-700">
          {products.map((product) => (
            <tr
              key={product.id}
              className={`border-t border-gray-200 hover:bg-gray-50 ${
                editingId === product.id ? "bg-brand-emerald/5" : ""
              }`}
            >
              <td className="px-4 py-3">
                <div className="flex gap-2 items-center">
                  <Image
                    width={40}
                    height={40}
                    className="p-1 shadow rounded cursor-pointer object-cover"
                    src={getProductThumbnailUrl(product) || "/upload_area.png"}
                    alt=""
                  />
                  <div>
                    <p>{formatProductTitle(product)}</p>
                    <p className="text-xs text-slate-400">{product.category}</p>
                  </div>
                </div>
              </td>
              <td className="px-4 py-3 max-w-md text-slate-600 hidden md:table-cell truncate">
                {product.description}
              </td>
              <td className="px-4 py-3 hidden md:table-cell">
                {currency} {Number(product.mrp).toLocaleString()}
              </td>
              <td className="px-4 py-3">
                {currency} {Number(product.price).toLocaleString()}
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2 text-xs">
                  <span>{getProductImageUrls(product).length} img</span>
                  {product.video ? (
                    <span className="inline-flex items-center gap-1 text-brand-emerald">
                      <ClapperboardIcon size={14} /> video
                    </span>
                  ) : (
                    <span className="text-slate-400">no video</span>
                  )}
                </div>
              </td>
              <td className="px-4 py-3 text-center">
                <label className="relative inline-flex items-center cursor-pointer text-gray-900 gap-3">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    onChange={() =>
                      toast.promise(toggleStock(product.id), {
                        loading: "Updating data...",
                        success: "Stock updated",
                        error: (err) => err?.message || "Could not update stock",
                      })
                    }
                    checked={Boolean(product.inStock)}
                    readOnly
                  />
                  <div className="w-9 h-5 bg-slate-300 rounded-full peer peer-checked:bg-green-600 transition-colors duration-200"></div>
                  <span className="dot absolute left-1 top-1 w-3 h-3 bg-white rounded-full transition-transform duration-200 ease-in-out peer-checked:translate-x-4"></span>
                </label>
              </td>
              <td className="px-4 py-3">
                <button
                  type="button"
                  onClick={() =>
                    editingId === product.id ? closeEditor() : openEditor(product)
                  }
                  className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:border-brand-emerald hover:text-brand-emerald transition"
                >
                  <PencilIcon size={14} />
                  {editingId === product.id ? "Close" : "Edit"}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {editingProduct && (
        <section className="mt-6 max-w-5xl rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-brand-gold">
                Edit product
              </p>
              <h2 className="mt-1 text-lg font-medium text-slate-800">
                {formatProductTitle(editingProduct)}
              </h2>
              <p className="text-sm text-slate-500 mt-0.5">
                Update details and add up to {MAX_PHOTOS} photos.
              </p>
            </div>
            <button
              type="button"
              onClick={closeEditor}
              className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              aria-label="Close editor"
            >
              <XIcon size={18} />
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className={labelClass} htmlFor="edit-name">
                Product title
              </label>
              <input
                id="edit-name"
                className={inputClass}
                value={draft.name}
                onChange={(e) => setField("name", e.target.value)}
                placeholder="Product name"
              />
            </div>

            <div className="sm:col-span-2">
              <label className={labelClass} htmlFor="edit-description">
                Description
              </label>
              <textarea
                id="edit-description"
                className={`${inputClass} min-h-[96px] resize-y`}
                value={draft.description}
                onChange={(e) => setField("description", e.target.value)}
                placeholder="Story & details"
              />
            </div>

            <div>
              <label className={labelClass} htmlFor="edit-category">
                Category
              </label>
              <select
                id="edit-category"
                className={inputClass}
                value={draft.category}
                onChange={(e) => setField("category", e.target.value)}
              >
                <option value="">Select category</option>
                {ARTISAN_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelClass} htmlFor="edit-stock">
                Stock quantity
              </label>
              <input
                id="edit-stock"
                type="number"
                min="0"
                className={inputClass}
                value={draft.stock}
                onChange={(e) => setField("stock", e.target.value)}
                placeholder="e.g. 10"
              />
            </div>

            <div>
              <label className={labelClass} htmlFor="edit-mrp">
                MRP ({currency})
              </label>
              <input
                id="edit-mrp"
                type="number"
                min="1"
                className={inputClass}
                value={draft.mrp}
                onChange={(e) => setField("mrp", e.target.value)}
              />
            </div>

            <div>
              <label className={labelClass} htmlFor="edit-price">
                Offer price ({currency})
              </label>
              <input
                id="edit-price"
                type="number"
                min="1"
                className={inputClass}
                value={draft.price}
                onChange={(e) => setField("price", e.target.value)}
              />
            </div>

            <div>
              <label className={labelClass} htmlFor="edit-material">
                Material
              </label>
              <input
                id="edit-material"
                className={inputClass}
                value={draft.material}
                onChange={(e) => setField("material", e.target.value)}
                placeholder="e.g. Rosewood"
              />
            </div>

            <div>
              <label className={labelClass} htmlFor="edit-technique">
                Craft technique
              </label>
              <input
                id="edit-technique"
                className={inputClass}
                value={draft.craftTechnique}
                onChange={(e) => setField("craftTechnique", e.target.value)}
                placeholder="e.g. Hand inlay"
              />
            </div>

            <div>
              <label className={labelClass} htmlFor="edit-dimensions">
                Dimensions
              </label>
              <input
                id="edit-dimensions"
                className={inputClass}
                value={draft.dimensions}
                onChange={(e) => setField("dimensions", e.target.value)}
                placeholder="e.g. 12 × 8 cm"
              />
            </div>

            <div>
              <label className={labelClass} htmlFor="edit-region">
                Region / origin
              </label>
              <input
                id="edit-region"
                className={inputClass}
                value={draft.regionOrigin}
                onChange={(e) => setField("regionOrigin", e.target.value)}
                placeholder="e.g. Mysore"
              />
            </div>
          </div>

          <div className="mt-6">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className={labelClass}>Photos</p>
                <p className="text-xs text-slate-500 -mt-1">
                  {draft.images.length} of {MAX_PHOTOS} · add or remove anytime
                </p>
              </div>
              <div>
                <input
                  ref={fileInputRef}
                  id={fileInputId}
                  type="file"
                  accept={IMAGE_ACCEPT}
                  multiple
                  className="sr-only"
                  onChange={onAddPhotos}
                  disabled={uploading || draft.images.length >= MAX_PHOTOS}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading || draft.images.length >= MAX_PHOTOS}
                  className="inline-flex items-center gap-1.5 rounded-md bg-brand-emerald px-3 py-2 text-xs font-medium text-white hover:bg-brand-amber transition disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {uploading ? (
                    <Loader2Icon size={14} className="animate-spin" />
                  ) : (
                    <ImagePlusIcon size={14} />
                  )}
                  {uploading ? "Uploading…" : "Add photos"}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6">
              {draft.images.map((url, index) => (
                <div
                  key={`${url}-${index}`}
                  className="group relative aspect-square overflow-hidden rounded-lg border border-slate-200 bg-slate-50"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt={`Product photo ${index + 1}`}
                    className="h-full w-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="absolute right-1.5 top-1.5 rounded-full bg-white/90 p-1 text-slate-600 opacity-0 shadow transition group-hover:opacity-100 hover:text-red-600"
                    aria-label={`Remove photo ${index + 1}`}
                  >
                    <Trash2Icon size={14} />
                  </button>
                  {index === 0 && (
                    <span className="absolute bottom-1.5 left-1.5 rounded bg-black/60 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-white">
                      Main
                    </span>
                  )}
                </div>
              ))}

              {draft.images.length < MAX_PHOTOS && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-slate-300 bg-slate-50/80 text-slate-500 hover:border-brand-emerald hover:text-brand-emerald transition disabled:opacity-50"
                >
                  <ImagePlusIcon size={20} />
                  <span className="text-xs">Add</span>
                </button>
              )}
            </div>

            {draft.video && (
              <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-brand-emerald">
                <ClapperboardIcon size={14} />
                Craft video attached
              </p>
            )}
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-5">
            <button
              type="button"
              disabled={saving || uploading}
              onClick={() => {
                setSaving(true)
                toast.promise(
                  saveEdits().finally(() => setSaving(false)),
                  {
                    loading: "Saving product…",
                    success: (msg) => msg,
                    error: (err) => err?.message || "Could not save product",
                  }
                )
              }}
              className="inline-flex items-center gap-2 rounded-md bg-brand-emerald px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-amber transition disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving && <Loader2Icon size={16} className="animate-spin" />}
              Save changes
            </button>
            <button
              type="button"
              onClick={closeEditor}
              className="rounded-md border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 transition"
            >
              Cancel
            </button>
          </div>
        </section>
      )}
    </>
  )
}
