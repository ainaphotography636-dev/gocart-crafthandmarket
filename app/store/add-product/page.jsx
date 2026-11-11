'use client'
import { assets } from "@/assets/assets"
import Image from "next/image"
import { useState } from "react"
import { toast } from "react-hot-toast"
import { useDispatch } from "react-redux"
import { createStoreProduct, listStoreProducts } from "@/lib/productCatalog"
import { setProduct } from "@/lib/features/product/productSlice"
import { productDummyData } from "@/assets/assets"

export default function StoreAddProduct() {
    const dispatch = useDispatch()
    const categories = [
        "Electronics",
        "Clothing",
        "Home & Kitchen",
        "Beauty & Health",
        "Toys & Games",
        "Sports & Outdoors",
        "Books & Media",
        "Food & Drink",
        "Hobbies & Crafts",
        "Others",
    ]

    const [images, setImages] = useState({ 1: null, 2: null, 3: null, 4: null })
    const [productInfo, setProductInfo] = useState({
        name: "",
        description: "",
        mrp: "",
        price: "",
        category: "",
    })
    const [loading, setLoading] = useState(false)

    const onChangeHandler = (e) => {
        setProductInfo({ ...productInfo, [e.target.name]: e.target.value })
    }

    const resetForm = () => {
        setImages({ 1: null, 2: null, 3: null, 4: null })
        setProductInfo({
            name: "",
            description: "",
            mrp: "",
            price: "",
            category: "",
        })
    }

    const onSubmitHandler = async (e) => {
        e.preventDefault()
        setLoading(true)
        try {
            const { product, uploaded } = await createStoreProduct({
                ...productInfo,
                images,
            })

            const storeProducts = listStoreProducts()
            dispatch(setProduct([...storeProducts, ...productDummyData]))
            resetForm()
            return uploaded.storage === "r2"
                ? `${product.name} added — images saved to Cloudflare R2`
                : `${product.name} saved locally. Connect Cloudflare R2 to store media in your bucket.`
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
            className="text-slate-500 mb-28"
        >
            <h1 className="text-2xl">
                Add New <span className="text-slate-800 font-medium">Products</span>
            </h1>
            <p className="mt-7">Product Images</p>
            <p className="text-xs mt-1 max-w-lg">
                Images upload to your Cloudflare R2 bucket, then the product is listed in Manage
                Products.
            </p>

            <div className="flex gap-3 mt-4 flex-wrap">
                {Object.keys(images).map((key) => (
                    <label key={key} htmlFor={`images${key}`}>
                        <Image
                            width={300}
                            height={300}
                            className="h-15 w-auto border border-slate-200 rounded cursor-pointer"
                            src={images[key] ? URL.createObjectURL(images[key]) : assets.upload_area}
                            alt=""
                        />
                        <input
                            type="file"
                            accept="image/*"
                            id={`images${key}`}
                            onChange={(e) =>
                                setImages({ ...images, [key]: e.target.files?.[0] || null })
                            }
                            hidden
                        />
                    </label>
                ))}
            </div>

            <label className="flex flex-col gap-2 my-6 ">
                Name
                <input
                    type="text"
                    name="name"
                    onChange={onChangeHandler}
                    value={productInfo.name}
                    placeholder="Enter product name"
                    className="w-full max-w-sm p-2 px-4 outline-none border border-slate-200 rounded"
                    required
                />
            </label>

            <label className="flex flex-col gap-2 my-6 ">
                Description
                <textarea
                    name="description"
                    onChange={onChangeHandler}
                    value={productInfo.description}
                    placeholder="Enter product description"
                    rows={5}
                    className="w-full max-w-sm p-2 px-4 outline-none border border-slate-200 rounded resize-none"
                    required
                />
            </label>

            <div className="flex gap-5">
                <label className="flex flex-col gap-2 ">
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
                <label className="flex flex-col gap-2 ">
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
                <option value="">Select a category</option>
                {categories.map((category) => (
                    <option key={category} value={category}>
                        {category}
                    </option>
                ))}
            </select>

            <br />

            <button
                disabled={loading}
                className="bg-slate-800 text-white px-6 mt-7 py-2 hover:bg-slate-900 rounded transition disabled:opacity-60"
            >
                Add Product
            </button>
        </form>
    )
}
