'use client'
import Banner from "@/components/public/Banner";
import Navbar from "@/components/public/Navbar";
import Footer from "@/components/public/Footer";

/**
 * Public storefront shell — Phase 1 Crafthand Market chrome.
 * Keeps GoCart multi-vendor public routes intact while mounting
 * Crafthand Navbar/Footer. Cart state stays on root StoreProvider (Redux);
 * auth remains trigger-only via Navbar Login until a provider is added.
 */
export default function PublicLayout({ children }) {
    return (
        <div className="min-h-dvh flex flex-col bg-brand-cream text-brand-ink">
            <header className="sticky top-0 z-40 w-full">
                <Banner />
                <Navbar />
            </header>
            <main className="flex-1 w-full">{children}</main>
            <Footer />
        </div>
    );
}
