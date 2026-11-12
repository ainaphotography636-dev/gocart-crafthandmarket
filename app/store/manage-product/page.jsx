'use client'
import { useEffect, useState } from "react"
import { toast } from "react-hot-toast"
import Image from "next/image"
import Link from "next/link"
import Loading from "@/components/shared/Loading"
import { useCurrency } from "@/components/shared/CurrencyProvider"
import { listStoreProducts, toggleProductStock } from "@/lib/productCatalog"
import { productDummyData } from "@/assets/assets"
import { ClapperboardIcon } from "lucide-react"
import { formatProductTitle } from "@/lib/productCodes"

export default function StoreManageProducts() {
  const { currency: currencyInfo } = useCurrency()
  const currency = currencyInfo.symbol

  const [loading, setLoading] = useState(true)
  const [products, setProducts] = useState([])
  const [usingSample, setUsingSample] = useState(false)

  const fetchProducts = async () => {
    const storeProducts = listStoreProducts()
    if (storeProducts.length) {
      setProducts(storeProducts)
      setUsingSample(false)
    } else {
      setProducts(productDummyData)
      setUsingSample(true)
    }
    setLoading(false)
  }

  const toggleStock = async (productId) => {
    const updated = toggleProductStock(productId)
    if (!updated) {
      throw new Error("Stock toggle is available for products you added from this workshop.")
    }
    setProducts(listStoreProducts())
    return updated
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

      {usingSample && (
        <p className="text-sm text-slate-500 mb-4">
          Showing sample catalog until you add your first product.
        </p>
      )}

      <table className="w-full max-w-5xl text-left ring ring-slate-200 rounded overflow-hidden text-sm bg-white/70">
        <thead className="bg-slate-50 text-gray-700 uppercase tracking-wider">
          <tr>
            <th className="px-4 py-3">Name</th>
            <th className="px-4 py-3 hidden md:table-cell">Description</th>
            <th className="px-4 py-3 hidden md:table-cell">MRP</th>
            <th className="px-4 py-3">Price</th>
            <th className="px-4 py-3">Media</th>
            <th className="px-4 py-3">Stock</th>
          </tr>
        </thead>
        <tbody className="text-slate-700">
          {products.map((product) => (
            <tr key={product.id} className="border-t border-gray-200 hover:bg-gray-50">
              <td className="px-4 py-3">
                <div className="flex gap-2 items-center">
                  <Image
                    width={40}
                    height={40}
                    className="p-1 shadow rounded cursor-pointer object-cover"
                    src={product.images?.[0] || "/upload_area.png"}
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
                  <span>{product.images?.length || 0} img</span>
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
            </tr>
          ))}
        </tbody>
      </table>
    </>
  )
}
