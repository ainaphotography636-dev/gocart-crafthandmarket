import Hero from "@/components/public/Hero"
import Newsletter from "@/components/public/Newsletter"
import GuaranteeStrip from "@/components/public/GuaranteeStrip"
import HeritageStory from "@/components/public/HeritageStory"
import CategoriesMarquee from "@/components/public/CategoriesMarquee"
import LogisticsBand from "@/components/public/LogisticsBand"
import HomeCatalogClient from "@/components/public/HomeCatalogClient"
import CatalogHydrator from "@/components/marketplace/CatalogHydrator"
import CatalogMediaBridge from "@/components/marketplace/CatalogMediaBridge"
import {
  listFeaturedLuxuryProducts,
  listStorefrontProducts,
} from "@/lib/marketplace/catalog"
import { ensureClaimableLuxuryCatalog } from "@/app/actions/seed-claimable-artisans"

export default async function Home() {
  // Ensure claimable workshops/products exist, then load featured + recent.
  await ensureClaimableLuxuryCatalog()

  const [featured, recent] = await Promise.all([
    listFeaturedLuxuryProducts({ limit: 8 }),
    listStorefrontProducts({
      limit: 8,
      requireInStock: false,
    }),
  ])

  const homepageProducts = featured.items.length ? featured.items : recent.items

  return (
    <div>
      <CatalogHydrator products={homepageProducts} replace />
      <CatalogMediaBridge products={homepageProducts} />
      <Hero />
      <HomeCatalogClient products={homepageProducts} />
      <CategoriesMarquee />
      <GuaranteeStrip />
      <HeritageStory />
      <LogisticsBand />
      <Newsletter />
    </div>
  )
}
