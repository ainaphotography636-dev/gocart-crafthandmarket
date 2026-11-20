import Hero from "@/components/public/Hero"
import Newsletter from "@/components/public/Newsletter"
import CoreValues from "@/components/public/CoreValues"
import Guarantees from "@/components/public/Guarantees"
import HeritageStory from "@/components/public/HeritageStory"
import HeritageCraftPillars from "@/components/public/HeritageCraftPillars"
import CategoriesMarquee from "@/components/public/CategoriesMarquee"
import HomeCatalogClient from "@/components/public/HomeCatalogClient"
import HashScroll from "@/components/public/HashScroll"
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
      <HashScroll />
      <CatalogHydrator products={homepageProducts} replace />
      <CatalogMediaBridge products={homepageProducts} />
      <Hero />
      {/* MASTERPIECES → /#masterpieces */}
      <HomeCatalogClient products={homepageProducts} />
      {/* CATEGORIES → /#categories */}
      <CategoriesMarquee />
      {/* TRADITIONS → /#traditions */}
      <HeritageCraftPillars />
      {/* CORE VALUES → /#core-values */}
      <CoreValues />
      {/* MISSION → /#mission */}
      <HeritageStory />
      {/* GUARANTEES → /#guarantees */}
      <Guarantees />
      <Newsletter />
    </div>
  )
}
