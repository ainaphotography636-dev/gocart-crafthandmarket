import { Suspense } from "react"
import AdminLayout from "@/components/admin/AdminLayout"
import Loading from "@/components/shared/Loading"

export const metadata = {
  title: "Crafthand Market — Admin",
  description: "Crafthand Market — Platform Admin Panel",
}

export default function RootAdminLayout({ children }) {
  return (
    <Suspense fallback={<Loading />}>
      <AdminLayout>{children}</AdminLayout>
    </Suspense>
  )
}
