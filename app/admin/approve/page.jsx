'use client'
import StoreInfo from "@/components/admin/StoreInfo"
import Loading from "@/components/shared/Loading"
import { useEffect, useState } from "react"
import toast from "react-hot-toast"
import { listPendingStores, updateStoreStatus } from "@/lib/storeRegistry"
import { notifyStoreEvent } from "@/lib/notifyClient"

export default function AdminApprove() {
    const [stores, setStores] = useState([])
    const [loading, setLoading] = useState(true)

    const fetchStores = async () => {
        setStores(listPendingStores())
        setLoading(false)
    }

    const handleApprove = async ({ storeId, status }) => {
        const updated = updateStoreStatus(storeId, status)
        if (!updated) throw new Error("Store application not found")
        setStores(listPendingStores())

        const event = status === "approved" ? "store_approved" : "store_rejected"
        const notify = await notifyStoreEvent(event, updated)
        if (notify.skipped) {
            toast.success(status === "approved" ? "Store approved (email not configured)" : "Store rejected (email not configured)")
        } else if (!notify.ok) {
            toast.success(status === "approved" ? "Store approved, but email failed" : "Store rejected, but email failed")
        } else {
            toast.success(status === "approved" ? "Store approved — artisan emailed" : "Store rejected — artisan emailed")
        }
        return updated
    }

    useEffect(() => {
        fetchStores()
    }, [])

    return !loading ? (
        <div className="text-slate-500 mb-28">
            <h1 className="text-2xl">
                Approve <span className="text-slate-800 font-medium">Stores</span>
            </h1>
            <p className="text-sm mt-2 max-w-2xl">
                Artisan applications submitted from <span className="font-medium">/create-store</span> appear here for review.
            </p>

            {stores.length ? (
                <div className="flex flex-col gap-4 mt-4">
                    {stores.map((store) => (
                        <div
                            key={store.id}
                            className="bg-white border rounded-lg shadow-sm p-6 flex max-md:flex-col gap-4 md:items-end max-w-4xl"
                        >
                            <StoreInfo store={store} />
                            <div className="flex gap-3 pt-2 flex-wrap">
                                <button
                                    onClick={() =>
                                        toast.promise(handleApprove({ storeId: store.id, status: "approved" }), {
                                            loading: "Approving...",
                                        })
                                    }
                                    className="px-4 py-2 bg-brand-emerald text-white rounded hover:bg-brand-amber text-sm"
                                >
                                    Approve
                                </button>
                                <button
                                    onClick={() =>
                                        toast.promise(handleApprove({ storeId: store.id, status: "rejected" }), {
                                            loading: "Rejecting...",
                                        })
                                    }
                                    className="px-4 py-2 bg-slate-500 text-white rounded hover:bg-slate-600 text-sm"
                                >
                                    Reject
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="flex items-center justify-center h-80">
                    <h1 className="text-3xl text-slate-400 font-medium">No Application Pending</h1>
                </div>
            )}
        </div>
    ) : (
        <Loading />
    )
}
