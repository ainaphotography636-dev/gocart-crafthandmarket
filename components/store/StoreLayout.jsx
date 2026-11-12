'use client'
import { useEffect, useState } from "react"
import Loading from "@/components/shared/Loading"
import Link from "next/link"
import { ArrowRightIcon } from "lucide-react"
import SellerNavbar from "./StoreNavbar"
import SellerSidebar from "./StoreSidebar"
import { getActiveStore } from "@/lib/storeRegistry"

const StoreLayout = ({ children }) => {
    const [isSeller, setIsSeller] = useState(false)
    const [loading, setLoading] = useState(true)
    const [storeInfo, setStoreInfo] = useState(null)
    const [status, setStatus] = useState("")

    const fetchIsSeller = async () => {
        const store = getActiveStore()
        if (store?.status === "approved" && store.isActive) {
            setIsSeller(true)
            setStoreInfo(store)
            setStatus(store.status)
        } else if (store) {
            setIsSeller(false)
            setStoreInfo(store)
            setStatus(store.status)
        } else {
            setIsSeller(false)
            setStoreInfo(null)
            setStatus("")
        }
        setLoading(false)
    }

    useEffect(() => {
        fetchIsSeller()
    }, [])

    return loading ? (
        <Loading />
    ) : isSeller ? (
        <div className="flex flex-col h-screen">
            <SellerNavbar />
            <div className="flex flex-1 items-start h-full overflow-y-scroll no-scrollbar">
                <SellerSidebar storeInfo={storeInfo} />
                <div className="flex-1 h-full p-5 lg:pl-12 lg:pt-12 overflow-y-scroll">
                    {children}
                </div>
            </div>
        </div>
    ) : (
        <div className="min-h-screen flex flex-col items-center justify-center text-center px-6">
            <h1 className="text-2xl sm:text-4xl font-semibold text-slate-400">
                {status === "pending"
                    ? "Your workshop is waiting for admin approval"
                    : status === "rejected"
                      ? "Your workshop application was rejected"
                      : "No artisan store is connected yet"}
            </h1>
            <p className="mt-4 max-w-xl text-slate-500">
                {status === "pending"
                    ? "Ask an admin to approve your application at /admin/approve, then return here."
                    : "Register your Kerala workshop from the create-store page to start selling on Crafthand Market."}
            </p>
            <div className="flex flex-wrap gap-3 mt-8 justify-center">
                <Link
                    href="/create-store"
                    className="bg-brand-emerald text-white flex items-center gap-2 p-2 px-6 max-sm:text-sm rounded-full"
                >
                    Register workshop <ArrowRightIcon size={18} />
                </Link>
                {status === "pending" && (
                    <Link
                        href="/admin/approve"
                        className="border border-brand-amber text-brand-amber flex items-center gap-2 p-2 px-6 max-sm:text-sm rounded-full"
                    >
                        Open approvals
                    </Link>
                )}
            </div>
        </div>
    )
}

export default StoreLayout
