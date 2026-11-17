'use client'
import { ArrowRight, StarIcon } from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import SafeImage from "@/components/shared/SafeImage"

const ProductDescription = ({ product }) => {
    const [selectedTab, setSelectedTab] = useState('Description')
    const ratings = Array.isArray(product?.rating) ? product.rating : []
    const storeUsername = product?.storeUsername || product?.artisanUsername || product?.store?.username
    const storeName = product?.artisanName || product?.store?.name || "Artisan workshop"
    const storeLogo = product?.store?.logo || null

    return (
        <div className="my-18 text-sm text-slate-600">
            <div className="flex border-b border-slate-200 mb-6 max-w-2xl">
                {['Description', 'Reviews'].map((tab, index) => (
                    <button className={`${tab === selectedTab ? 'border-b-[1.5px] font-semibold' : 'text-slate-400'} px-3 py-2 font-medium`} key={index} onClick={() => setSelectedTab(tab)}>
                        {tab}
                    </button>
                ))}
            </div>

            {selectedTab === "Description" && (
                <div className="max-w-xl space-y-3">
                    <p>{product.description || "No description provided yet."}</p>
                    {product.material ? (
                        <p className="text-slate-500">Material: {product.material}</p>
                    ) : null}
                    {product.giTag ? (
                        <p className="text-slate-500">Craft tag: {product.giTag}</p>
                    ) : null}
                    {product.video ? (
                        <video
                            src={product.video}
                            controls
                            className="mt-4 w-full max-w-xl rounded-lg bg-brand-ink/90 aspect-video"
                        />
                    ) : null}
                </div>
            )}

            {selectedTab === "Reviews" && (
                <div className="flex flex-col gap-3 mt-14">
                    {ratings.length ? ratings.map((item, index) => (
                        <div key={index} className="flex gap-5 mb-10">
                            <SafeImage src={item?.user?.image} alt="" className="size-10 rounded-full" width={100} height={100} />
                            <div>
                                <div className="flex items-center" >
                                    {Array(5).fill('').map((_, starIndex) => (
                                        <StarIcon key={starIndex} size={18} className='text-transparent mt-0.5' fill={item.rating >= starIndex + 1 ? "#00C950" : "#D1D5DB"} />
                                    ))}
                                </div>
                                <p className="text-sm max-w-lg my-4">{item.review}</p>
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

            <div className="flex gap-3 mt-14">
                <div className="relative size-11 overflow-hidden rounded-full ring ring-slate-400">
                    <SafeImage src={storeLogo} alt="" fill className="object-cover" />
                </div>
                <div>
                    <p className="font-medium text-slate-600">Product by {storeName}</p>
                    {storeUsername ? (
                        <Link href={`/shop/${storeUsername}`} className="flex items-center gap-1.5 text-brand-emerald">
                            view store <ArrowRight size={14} />
                        </Link>
                    ) : (
                        <Link href="/artisans" className="flex items-center gap-1.5 text-brand-emerald">
                            browse artisans <ArrowRight size={14} />
                        </Link>
                    )}
                </div>
            </div>
        </div>
    )
}

export default ProductDescription
