import Hero from "@/components/public/Hero"
import CategoriesMarquee from "@/components/public/CategoriesMarquee"
import Newsletter from "@/components/public/Newsletter"
import OurSpecs from "@/components/public/OurSpec"
import HomeCatalogClient from "@/components/public/HomeCatalogClient"
import CatalogHydrator from "@/components/marketplace/CatalogHydrator"
import CatalogMediaBridge from "@/components/marketplace/CatalogMediaBridge"
import {
  listStorefrontArtisans,
  listStorefrontProducts,
} from "@/lib/marketplace/catalog"

export default async function Home() {
  const [recent, artisans] = await Promise.all([
    listStorefrontProducts({
      limit: 8,
      requireInStock: false,
    }),
    listStorefrontArtisans({ limit: 6 }),
  ])

  return (
    <div>
      <CatalogHydrator products={recent.items} replace />
      <CatalogMediaBridge products={recent.items} />
      <Hero />
      <HomeCatalogClient products={recent.items} artisans={artisans.items} />
      <CategoriesMarquee />
      <OurSpecs />
      <Newsletter />
    </div>
  )
}
