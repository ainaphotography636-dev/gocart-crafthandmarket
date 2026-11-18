import Hero from "@/components/public/Hero"
import Newsletter from "@/components/public/Newsletter"
import GuaranteeStrip from "@/components/public/GuaranteeStrip"
import HeritageStory from "@/components/public/HeritageStory"
import ArtisanDisciplines from "@/components/public/ArtisanDisciplines"
import LogisticsBand from "@/components/public/LogisticsBand"
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
      <GuaranteeStrip />
      <HeritageStory />
      <LogisticsBand />
      <ArtisanDisciplines />
      <Newsletter />
    </div>
  )
}
