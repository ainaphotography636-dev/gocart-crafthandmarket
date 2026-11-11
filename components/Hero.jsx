'use client'
import { assets } from '@/assets/assets'
import { ArrowRightIcon, ChevronRightIcon } from 'lucide-react'
import Image from 'next/image'
import React from 'react'
import CategoriesMarquee from './CategoriesMarquee'
import { useCurrency } from '@/components/CurrencyProvider'

const Hero = () => {

    const { currency } = useCurrency()

    return (
        <div className='mx-6'>
            <div className='flex max-xl:flex-col gap-8 max-w-7xl mx-auto my-10'>
                <div className='relative flex-1 flex flex-col bg-brand-emerald-soft rounded-3xl xl:min-h-100 group border border-brand-emerald/10'>
                    <div className='p-5 sm:p-16'>
                        <div className='inline-flex items-center gap-3 bg-brand-amber-soft text-brand-amber pr-4 p-1 rounded-full text-xs sm:text-sm'>
                            <span className='bg-brand-emerald px-3 py-1 max-sm:ml-1 rounded-full text-white text-xs'>NEWS</span> Free Shipping on Orders Above {currency.symbol}50! <ChevronRightIcon className='group-hover:ml-2 transition-all' size={16} />
                        </div>
                        <h2 className='text-3xl sm:text-5xl leading-[1.2] my-3 font-medium bg-gradient-to-r from-brand-ink to-brand-emerald bg-clip-text text-transparent max-w-xs  sm:max-w-md'>
                            Artisan pieces you&apos;ll love. Craft you can trust.
                        </h2>
                        <div className='text-slate-800 text-sm font-medium mt-4 sm:mt-8'>
                            <p>Starts from</p>
                            <p className='text-3xl text-brand-gold'>{currency.symbol}4.90</p>
                        </div>
                        <button className='bg-brand-emerald text-white text-sm py-2.5 px-7 sm:py-5 sm:px-12 mt-4 sm:mt-10 rounded-md hover:bg-brand-amber hover:scale-103 active:scale-95 transition'>LEARN MORE</button>
                    </div>
                    <Image className='sm:absolute bottom-0 right-0 md:right-10 w-full sm:max-w-sm' src={assets.hero_model_img} alt="" />
                </div>
                <div className='flex flex-col md:flex-row xl:flex-col gap-5 w-full xl:max-w-sm text-sm text-slate-600'>
                    <div className='flex-1 flex items-center justify-between w-full bg-brand-amber-soft rounded-3xl p-6 px-8 group border border-brand-amber/15'>
                        <div>
                            <p className='text-3xl font-medium bg-gradient-to-r from-brand-ink to-brand-amber bg-clip-text text-transparent max-w-40'>Best makers</p>
                            <p className='flex items-center gap-1 mt-4 text-brand-amber'>View more <ArrowRightIcon className='group-hover:ml-2 transition-all' size={18} /> </p>
                        </div>
                        <Image className='w-35' src={assets.hero_product_img1} alt="" />
                    </div>
                    <div className='flex-1 flex items-center justify-between w-full bg-amber-100/80 rounded-3xl p-6 px-8 group border border-brand-gold/20'>
                        <div>
                            <p className='text-3xl font-medium bg-gradient-to-r from-brand-ink to-brand-gold-rich bg-clip-text text-transparent max-w-40'>20% discounts</p>
                            <p className='flex items-center gap-1 mt-4 text-brand-gold'>View more <ArrowRightIcon className='group-hover:ml-2 transition-all' size={18} /> </p>
                        </div>
                        <Image className='w-35' src={assets.hero_product_img2} alt="" />
                    </div>
                </div>
            </div>
            <CategoriesMarquee />
        </div>

    )
}

export default Hero
