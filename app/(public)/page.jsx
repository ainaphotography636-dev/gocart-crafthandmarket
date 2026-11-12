'use client'
import BestSelling from "@/components/public/BestSelling";
import Hero from "@/components/public/Hero";
import CategoriesMarquee from "@/components/public/CategoriesMarquee";
import Newsletter from "@/components/public/Newsletter";
import OurSpecs from "@/components/public/OurSpec";
import LatestProducts from "@/components/public/LatestProducts";

export default function Home() {
    return (
        <div>
            <Hero />
            <CategoriesMarquee />
            <LatestProducts />
            <BestSelling />
            <OurSpecs />
            <Newsletter />
        </div>
    );
}
