import StoreLayout from "@/components/store/StoreLayout"

export const metadata = {
  title: "Crafthand Market — Artisan workshop",
  description: "Create and manage artisan products on Crafthand Market.",
}

export default function ArtisanLayout({ children }) {
  return <StoreLayout>{children}</StoreLayout>
}
