import localFont from "next/font/local";
import { Playfair_Display } from "next/font/google";
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

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

export const metadata = {
  title: "CraftHand Market — Direct from Verified Artisans",
  description:
    "CraftHand Market — authenticated Indian handicrafts with video proof, escrow protection, and workshop-coded pieces.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${outfit.className} ${playfair.variable} antialiased`}>
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
