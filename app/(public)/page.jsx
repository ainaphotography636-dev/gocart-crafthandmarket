import BestSelling from "@/components/public/BestSelling"
import Hero from "@/components/public/Hero"
import CategoriesMarquee from "@/components/public/CategoriesMarquee"
import Newsletter from "@/components/public/Newsletter"
import OurSpecs from "@/components/public/OurSpec"
import RecentlyAddedGallery from "@/components/public/RecentlyAddedGallery"
import CatalogHydrator from "@/components/marketplace/CatalogHydrator"
import { listStorefrontProducts } from "@/lib/marketplace/catalog"

export default async function Home() {
  const recent = await listStorefrontProducts({
    limit: 8,
    requireInStock: false,
  })

  return (
    <div>
      <CatalogHydrator products={recent.items} />
      <Hero />
      <RecentlyAddedGallery products={recent.items} />
      <CategoriesMarquee />
      <BestSelling />
      <OurSpecs />
      <Newsletter />
    </div>
  )
}
