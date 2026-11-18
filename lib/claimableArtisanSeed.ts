/**
 * Claimable Featured Luxury Handicrafts — three verified workshops + one
 * masterpiece each. Auth emails are reserved so a real artisan can later
 * claim the profile (password reset / invite on the same address).
 */

export const CLAIMABLE_ARTISAN_SEED = [
  {
    key: "aranmula",
    email: "padma.achari@claim.crafthand.market",
    fullName: "Padma Achari",
    workshopName: "Aranmula Specular Atelier",
    username: "aranmula-atelier",
    artisanCode: "ART101",
    region: "Aranmula, Pathanamthitta, Kerala",
    address: "Aranmula Heritage Craft Lane, Pathanamthitta, Kerala",
    description:
      "Fourth-generation Aranmula Kannadi makers casting sacred specular metal for temple and collector commissions.",
    giTags: ["Aranmula Kannadi"],
    product: {
      sku: "ART101-001",
      title: "The Royal Aranmula Brass-Framed Specular Mirror",
      displayName: "Aranmula Mirror Masterpiece",
      description:
        "A museum-grade Aranmula Kannadi cast in sacred copper-tin alloy, set in a hand-chased brass frame. Each disc is polished for days until the surface returns a true, distortion-free reflection — GI-tagged and workshop-coded.",
      category: "Brass & Bell Metal",
      material: "Copper-tin alloy & brass",
      giTag: "Aranmula Kannadi",
      craftTechnique: "Lost-wax specular casting",
      dimensions: "32 × 24 × 8 cm",
      weight: "2.4 kg",
      regionOrigin: "Aranmula, Kerala",
      careInstructions: "Wipe with a soft dry cloth. Avoid water, oils, and abrasives.",
      priceInr: 45500,
      mrpInr: 52000,
      priceUsd: 545,
      mrpUsd: 625,
      images: [
        "https://images.unsplash.com/photo-1578500494198-344bba3440ac?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1610701596007-11502861dcfa?auto=format&fit=crop&w=1200&q=80",
      ],
      specs: {
        stockQuantity: 2,
        badge: "GI-TAG CERTIFIED",
        series: "In Stock",
        displayName: "Aranmula Mirror Masterpiece",
      },
    },
  },
  {
    key: "nilavilakku",
    email: "suresh.thattar@claim.crafthand.market",
    fullName: "Suresh Thattar",
    workshopName: "Thrissur Bell Metal Foundry",
    username: "thrissur-foundry",
    artisanCode: "ART102",
    region: "Thrissur, Kerala",
    address: "Temple Bell Metal Street, Thrissur, Kerala",
    description:
      "Temple foundry specializing in ceremonial nilavilakku and ritual bronze cast with traditional alloy ratios.",
    giTags: [],
    product: {
      sku: "ART102-001",
      title: "Ceremonial Temple Nilavilakku",
      displayName: "Ceremonial Nilavilakku",
      description:
        "A tall ceremonial oil lamp cast in pure bell metal for temple and heritage homes. The multi-tiered stem and flared bowl are hand-finished after sand casting — limited series from the Thrissur foundry.",
      category: "Brass & Bell Metal",
      material: "Bell metal (bronze)",
      giTag: null,
      craftTechnique: "Sand-cast bronze finishing",
      dimensions: "78 × 28 × 28 cm",
      weight: "6.8 kg",
      regionOrigin: "Thrissur, Kerala",
      careInstructions: "Polish with dry brass cloth. Fill only with pure oil and cotton wicks.",
      priceInr: 28900,
      mrpInr: 34000,
      priceUsd: 345,
      mrpUsd: 410,
      images: [
        "https://images.unsplash.com/photo-1602874801006-e616b7d1c3d8?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1513519245088-0e12902e35a6?auto=format&fit=crop&w=1200&q=80",
      ],
      specs: {
        stockQuantity: 4,
        badge: "PURE BRONZE",
        series: "Limited Series",
        displayName: "Ceremonial Nilavilakku",
      },
    },
  },
  {
    key: "kasavu",
    email: "anjali.weaver@claim.crafthand.market",
    fullName: "Anjali Weaver",
    workshopName: "Balaramapuram Kasavu Looms",
    username: "kasavu-looms",
    artisanCode: "ART103",
    region: "Balaramapuram, Thiruvananthapuram, Kerala",
    address: "Handloom Cluster, Balaramapuram, Kerala",
    description:
      "Family loom house weaving fine Kerala kasavu with zari borders for bridal and ceremonial wear.",
    giTags: ["Balaramapuram Sarees"],
    product: {
      sku: "ART103-001",
      title: "Handloom Kasavu Gold Border Saree",
      displayName: "Kasavu Gold Saree",
      description:
        "An off-white Kerala kasavu saree with a luminous gold zari border, woven on a traditional pit loom in Balaramapuram. Lightweight, ceremonial, and ready to ship with GI handloom provenance.",
      category: "Handlooms & Textiles",
      material: "Handloom cotton & zari",
      giTag: "Balaramapuram Sarees",
      craftTechnique: "Pit-loom kasavu weave",
      dimensions: "5.5 m × 1.2 m",
      weight: "480 g",
      regionOrigin: "Balaramapuram, Kerala",
      careInstructions: "Dry clean only. Store folded in muslin away from direct light.",
      priceInr: 16500,
      mrpInr: 19800,
      priceUsd: 198,
      mrpUsd: 238,
      images: [
        "https://images.unsplash.com/photo-1610030469983-98e550d85d34?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=1200&q=80",
      ],
      specs: {
        stockQuantity: 6,
        badge: "GI-TAG HANDLOOM",
        series: "Ready to Ship",
        displayName: "Kasavu Gold Saree",
      },
    },
  },
] as const

export type ClaimableArtisanSeed = (typeof CLAIMABLE_ARTISAN_SEED)[number]
