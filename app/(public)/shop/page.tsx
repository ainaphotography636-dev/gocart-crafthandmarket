import CatalogHydrator from "@/components/marketplace/CatalogHydrator"
import ShopCatalog from "@/components/marketplace/ShopCatalog"
import {
  listStorefrontArtisans,
  listStorefrontProducts,
} from "@/lib/marketplace/catalog"

type SearchParams = Promise<Record<string, string | string[] | undefined>>

export default async function ShopPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const params = await searchParams
  const searchValue = params.search
  const search = Array.isArray(searchValue) ? searchValue[0] : searchValue

  const [productsResult, artisansResult] = await Promise.all([
    listStorefrontProducts({ search }),
    listStorefrontArtisans({ limit: 6 }),
  ])

  return (
    <>
      <CatalogHydrator products={productsResult.items} />
      <ShopCatalog
        products={productsResult.items}
        artisans={artisansResult.items}
        search={search}
        source={productsResult.source}
        error={productsResult.error || artisansResult.error}
      />
    </>
  )
}
