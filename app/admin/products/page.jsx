'use client'

import { useMemo, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { productDummyData } from "@/assets/assets"
import { listProducts } from "@/lib/productCatalog"
import { useCurrency } from "@/components/shared/CurrencyProvider"
import { ensureProductSku, formatProductTitle } from "@/lib/productCodes"
import { CRAFT_MATERIALS, GI_TAG_OPTIONS } from "@/lib/handicraftCategories"

const GI_TAGS = ["All GI-Tags", ...GI_TAG_OPTIONS]
const MATERIALS = ["All materials", ...CRAFT_MATERIALS]

function withDemoTags(products) {
  const giCycle = GI_TAGS.slice(1)
  const materialCycle = MATERIALS.slice(1)
  return products.map((product, index) => ({
    ...product,
    sku: ensureProductSku(product),
    giTag: product.giTag || giCycle[index % giCycle.length],
    material: product.material || materialCycle[index % materialCycle.length],
    qcStatus: product.qcStatus || (product.inStock ? "APPROVED" : "PENDING"),
  }))
}

export default function AdminProductsPage() {
  const { currency } = useCurrency()
  const [giTag, setGiTag] = useState("All GI-Tags")
  const [material, setMaterial] = useState("All materials")
  const [query, setQuery] = useState("")

  const catalog = useMemo(() => {
    const live = listProducts()
    const source = live.length ? live : productDummyData
    return withDemoTags(source)
  }, [])

  const filtered = catalog.filter((product) => {
    const giOk = giTag === "All GI-Tags" || product.giTag === giTag
    const materialOk = material === "All materials" || product.material === material
    const title = formatProductTitle(product).toLowerCase()
    const queryOk = !query || title.includes(query.toLowerCase())
    return giOk && materialOk && queryOk
  })

  return (
    <div className="text-slate-500 mb-28 max-w-6xl">
      <p className="text-xs uppercase tracking-[0.18em] text-brand-gold">Inventory</p>
      <h1 className="text-2xl mt-1">
        Product Catalog <span className="text-slate-800 font-medium">& Inventory</span>
      </h1>
      <p className="text-sm mt-2 max-w-2xl">
        Every piece shows as <code className="text-slate-700">[ART001-001] Product name</code>. SKUs
        are generated from the artisan code when a workshop adds a product.
      </p>

      <div className="flex flex-wrap gap-3 mt-6">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search SKU or name"
          className="border border-slate-200 rounded-md px-3 py-2 bg-white text-sm min-w-[220px]"
        />
        <select
          value={giTag}
          onChange={(e) => setGiTag(e.target.value)}
          className="border border-slate-200 rounded-md px-3 py-2 bg-white text-sm"
        >
          {GI_TAGS.map((tag) => (
            <option key={tag} value={tag}>
              {tag}
            </option>
          ))}
        </select>
        <select
          value={material}
          onChange={(e) => setMaterial(e.target.value)}
          className="border border-slate-200 rounded-md px-3 py-2 bg-white text-sm"
        >
          {MATERIALS.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
        <Link
          href="/admin/catalog"
          className="text-sm text-brand-emerald self-center hover:underline"
        >
          Legacy catalog filters
        </Link>
      </div>

      <div className="mt-6 overflow-x-auto ring ring-slate-200 rounded-xl bg-white/70">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-gray-700 uppercase tracking-wider">
            <tr>
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">SKU</th>
              <th className="px-4 py-3 hidden md:table-cell">GI-Tag</th>
              <th className="px-4 py-3 hidden md:table-cell">Material</th>
              <th className="px-4 py-3">Price</th>
              <th className="px-4 py-3">QC</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((product) => (
              <tr key={product.id} className="border-t border-slate-200">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Image
                      src={product.images?.[0] || "/upload_area.png"}
                      alt=""
                      width={40}
                      height={40}
                      className="rounded object-cover"
                    />
                    <div>
                      <p className="text-slate-800">{formatProductTitle(product)}</p>
                      <p className="text-xs text-slate-400">{product.category}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 font-mono text-xs text-brand-emerald">
                  {ensureProductSku(product)}
                </td>
                <td className="px-4 py-3 hidden md:table-cell">
                  <span className="text-xs bg-brand-amber-soft text-brand-amber px-2 py-1 rounded">
                    {product.giTag}
                  </span>
                </td>
                <td className="px-4 py-3 hidden md:table-cell capitalize">{product.material}</td>
                <td className="px-4 py-3">
                  {currency.symbol}
                  {Number(product.price).toLocaleString()}
                </td>
                <td className="px-4 py-3 text-xs uppercase tracking-wide">{product.qcStatus}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
