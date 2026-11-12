'use client'
import { assets } from "@/assets/assets"
import { useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import toast from "react-hot-toast"
import Loading from "@/components/shared/Loading"
import { getActiveStore, submitStoreApplication } from "@/lib/storeRegistry"
import { notifyStoreEvent } from "@/lib/notifyClient"
import { syncArtisanToR2 } from "@/lib/artisanDirectory"

export default function CreateStore() {
    const router = useRouter()
    const [alreadySubmitted, setAlreadySubmitted] = useState(false)
    const [status, setStatus] = useState("")
    const [loading, setLoading] = useState(true)
    const [message, setMessage] = useState("")
    const [previewUrl, setPreviewUrl] = useState("")

    const [storeInfo, setStoreInfo] = useState({
        name: "",
        username: "",
        description: "",
        email: "",
        contact: "",
        address: "",
        image: "",
    })

    const onChangeHandler = (e) => {
        setStoreInfo({ ...storeInfo, [e.target.name]: e.target.value })
    }

    const fetchSellerStatus = async () => {
        const existing = getActiveStore()
        if (existing) {
            setAlreadySubmitted(true)
            setStatus(existing.status)
            if (existing.status === "pending") {
                setMessage("Your workshop application is pending admin review. You will get dashboard access after approval.")
            } else if (existing.status === "approved") {
                setMessage(`Welcome, ${existing.name}! Your store @${existing.username} is approved.`)
                setTimeout(() => router.push("/store"), 2500)
            } else if (existing.status === "rejected") {
                setMessage("Your previous application was rejected. You can update details and submit again after clearing browser storage, or contact support.")
            }
        }
        setLoading(false)
    }

    const onSubmitHandler = async (e) => {
        e.preventDefault()
        const store = await submitStoreApplication(storeInfo)
        const notify = await notifyStoreEvent("store_submitted", store)
        try {
            await syncArtisanToR2(store)
        } catch {
            // R2 sync is best-effort until bucket credentials/CORS are ready.
        }
        setAlreadySubmitted(true)
        setStatus(store.status)
        setMessage(
            `Thanks, ${store.name}! Your Crafthand Market application for @${store.username} is submitted and pending admin approval.`
        )
        if (notify.skipped) {
            toast.success("Application saved. Email not configured yet on the server.")
        } else if (!notify.ok) {
            toast.success("Application saved, but confirmation email failed to send.")
        } else {
            toast.success("Application submitted — confirmation email sent")
        }
        return store
    }

    useEffect(() => {
        fetchSellerStatus()
    }, [])

    useEffect(() => {
        if (!storeInfo.image || typeof storeInfo.image === "string") {
            setPreviewUrl("")
            return
        }
        const url = URL.createObjectURL(storeInfo.image)
        setPreviewUrl(url)
        return () => URL.revokeObjectURL(url)
    }, [storeInfo.image])

    return !loading ? (
        <>
            {!alreadySubmitted ? (
                <div className="mx-6 min-h-[70vh] my-16">
                    <form
                        onSubmit={(e) =>
                            toast.promise(onSubmitHandler(e), {
                                loading: "Submitting your workshop...",
                                success: "Submitted",
                                error: (err) => err?.message || "Could not submit application",
                            })
                        }
                        className="max-w-7xl mx-auto flex flex-col items-start gap-3 text-slate-500"
                    >
                        <div>
                            <h1 className="text-3xl">
                                Register Your <span className="text-slate-800 font-medium">Workshop</span>
                            </h1>
                            <p className="max-w-lg mt-2">
                                Artisans can join Crafthand Market by submitting workshop details here.
                                After you submit, an admin reviews the application at <span className="font-medium text-slate-700">/admin/approve</span>.
                                Once approved, open your seller dashboard at <Link href="/store" className="text-brand-emerald underline">/store</Link>.
                            </p>
                        </div>

                        <label className="mt-10 cursor-pointer">
                            Store / Workshop Logo
                            <Image
                                src={previewUrl || assets.upload_area}
                                className="rounded-lg mt-2 h-16 w-auto"
                                alt=""
                                width={150}
                                height={100}
                                unoptimized={Boolean(previewUrl)}
                            />
                            <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => setStoreInfo({ ...storeInfo, image: e.target.files?.[0] || "" })}
                                hidden
                            />
                        </label>

                        <p>Username</p>
                        <input
                            name="username"
                            onChange={onChangeHandler}
                            value={storeInfo.username}
                            type="text"
                            placeholder="e.g. kerala-pottery"
                            className="border border-slate-300 outline-slate-400 w-full max-w-lg p-2 rounded"
                            required
                        />

                        <p>Workshop / Store Name</p>
                        <input
                            name="name"
                            onChange={onChangeHandler}
                            value={storeInfo.name}
                            type="text"
                            placeholder="Enter your workshop or brand name"
                            className="border border-slate-300 outline-slate-400 w-full max-w-lg p-2 rounded"
                            required
                        />

                        <p>Description</p>
                        <textarea
                            name="description"
                            onChange={onChangeHandler}
                            value={storeInfo.description}
                            rows={5}
                            placeholder="Tell buyers about your craft, materials, and region"
                            className="border border-slate-300 outline-slate-400 w-full max-w-lg p-2 rounded resize-none"
                            required
                        />

                        <p>Email</p>
                        <input
                            name="email"
                            onChange={onChangeHandler}
                            value={storeInfo.email}
                            type="email"
                            placeholder="Enter your store email"
                            className="border border-slate-300 outline-slate-400 w-full max-w-lg p-2 rounded"
                            required
                        />

                        <p>Contact Number</p>
                        <input
                            name="contact"
                            onChange={onChangeHandler}
                            value={storeInfo.contact}
                            type="text"
                            placeholder="Enter your WhatsApp / phone number"
                            className="border border-slate-300 outline-slate-400 w-full max-w-lg p-2 rounded"
                            required
                        />

                        <p>Workshop Address</p>
                        <textarea
                            name="address"
                            onChange={onChangeHandler}
                            value={storeInfo.address}
                            rows={5}
                            placeholder="Village / city, district, Kerala"
                            className="border border-slate-300 outline-slate-400 w-full max-w-lg p-2 rounded resize-none"
                            required
                        />

                        <button className="bg-brand-emerald text-white px-12 py-2 rounded mt-10 mb-40 active:scale-95 hover:bg-brand-amber transition">
                            Submit for Review
                        </button>
                    </form>
                </div>
            ) : (
                <div className="min-h-[80vh] flex flex-col items-center justify-center px-6 text-center">
                    <p className="sm:text-2xl lg:text-3xl font-semibold text-slate-500 max-w-2xl">{message}</p>
                    {status === "pending" && (
                        <div className="mt-8 flex flex-wrap gap-3 justify-center">
                            <Link href="/admin/approve" className="px-5 py-2 rounded-full bg-brand-amber text-white text-sm">
                                Open Admin Approvals
                            </Link>
                            <Link href="/store" className="px-5 py-2 rounded-full border border-brand-emerald text-brand-emerald text-sm">
                                Try Seller Dashboard
                            </Link>
                        </div>
                    )}
                    {status === "approved" && (
                        <p className="mt-5 text-slate-400">
                            Redirecting to dashboard in <span className="font-semibold">a few seconds</span>
                        </p>
                    )}
                </div>
            )}
        </>
    ) : (
        <Loading />
    )
}
