'use client'
import { StarIcon } from 'lucide-react'
import Link from 'next/link'
import React from 'react'
import SafeImage from '@/components/shared/SafeImage'
import { useCurrency } from '@/components/shared/CurrencyProvider'
import { formatProductTitle } from '@/lib/productCodes'

const ProductCard = ({ product }) => {
    const { currency } = useCurrency()
    const currencySymbol = currency.symbol
    const ratings = Array.isArray(product?.rating) ? product.rating : []
    const rating = ratings.length
        ? Math.round(ratings.reduce((acc, curr) => acc + Number(curr.rating || 0), 0) / ratings.length)
        : 0
    const image = Array.isArray(product?.images) && product.images[0] ? product.images[0] : null

    return (
        <Link href={`/product/${product.id}`} className=' group max-xl:mx-auto'>
            <div className='relative bg-[#F5F5F5] h-40 sm:w-60 sm:h-68 rounded-lg overflow-hidden flex items-center justify-center'>
                <SafeImage
                    width={500}
                    height={500}
                    className='max-h-30 sm:max-h-40 w-auto object-contain group-hover:scale-115 transition duration-300'
                    src={image}
                    alt={formatProductTitle(product)}
                />
            </div>
            <div className='flex justify-between gap-3 text-sm text-slate-800 pt-2 max-w-60'>
                <div>
                    <p>{formatProductTitle(product)}</p>
                    <div className='flex'>
                        {Array(5).fill('').map((_, index) => (
                            <StarIcon key={index} size={14} className='text-transparent mt-0.5' fill={rating >= index + 1 ? "#047857" : "#D1D5DB"} />
                        ))}
                    </div>
                    {product.artisanName ? (
                        <p className="text-xs text-slate-400 mt-1">by {product.artisanName}</p>
                    ) : null}
                </div>
                <p>{currencySymbol}{product.price}</p>
            </div>
        </Link>
    )
}

export default ProductCard
