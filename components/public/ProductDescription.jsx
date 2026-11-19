'use client'
import { ArrowRight, StarIcon } from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import SafeImage from "@/components/shared/SafeImage"
import { getProductVideoUrl } from "@/lib/marketplace/media"

const ProductDescription = ({ product }) => {
    const [selectedTab, setSelectedTab] = useState('Details')
    const ratings = Array.isArray(product?.rating) ? product.rating : []
    const storeUsername = product?.storeUsername || product?.artisanUsername || product?.store?.username
    const storeName = product?.artisanName || product?.store?.name || "Artisan workshop"
    const storeLogo = product?.store?.logo || null
    const video = getProductVideoUrl(product) || product?.video || null

    const specs = [
        { label: 'Origin', value: product?.regionOrigin || product?.region_origin },
        { label: 'Dimensions', value: product?.dimensions },
        { label: 'Weight', value: product?.weight },
        { label: 'Material', value: product?.material },
        { label: 'Craft tag', value: product?.giTag },
        { label: 'Technique', value: product?.craftTechnique },
        {
            label: 'Verification',
            value: video ? 'Video Confirmed' : 'Workshop Coded',
        },
    ].filter((row) => row.value)

    return (
        <div className="my-18 text-sm text-slate-600">
            <div className="mb-6 flex max-w-2xl border-b border-slate-200">
                {['Details', 'Reviews'].map((tab) => (
                    <button
                        className={`${tab === selectedTab ? 'border-b-[1.5px] border-brand-forest font-semibold text-brand-forest' : 'text-slate-400'} px-3 py-2 font-medium`}
                        key={tab}
                        type="button"
                        onClick={() => setSelectedTab(tab)}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {selectedTab === "Details" && (
                <div className="max-w-xl space-y-5">
                    {specs.length ? (
                        <dl className="grid grid-cols-1 gap-0 border border-brand-forest/10 sm:grid-cols-2">
                            {specs.map((row) => (
                                <div
                                    key={row.label}
                                    className="border-b border-brand-forest/10 px-3.5 py-3 sm:odd:border-r"
                                >
                                    <dt className="text-[10px] uppercase tracking-[0.14em] text-slate-400">
                                        {row.label}
                                    </dt>
                                    <dd className="mt-1 font-medium text-brand-slate">{row.value}</dd>
                                </div>
                            ))}
                        </dl>
                    ) : (
                        <p className="text-slate-400">Workshop specs will appear here once published.</p>
                    )}

                    {video ? (
                        <video
                            src={video}
                            controls
                            className="mt-2 aspect-video w-full max-w-xl bg-brand-ink/90"
                        />
                    ) : null}
                </div>
            )}

            {selectedTab === "Reviews" && (
                <div className="mt-6 flex flex-col gap-3">
                    {ratings.length ? ratings.map((item, index) => (
                        <div key={index} className="mb-10 flex gap-5">
                            <SafeImage src={item?.user?.image} alt="" className="size-10 rounded-full" width={100} height={100} />
                            <div>
                                <div className="flex items-center">
                                    {Array(5).fill('').map((_, starIndex) => (
                                        <StarIcon key={starIndex} size={18} className='mt-0.5 text-transparent' fill={item.rating >= starIndex + 1 ? "#c85a32" : "#D1D5DB"} />
                                    ))}
                                </div>
                                <p className="my-4 max-w-lg text-sm">{item.review}</p>
                                <p className="font-medium text-slate-800">{item?.user?.name || "Customer"}</p>
                                {item.createdAt ? (
                                    <p className="mt-3 font-light">{new Date(item.createdAt).toDateString()}</p>
                                ) : null}
                            </div>
                        </div>
                    )) : (
                        <p className="text-slate-400">No reviews yet for this piece.</p>
                    )}
                </div>
            )}

            <div className="mt-14 flex gap-3">
                <div className="relative size-11 overflow-hidden rounded-full ring ring-slate-400">
                    <SafeImage src={storeLogo} alt="" fill className="object-cover" />
                </div>
                <div>
                    <p className="font-medium text-slate-600">Product by {storeName}</p>
                    {storeUsername ? (
                        <Link href={`/shop/${storeUsername}`} className="flex items-center gap-1.5 text-brand-terracotta">
                            view store <ArrowRight size={14} />
                        </Link>
                    ) : (
                        <Link href="/artisans" className="flex items-center gap-1.5 text-brand-terracotta">
                            browse artisans <ArrowRight size={14} />
                        </Link>
                    )}
                </div>
            </div>
        </div>
    )
}

export default ProductDescription
