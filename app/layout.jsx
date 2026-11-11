import { Outfit } from "next/font/google";
import { Toaster } from "react-hot-toast";
import StoreProvider from "@/app/StoreProvider";
import { CurrencyProvider } from "@/components/shared/CurrencyProvider";
import "./globals.css";

const outfit = Outfit({ subsets: ["latin"], weight: ["400", "500", "600"] });

export const metadata = {
    title: "Crafthand Market — Artisan goods, thoughtfully curated",
    description: "Crafthand Market — Discover premium artisan goods from independent makers.",
};

export default function RootLayout({ children }) {
    return (
        <html lang="en">
            <body className={`${outfit.className} antialiased`}>
                <StoreProvider>
                    <CurrencyProvider>
                        <Toaster />
                        {children}
                    </CurrencyProvider>
                </StoreProvider>
            </body>
        </html>
    );
}
