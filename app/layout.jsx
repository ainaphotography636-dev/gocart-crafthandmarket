import localFont from "next/font/local";
import { Toaster } from "react-hot-toast";
import StoreProvider from "@/app/StoreProvider";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { CurrencyProvider } from "@/components/shared/CurrencyProvider";
import "./globals.css";

const outfit = localFont({
  src: "./fonts/Outfit-Variable.woff2",
  variable: "--font-outfit",
  weight: "100 900",
  display: "swap",
});

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
            <AuthProvider>
              <Toaster />
              {children}
            </AuthProvider>
          </CurrencyProvider>
        </StoreProvider>
      </body>
    </html>
  );
}
