import { redirect } from "next/navigation"

/** Legacy route — catalog now lives at /admin/products with SKU titles. */
export default function AdminCatalogRedirect() {
  redirect("/admin/products")
}
