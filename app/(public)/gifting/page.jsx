import CatalogHydrator from "@/components/marketplace/CatalogHydrator"
import CatalogMediaBridge from "@/components/marketplace/CatalogMediaBridge"
import GiftingCatalog from "@/components/public/GiftingCatalog"
import { listStorefrontProducts } from "@/lib/marketplace/catalog"

export const metadata = {
  title: "Gifting | CraftHand Market",
  description:
    "Handicraft gifts by occasion, relationship, hamper, Diwali décor, return gifts, and corporate sets — tagged by verified artisans.",
}

export default async function GiftingPage() {
  const catalog = await listStorefrontProducts({
    limit: 48,
    requireInStock: false,
  })

  return (
    <div className="bg-[#F9F6F1]">
      <CatalogHydrator products={catalog.items} />
      <CatalogMediaBridge products={catalog.items} />
      <GiftingCatalog products={catalog.items} />
    </div>
  )
}
