'use client'
import Link from "next/link";

/**
 * Crafthand Market public Footer — heritage marketplace chrome.
 */
const Footer = () => {
    const values = ["Authenticity", "Transparency", "Craftsmanship", "Security"]

    return (
        <footer className="mt-auto bg-brand-forest text-brand-cream">
            <div className="mx-auto max-w-7xl px-6 py-14 sm:px-8">
                <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-3 lg:gap-14">
                    <div>
                        <p className="text-2xl font-bold tracking-tight">
                            <span className="text-brand-terracotta">Craft</span>
                            <span className="text-white">hand</span>
                            <span className="mt-1 block text-[11px] font-semibold uppercase tracking-[0.28em] text-brand-emerald-light">
                              Market
                            </span>
                        </p>
                        <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/65">
                            Direct from verified artisans to the world — video proof,
                            workshop coding, and escrow-protected international delivery.
                        </p>
                    </div>

                    <div>
                        <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-white/50">
                            Core Values
                        </h3>
                        <ul className="mt-4 space-y-2.5 text-sm text-white/80">
                            {values.map((value) => (
                                <li key={value}>{value}</li>
                            ))}
                        </ul>
                    </div>

                    <div>
                        <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-white/50">
                            Official Portal
                        </h3>
                        <ul className="mt-4 space-y-2.5 text-sm">
                            <li>
                                <Link href="/shop" className="text-brand-terracotta hover:underline">
                                    crafthand.market
                                </Link>
                            </li>
                            <li>
                                <Link href="/gifting" className="text-white/80 hover:text-white">
                                    Gifting catalog
                                </Link>
                            </li>
                            <li className="text-white/80">WhatsApp Concierge Support Available</li>
                            <li className="text-white/80">International Air Logistics</li>
                            <li>
                                <Link href="/artisan/join" className="text-white/80 hover:text-white">
                                    Join as Artisan
                                </Link>
                            </li>
                        </ul>
                    </div>
                </div>

                <div className="mt-12 flex flex-col gap-2 border-t border-white/15 pt-5 text-xs text-white/45 sm:flex-row sm:items-center sm:justify-between">
                    <p>Copyright {new Date().getFullYear()} © CraftHand Market. All Rights Reserved.</p>
                    <p>Direct Rural Artisan Marketplace</p>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
