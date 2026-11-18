import Hero from "@/components/public/Hero"
import Newsletter from "@/components/public/Newsletter"
import GuaranteeStrip from "@/components/public/GuaranteeStrip"
import HeritageStory from "@/components/public/HeritageStory"
import CategoriesMarquee from "@/components/public/CategoriesMarquee"
import LogisticsBand from "@/components/public/LogisticsBand"
import HomeCatalogClient from "@/components/public/HomeCatalogClient"
import CatalogHydrator from "@/components/marketplace/CatalogHydrator"
import CatalogMediaBridge from "@/components/marketplace/CatalogMediaBridge"
import { listStorefrontProducts } from "@/lib/marketplace/catalog"
import { ensureClaimableLuxuryCatalog } from "@/app/actions/seed-claimable-artisans"

export default async function Home() {
  // Ensure three claimable luxury workshops/products exist for Featured layer.
  await ensureClaimableLuxuryCatalog()

  const recent = await listStorefrontProducts({
    limit: 8,
    requireInStock: false,
  })

  return (
    <div>
      <CatalogHydrator products={recent.items} replace />
      <CatalogMediaBridge products={recent.items} />
      <Hero />
      <HomeCatalogClient products={recent.items} />
      <CategoriesMarquee />
      <GuaranteeStrip />
      <HeritageStory />
      <LogisticsBand />
      <Newsletter />
    </div>
  )
}
