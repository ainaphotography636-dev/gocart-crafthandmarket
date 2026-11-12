'use client'
import { assets, productDummyData } from "@/assets/assets"
import Image from "next/image"
import { useEffect, useState } from "react"
import { toast } from "react-hot-toast"
import { useDispatch } from "react-redux"
import {
  ARTISAN_CATEGORIES,
  createStoreProduct,
  listStoreProducts,
} from "@/lib/productCatalog"
import { getActiveStore } from "@/lib/storeRegistry"
import { setProduct } from "@/lib/features/product/productSlice"
import { ClapperboardIcon } from "lucide-react"
import { formatProductTitle } from "@/lib/productCodes"

export default function StoreAddProduct() {
  const dispatch = useDispatch()
  const [images, setImages] = useState({ 1: null, 2: null, 3: null, 4: null })
  const [video, setVideo] = useState(null)
  const [videoPreview, setVideoPreview] = useState("")
  const [artisanCode, setArtisanCode] = useState("")
  const [productInfo, setProductInfo] = useState({
    name: "",
    description: "",
    mrp: "",
    price: "",
    category: "",
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const store = getActiveStore()
    setArtisanCode(store?.artisanCode || "")
  }, [])

  const onChangeHandler = (e) => {
    setProductInfo({ ...productInfo, [e.target.name]: e.target.value })
  }

  const resetForm = () => {
    setImages({ 1: null, 2: null, 3: null, 4: null })
    setVideo(null)
    setProductInfo({
      name: "",
      description: "",
      mrp: "",
      price: "",
      category: "",
    })
  }

  useEffect(() => {
    if (!video) {
      setVideoPreview("")
      return
    }
    const url = URL.createObjectURL(video)
    setVideoPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [video])

  const onSubmitHandler = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { product, uploaded } = await createStoreProduct({
        ...productInfo,
        images,
        video,
      })

      const storeProducts = listStoreProducts()
      dispatch(setProduct([...storeProducts, ...productDummyData]))
      resetForm()

      const titled = formatProductTitle(product)
      if (uploaded.storage === "r2") {
        return product.video
          ? `${titled} added — photos & video saved to Cloudflare R2`
          : `${titled} added — images saved to Cloudflare R2`
      }
      return `${titled} saved locally. Connect Cloudflare R2 (with CORS PUT) for cloud media & video.`
    } finally {
      setLoading(false)
    }
  }

  return (
    <form
      onSubmit={(e) =>
        toast.promise(onSubmitHandler(e), {
          loading: "Uploading media & adding product...",
          success: (message) => message,
          error: (err) => err?.message || "Could not add product",
        })
      }
      className="text-slate-500 mb-28 max-w-3xl"
    >
      <p className="text-xs uppercase tracking-[0.18em] text-brand-gold">Artisan catalog</p>
      <h1 className="text-2xl mt-2">
        Add New <span className="text-slate-800 font-medium">Workshop Piece</span>
      </h1>
      <p className="text-sm mt-2 max-w-xl">
        Upload product photos and an optional making-of video. Files go to Cloudflare R2 under
        {artisanCode ? (
          <>
            {" "}
            <span className="font-mono text-brand-emerald">
              artisans/{artisanCode}/products/&lt;SKU&gt;/
            </span>
          </>
        ) : (
          " artisans/{artisanId}/products/{productId}/"
        )}
        .
      </p>

      <p className="mt-8 text-slate-700 font-medium">Product images</p>
      <div className="flex gap-3 mt-3 flex-wrap">
        {Object.keys(images).map((key) => (
          <label key={key} htmlFor={`images${key}`} className="cursor-pointer">
            <Image
              width={300}
              height={300}
              className="h-20 w-20 object-cover border border-slate-200 rounded"
              src={images[key] ? URL.createObjectURL(images[key]) : assets.upload_area}
              alt=""
            />
            <input
              type="file"
              accept="image/*"
              id={`images${key}`}
              onChange={(e) => setImages({ ...images, [key]: e.target.files?.[0] || null })}
              hidden
            />
          </label>
        ))}
      </div>

      <div className="mt-8 border border-brand-emerald/20 rounded-xl p-4 bg-brand-emerald-soft/40">
        <div className="flex items-center gap-2 text-brand-emerald">
          <ClapperboardIcon size={18} />
          <p className="font-medium text-sm">Workshop process video (optional)</p>
        </div>
        <p className="text-xs mt-2 max-w-lg">
          MP4 / WebM recommended. Under 4MB uploads through the server; larger files need R2 bucket
          CORS (PUT) for your Vercel domain.
        </p>
        <label
          htmlFor="product-video"
          className="mt-4 inline-flex items-center gap-2 border border-brand-emerald/30 bg-white px-4 py-2 rounded-md text-sm cursor-pointer hover:bg-brand-emerald-soft"
        >
          {video ? "Change video" : "Choose video"}
          <input
            id="product-video"
            type="file"
            accept="video/mp4,video/webm,video/quicktime"
            hidden
            onChange={(e) => setVideo(e.target.files?.[0] || null)}
          />
        </label>
        {video ? (
          <p className="text-xs mt-2 text-slate-600">
            Selected: {video.name} ({Math.round(video.size / (1024 * 1024))} MB)
          </p>
        ) : null}
        {videoPreview ? (
          <video src={videoPreview} controls className="mt-4 w-full max-w-md rounded-lg bg-black" />
        ) : null}
      </div>

      <label className="flex flex-col gap-2 my-6">
        Name
        <input
          type="text"
          name="name"
          onChange={onChangeHandler}
          value={productInfo.name}
          placeholder="e.g. Hand-thrown terracotta pot"
          className="w-full max-w-sm p-2 px-4 outline-none border border-slate-200 rounded"
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
          className="w-full max-w-sm p-2 px-4 outline-none border border-slate-200 rounded resize-none"
          required
        />
      </label>

      <div className="flex gap-5">
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
            className="w-full max-w-45 p-2 px-4 outline-none border border-slate-200 rounded"
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
            className="w-full max-w-45 p-2 px-4 outline-none border border-slate-200 rounded"
            required
          />
        </label>
      </div>

      <select
        onChange={(e) => setProductInfo({ ...productInfo, category: e.target.value })}
        value={productInfo.category}
        className="w-full max-w-sm p-2 px-4 my-6 outline-none border border-slate-200 rounded"
        required
      >
        <option value="">Select a craft category</option>
        {ARTISAN_CATEGORIES.map((category) => (
          <option key={category} value={category}>
            {category}
          </option>
        ))}
      </select>

      <br />

      <button
        disabled={loading}
        className="bg-brand-emerald text-white px-6 mt-4 py-2.5 hover:bg-brand-amber rounded transition disabled:opacity-60"
      >
        Add Product
      </button>
    </form>
  )
}
