'use client'

import { useCallback, useEffect, useMemo, useState } from "react"
import Image from "next/image"
import toast from "react-hot-toast"
import { HANDICRAFT_CATEGORIES } from "@/lib/handicraftCategories"
import { useCurrency } from "@/components/shared/CurrencyProvider"
import {
  deleteAdminProduct,
  listAdminArtisanOptions,
  listAdminProducts,
  saveAdminProduct,
} from "@/app/actions/admin-products"

const emptyDraft = () => ({
  id: "",
  sku: "",
  title: "",
  description: "",
  category: HANDICRAFT_CATEGORIES[0] || "Handicraft",
  subCategory: "",
  material: "",
  giTag: "",
  technique: "",
  origin: "",
  dimensions: "",
  weight: "",
  price: "",
  mrp: "",
  currency: "INR",
  imageUrl: "",
  badgeLeft: "",
  badgeRight: "",
  isFeatured: true,
  featuredOrder: 0,
  catalogStatus: "approved",
  inStock: true,
  artisanId: "",
  displayName: "",
})

export default function AdminProductsPage() {
  const { currency } = useCurrency()
  const [products, setProducts] = useState([])
  const [artisans, setArtisans] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [query, setQuery] = useState("")
  const [category, setCategory] = useState("all")
  const [featuredOnly, setFeaturedOnly] = useState(false)
  const [statusFilter, setStatusFilter] = useState("all")
  const [editing, setEditing] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    const [listed, options] = await Promise.all([
      listAdminProducts(),
      listAdminArtisanOptions(),
    ])
    if (!listed.ok) {
      toast.error(listed.error || "Could not load Supabase products.")
      setProducts([])
    } else {
      setProducts(listed.products || [])
    }
    setArtisans(options || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const filtered = useMemo(() => {
    return products.filter((product) => {
      const hay = `${product.sku} ${product.title} ${product.description}`.toLowerCase()
      const queryOk = !query || hay.includes(query.toLowerCase())
      const categoryOk =
        category === "all" ||
        String(product.category || "").toLowerCase() === category.toLowerCase()
      const featuredOk = !featuredOnly || product.isFeatured
      const statusOk =
        statusFilter === "all" || product.catalogStatus === statusFilter
      return queryOk && categoryOk && featuredOk && statusOk
    })
  }, [products, query, category, featuredOnly, statusFilter])

  const openCreate = () => {
    setEditing({
      ...emptyDraft(),
      artisanId: artisans[0]?.id || "",
      featuredOrder: products.filter((p) => p.isFeatured).length + 1,
    })
  }

  const openEdit = (product) => {
    setEditing({
      id: product.id,
      sku: product.sku,
      title: product.title,
      description: product.description,
      category: product.category || HANDICRAFT_CATEGORIES[0],
      subCategory: product.subCategory || product.technique || "",
      material: product.material || "",
      giTag: product.giTag || "",
      technique: product.technique || "",
      origin: product.origin || "",
      dimensions: product.dimensions || "",
      weight: product.weight || "",
      price: product.price,
      mrp: product.mrp,
      currency: product.currency || "INR",
      imageUrl: product.imageUrl || "",
      badgeLeft: product.badgeLeft || "",
      badgeRight: product.badgeRight || "",
      isFeatured: Boolean(product.isFeatured),
      featuredOrder: product.featuredOrder || 0,
      catalogStatus: product.catalogStatus || "approved",
      inStock: product.inStock !== false,
      artisanId: product.artisanId || "",
      displayName: product.displayName || "",
    })
  }

  const save = async () => {
    if (!editing) return
    setSaving(true)
    const result = await saveAdminProduct({
      ...editing,
      price: Number(editing.price),
      mrp: editing.mrp === "" || editing.mrp == null ? null : Number(editing.mrp),
      featuredOrder: Number(editing.featuredOrder) || 0,
      images: editing.imageUrl ? [editing.imageUrl] : [],
    })
    setSaving(false)
    if (!result.ok) {
      toast.error(result.error || "Save failed.")
      return
    }
    toast.success(editing.id ? "Product updated." : "Product created.")
    setEditing(null)
    await load()
  }

  const remove = async (product) => {
    if (!window.confirm(`Delete ${product.sku}? This cannot be undone.`)) return
    const result = await deleteAdminProduct(product.id)
    if (!result.ok) {
      toast.error(result.error || "Delete failed.")
      return
    }
    toast.success("Product deleted.")
    await load()
  }

  return (
    <div className="mb-28 max-w-6xl text-slate-500">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-brand-gold">Inventory</p>
          <h1 className="mt-1 text-2xl">
            Product Catalog <span className="font-medium text-slate-800">&amp; Inventory</span>
          </h1>
          <p className="mt-2 max-w-2xl text-sm">
            Supabase-backed catalog. Featured Luxury Handicrafts on the storefront reads the same
            rows — edit any field here and the homepage updates after save.
          </p>
          <p className="mt-2 text-xs">
            Source: supabase · {products.length} product(s) ·{" "}
            {products.filter((p) => p.isFeatured).length} featured
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="rounded-md bg-brand-emerald px-4 py-2 text-sm text-white transition hover:bg-brand-amber"
        >
          Add handicraft
        </button>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search SKU, title, description"
          className="min-w-[220px] rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
        >
          <option value="all">All categories</option>
          {HANDICRAFT_CATEGORIES.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
        >
          <option value="all">All statuses</option>
          <option value="approved">Approved</option>
          <option value="pending">Pending</option>
          <option value="draft">Draft</option>
        </select>
        <label className="inline-flex items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={featuredOnly}
            onChange={(e) => setFeaturedOnly(e.target.checked)}
          />
          Featured only
        </label>
        <button
          type="button"
          onClick={load}
          className="rounded-md border border-slate-200 px-3 py-2 text-sm hover:bg-white"
        >
          Refresh
        </button>
      </div>

      {loading ? (
        <p className="mt-10 text-sm text-slate-400">Loading Supabase products…</p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-xl bg-white/70 ring ring-slate-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 uppercase tracking-wider text-gray-700">
              <tr>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">SKU</th>
                <th className="px-4 py-3">Price</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Featured</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((product) => (
                <tr key={product.id} className="border-t border-slate-100">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="relative h-12 w-12 overflow-hidden rounded bg-slate-100">
                        {product.imageUrl ? (
                          <Image
                            src={product.imageUrl}
                            alt={product.title}
                            fill
                            className="object-cover"
                            unoptimized
                          />
                        ) : null}
                      </div>
                      <div>
                        <p className="font-medium text-slate-800 line-clamp-1">{product.title}</p>
                        <p className="text-xs text-slate-400">
                          {product.category}
                          {product.technique ? ` · ${product.technique}` : ""}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{product.sku}</td>
                  <td className="px-4 py-3">
                    {currency.symbol}
                    {Number(product.price || 0).toLocaleString("en-IN")}
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded bg-slate-100 px-2 py-1 text-[11px] uppercase">
                      {product.catalogStatus}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {product.isFeatured ? (
                      <span className="rounded bg-brand-terracotta/15 px-2 py-1 text-[11px] text-brand-terracotta">
                        #{product.featuredOrder || 0}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => openEdit(product)}
                        className="rounded border border-brand-emerald/30 px-2 py-1 text-xs text-brand-emerald"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(product)}
                        className="rounded border border-rose-200 px-2 py-1 text-xs text-rose-600"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!filtered.length ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-slate-400">
                    No products match these filters.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      )}

      {editing ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/35 p-4 sm:items-center">
          <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-xl bg-white p-5 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-brand-terracotta">
                  {editing.id ? "Edit product" : "New product"}
                </p>
                <h2 className="mt-1 text-xl font-semibold text-slate-800">
                  Featured Luxury fields
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="rounded-md px-2 py-1 text-slate-500 hover:bg-slate-100"
              >
                Close
              </button>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {[
                ["sku", "SKU"],
                ["title", "Title"],
                ["displayName", "Card display name"],
                ["badgeLeft", "Left badge"],
                ["badgeRight", "Right badge"],
                ["technique", "Technique / sub-category"],
                ["origin", "Origin"],
                ["dimensions", "Dimensions"],
                ["weight", "Weight"],
                ["material", "Material"],
                ["giTag", "GI tag"],
                ["imageUrl", "Image URL"],
                ["price", "Collector price"],
                ["mrp", "MRP"],
                ["featuredOrder", "Featured order"],
              ].map(([key, label]) => (
                <label key={key} className="block text-xs font-medium text-slate-600">
                  {label}
                  <input
                    value={editing[key] ?? ""}
                    onChange={(e) =>
                      setEditing((prev) => ({ ...prev, [key]: e.target.value }))
                    }
                    className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-800"
                  />
                </label>
              ))}

              <label className="block text-xs font-medium text-slate-600">
                Category
                <select
                  value={editing.category}
                  onChange={(e) =>
                    setEditing((prev) => ({ ...prev, category: e.target.value }))
                  }
                  className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                >
                  {HANDICRAFT_CATEGORIES.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-xs font-medium text-slate-600">
                Catalog status
                <select
                  value={editing.catalogStatus}
                  onChange={(e) =>
                    setEditing((prev) => ({ ...prev, catalogStatus: e.target.value }))
                  }
                  className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                >
                  <option value="approved">approved</option>
                  <option value="pending">pending</option>
                  <option value="draft">draft</option>
                </select>
              </label>

              <label className="block text-xs font-medium text-slate-600">
                Artisan owner
                <select
                  value={editing.artisanId}
                  onChange={(e) =>
                    setEditing((prev) => ({ ...prev, artisanId: e.target.value }))
                  }
                  className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                >
                  <option value="">Select artisan</option>
                  {artisans.map((artisan) => (
                    <option key={artisan.id} value={artisan.id}>
                      {artisan.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="sm:col-span-2 block text-xs font-medium text-slate-600">
                Description
                <textarea
                  value={editing.description}
                  onChange={(e) =>
                    setEditing((prev) => ({ ...prev, description: e.target.value }))
                  }
                  rows={4}
                  className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-800"
                />
              </label>

              <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={Boolean(editing.isFeatured)}
                  onChange={(e) =>
                    setEditing((prev) => ({ ...prev, isFeatured: e.target.checked }))
                  }
                />
                Show on Featured Luxury Handicrafts
              </label>
              <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={editing.inStock !== false}
                  onChange={(e) =>
                    setEditing((prev) => ({ ...prev, inStock: e.target.checked }))
                  }
                />
                In stock
              </label>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="rounded-md border border-slate-200 px-4 py-2 text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={save}
                className="rounded-md bg-brand-emerald px-4 py-2 text-sm text-white disabled:opacity-60"
              >
                {saving ? "Saving…" : "Save to Supabase"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
