import Link from "next/link"
import { notFound } from "next/navigation"
import CatalogHydrator from "@/components/marketplace/CatalogHydrator"
import ProductDescription from "@/components/public/ProductDescription"
import ProductDetails from "@/components/public/ProductDetails"
import { getStorefrontProductById } from "@/lib/marketplace/catalog"

type Params = Promise<{ productId: string }>

export default async function ProductPage({
  params,
}: {
  params: Params
}) {
  const { productId } = await params
  const { product, source, error } = await getStorefrontProductById(productId)

  if (!product) {
    if (source === "unavailable") {
      return (
        <div className="mx-6 my-20 text-center">
          <h1 className="text-2xl text-slate-800">Product catalog unavailable</h1>
          <p className="mt-2 text-sm text-slate-500">
            Configure Supabase to load marketplace products.
          </p>
        </div>
      )
    }
    if (error) {
      return (
        <div className="mx-6 my-20 text-center">
          <h1 className="text-2xl text-slate-800">Could not load this product</h1>
          <p className="mt-2 text-sm text-slate-500">{error}</p>
        </div>
      )
    }
    notFound()
  }

  return (
    <div className="mx-6">
      <CatalogHydrator products={[product]} />
      <div className="mx-auto max-w-7xl">
        <div className="mb-5 mt-8 text-sm text-gray-600">
          <Link href="/" className="hover:text-brand-emerald">
            Home
          </Link>
          {" / "}
          <Link href="/shop" className="hover:text-brand-emerald">
            Products
          </Link>
          {product.artisanUsername ? (
            <>
              {" / "}
              <Link
                href={`/shop/${product.artisanUsername}`}
                className="hover:text-brand-emerald"
              >
                {product.artisanName || product.artisanUsername}
              </Link>
            </>
          ) : null}
          {" / "}
          <span>{product.category}</span>
        </div>

        <ProductDetails product={product} />
        <ProductDescription product={product} />
      </div>
    </div>
  )
}
