'use client'
import { useEffect, useState } from "react"
import Loading from "@/components/shared/Loading"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { ArrowRightIcon } from "lucide-react"
import toast from "react-hot-toast"
import AdminNavbar from "./AdminNavbar"
import AdminSidebar from "./AdminSidebar"
import { canAccessPath, ROLE_LABELS } from "@/lib/adminPermissions"
import { getClientAdminRole, setClientAdminRole } from "@/lib/adminSession"

const AdminLayout = ({ children }) => {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [role, setRole] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const activeRole = getClientAdminRole()
    setClientAdminRole(activeRole)
    setRole(activeRole)
    setLoading(false)
  }, [])

  useEffect(() => {
    const denied = searchParams.get("denied")
    if (denied) {
      toast.error("Your role cannot open that admin section.")
      router.replace("/admin")
    }
  }, [searchParams, router])

  const handleRoleChange = (nextRole) => {
    const saved = setClientAdminRole(nextRole)
    setRole(saved)
    toast.success(`Switched to ${ROLE_LABELS[saved]}`)
    if (!canAccessPath(saved, pathname)) {
      router.push("/admin")
    } else {
      router.refresh()
    }
  }

  if (loading || !role) return <Loading />

  if (!canAccessPath(role, pathname)) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center px-6">
        <h1 className="text-2xl sm:text-4xl font-semibold text-slate-400">
          You are not authorized to access this page
        </h1>
        <p className="mt-3 text-slate-500 max-w-md">
          Current role: {ROLE_LABELS[role]}. Ask a Super Admin to grant access, or switch roles in
          the demo selector.
        </p>
        <Link
          href="/admin"
          className="bg-slate-700 text-white flex items-center gap-2 mt-8 p-2 px-6 max-sm:text-sm rounded-full"
        >
          Back to overview <ArrowRightIcon size={18} />
        </Link>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen">
      <AdminNavbar role={role} onRoleChange={handleRoleChange} />
      <div className="flex flex-1 items-start h-full overflow-y-scroll no-scrollbar">
        <AdminSidebar role={role} />
        <div className="flex-1 h-full p-5 lg:pl-12 lg:pt-12 overflow-y-scroll">{children}</div>
      </div>
    </div>
  )
}

export default AdminLayout
