'use client'

import { addToCart } from "@/lib/features/cart/cartSlice";
import { StarIcon, TagIcon, EarthIcon, CreditCardIcon, UserIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import Counter from "./Counter";
import { useDispatch, useSelector } from "react-redux";
import { useAuth } from "@/components/auth/AuthProvider";
import SafeImage from "@/components/shared/SafeImage";
import { useCurrency } from "@/components/shared/CurrencyProvider";
import { MEDIA_PLACEHOLDER } from "@/lib/marketplace/media";
import { formatProductTitle } from "@/lib/productCodes";

const ProductDetails = ({ product }) => {
    const productId = product.id;
    const { currency: currencyInfo } = useCurrency();
    const currency = currencyInfo.symbol;
    const { requireClientAuth } = useAuth();

    const cart = useSelector(state => state.cart.cartItems);
    const dispatch = useDispatch();
    const router = useRouter()

    const images = useMemo(() => {
        const list = Array.isArray(product?.images) ? product.images.filter(Boolean) : []
        return list.length ? list : [MEDIA_PLACEHOLDER]
    }, [product?.images])

    const [mainImage, setMainImage] = useState(images[0]);

    const addToCartHandler = () => {
        if (!requireClientAuth({ productId, nextPath: "/cart" })) return
        dispatch(addToCart({ productId }))
    }

    const ratings = Array.isArray(product?.rating) ? product.rating : []
    const averageRating = ratings.length
        ? ratings.reduce((acc, item) => acc + Number(item.rating || 0), 0) / ratings.length
        : 0
    const mrp = Number(product.mrp) || Number(product.price) || 0
    const price = Number(product.price) || 0
    const savings = mrp > 0 && mrp > price
        ? (((mrp - price) / mrp) * 100).toFixed(0)
        : null

    return (
        <div className="flex max-lg:flex-col gap-12">
            <div className="flex max-sm:flex-col-reverse gap-3">
                <div className="flex sm:flex-col gap-3">
                    {images.map((image, index) => (
                        <button
                            type="button"
                            key={`${image}-${index}`}
                            onClick={() => setMainImage(images[index])}
                            className="bg-slate-100 flex items-center justify-center size-26 rounded-lg group cursor-pointer overflow-hidden"
                        >
                            <SafeImage src={image} className="group-hover:scale-103 group-active:scale-95 transition object-contain" alt="" width={45} height={45} />
                        </button>
                    ))}
                </div>
                <div className="relative flex justify-center items-center h-100 sm:size-113 bg-slate-100 rounded-lg overflow-hidden">
                    <SafeImage src={mainImage} alt={formatProductTitle(product)} width={250} height={250} className="object-contain max-h-full" />
                </div>
            </div>
            <div className="flex-1">
                <h1 className="text-3xl font-semibold text-slate-800">{formatProductTitle(product)}</h1>
                {product.artisanName ? (
                    <p className="mt-2 text-sm text-slate-500">
                        by{" "}
                        {product.artisanUsername ? (
                            <button
                                type="button"
                                className="text-brand-emerald hover:underline"
                                onClick={() => router.push(`/shop/${product.artisanUsername}`)}
                            >
                                {product.artisanName}
                            </button>
                        ) : (
                            product.artisanName
                        )}
                    </p>
                ) : null}
                <div className='flex items-center mt-2'>
                    {Array(5).fill('').map((_, index) => (
                        <StarIcon key={index} size={14} className='text-transparent mt-0.5' fill={averageRating >= index + 1 ? "#047857" : "#D1D5DB"} />
                    ))}
                    <p className="text-sm ml-3 text-slate-500">{ratings.length} Reviews</p>
                </div>
                <div className="flex items-start my-6 gap-3 text-2xl font-semibold text-slate-800">
                    <p> {currency}{price} </p>
                    {mrp > price ? (
                        <p className="text-xl text-slate-500 line-through">{currency}{mrp}</p>
                    ) : null}
                </div>
                {savings ? (
                    <div className="flex items-center gap-2 text-slate-500">
                        <TagIcon size={14} />
                        <p>Save {savings}% right now</p>
                    </div>
                ) : null}
                <div className="flex items-end gap-5 mt-10">
                    {
                        cart[productId] && (
                            <div className="flex flex-col gap-3">
                                <p className="text-lg text-slate-800 font-semibold">Quantity</p>
                                <Counter productId={productId} />
                            </div>
                        )
                    }
                    <button onClick={() => !cart[productId] ? addToCartHandler() : router.push('/cart')} className="bg-slate-800 text-white px-10 py-3 text-sm font-medium rounded hover:bg-slate-900 active:scale-95 transition">
                        {!cart[productId] ? 'Add to Cart' : 'View Cart'}
                    </button>
                </div>
                <hr className="border-gray-300 my-5" />
                <div className="flex flex-col gap-4 text-slate-500">
                    <p className="flex gap-3"> <EarthIcon className="text-slate-400" /> Free shipping worldwide </p>
                    <p className="flex gap-3"> <CreditCardIcon className="text-slate-400" /> 100% Secured Payment </p>
                    <p className="flex gap-3"> <UserIcon className="text-slate-400" /> Trusted by top brands </p>
                </div>

            </div>
        </div>
    )
}

export default ProductDetails
