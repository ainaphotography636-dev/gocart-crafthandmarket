/**
 * Ten claimable demo artisan profiles for CraftHand Market.
 * Auth emails are reserved so a real workshop can later claim the profile
 * (invite / password reset on the same address). Seeded into Supabase as
 * verified + active so they appear on public /artisans and admin directory.
 */

export type ClaimableProductSeed = {
  sku: string
  title: string
  displayName: string
  description: string
  category: string
  material: string
  giTag: string | null
  craftTechnique: string
  dimensions: string
  weight: string
  regionOrigin: string
  careInstructions: string
  priceInr: number
  mrpInr: number
  priceUsd: number
  mrpUsd: number
  images: string[]
  specs: Record<string, string | number | boolean>
}

export type ClaimableArtisanSeed = {
  key: string
  email: string
  fullName: string
  workshopName: string
  username: string
  artisanCode: string
  region: string
  address: string
  phone: string
  description: string
  giTags: string[]
  logoUrl: string
  product?: ClaimableProductSeed
}

export const CLAIMABLE_ARTISAN_SEED: ClaimableArtisanSeed[] = [
  {
    key: "aranmula",
    email: "padma.achari@claim.crafthand.market",
    fullName: "Padma Achari",
    workshopName: "Aranmula Specular Atelier",
    username: "aranmula-atelier",
    artisanCode: "ART101",
    region: "Aranmula, Pathanamthitta, Kerala",
    address: "Aranmula Heritage Craft Lane, Pathanamthitta, Kerala",
    phone: "+91 98765 10101",
    description:
      "Fourth-generation Aranmula Kannadi makers casting sacred specular metal for temple and collector commissions.",
    giTags: ["Aranmula Kannadi"],
    logoUrl:
      "https://images.unsplash.com/photo-1578500494198-344bba3440ac?auto=format&fit=crop&w=800&q=80",
    product: {
      sku: "ART101-001",
      title: "The Royal Aranmula Brass-Framed Specular Mirror",
      displayName: "Aranmula Mirror Masterpiece",
      description:
        "A museum-grade Aranmula Kannadi cast in sacred copper-tin alloy, set in a hand-chased brass frame.",
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
      ],
      specs: {
        stockQuantity: 2,
        badge: "GI-TAG CERTIFIED",
        series: "In Stock",
        displayName: "Aranmula Mirror Masterpiece",
        isFeatured: true,
        featuredOrder: 3,
        catalogStatus: "approved",
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
    phone: "+91 98765 10202",
    description:
      "Temple foundry specializing in ceremonial nilavilakku and ritual bronze cast with traditional alloy ratios.",
    giTags: [],
    logoUrl:
      "https://images.unsplash.com/photo-1602874801006-e616b7d1c3d8?auto=format&fit=crop&w=800&q=80",
    product: {
      sku: "ART102-001",
      title: "Ceremonial Temple Nilavilakku",
      displayName: "Ceremonial Nilavilakku",
      description:
        "A tall ceremonial oil lamp cast in pure bell metal for temple and heritage homes.",
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
      ],
      specs: {
        stockQuantity: 4,
        badge: "PURE BRONZE",
        series: "Limited Series",
        displayName: "Ceremonial Nilavilakku",
        isFeatured: true,
        featuredOrder: 2,
        catalogStatus: "approved",
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
    phone: "+91 98765 10303",
    description:
      "Family loom house weaving fine Kerala kasavu with zari borders for bridal and ceremonial wear.",
    giTags: ["Balaramapuram Sarees"],
    logoUrl:
      "https://images.unsplash.com/photo-1610030469983-98e550d85d34?auto=format&fit=crop&w=800&q=80",
    product: {
      sku: "ART103-001",
      title: "Handloom Kasavu Gold Border Saree",
      displayName: "Kasavu Gold Saree",
      description:
        "An off-white Kerala kasavu saree with a luminous gold zari border, woven on a traditional pit loom.",
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
      ],
      specs: {
        stockQuantity: 6,
        badge: "GI-TAG HANDLOOM",
        series: "Ready to Ship",
        displayName: "Kasavu Gold Saree",
        isFeatured: true,
        featuredOrder: 1,
        catalogStatus: "approved",
      },
    },
  },
  {
    key: "channapatna",
    email: "ramesh.toys@claim.crafthand.market",
    fullName: "Ramesh Gowda",
    workshopName: "Channapatna Lacquer Atelier",
    username: "channapatna-atelier",
    artisanCode: "ART104",
    region: "Channapatna, Karnataka",
    address: "Toy Town Craft Cluster, Channapatna, Karnataka",
    phone: "+91 98765 10404",
    description:
      "GI-tagged lacquer toy makers turning ivory wood on lathes and finishing with natural dyes for heirloom play sets.",
    giTags: ["Channapatna Toys"],
    logoUrl:
      "https://images.unsplash.com/photo-1558060370-d644479cb6f7?auto=format&fit=crop&w=800&q=80",
  },
  {
    key: "bidri",
    email: "fatima.bidri@claim.crafthand.market",
    fullName: "Fatima Begum",
    workshopName: "Hyderabad Bidri Studio",
    username: "hyderabad-bidri",
    artisanCode: "ART105",
    region: "Hyderabad, Telangana",
    address: "Charminar Craft Lane, Hyderabad, Telangana",
    phone: "+91 98765 10505",
    description:
      "Bidriware workshop inlaying silver into zinc-copper alloy for boxes, hookah bases, and collector trays.",
    giTags: ["Bidriware"],
    logoUrl:
      "https://images.unsplash.com/photo-1582735689369-4fe89db7114c?auto=format&fit=crop&w=800&q=80",
  },
  {
    key: "bluepottery",
    email: "kavita.jaipur@claim.crafthand.market",
    fullName: "Kavita Sharma",
    workshopName: "Jaipur Blue Pottery House",
    username: "jaipur-blue-pottery",
    artisanCode: "ART106",
    region: "Jaipur, Rajasthan",
    address: "Sanganer Pottery Road, Jaipur, Rajasthan",
    phone: "+91 98765 10606",
    description:
      "Quartz-glazed blue pottery studio crafting bowls, tiles, and planters with classic Persian-inspired motifs.",
    giTags: ["Blue Pottery of Jaipur"],
    logoUrl:
      "https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?auto=format&fit=crop&w=800&q=80",
  },
  {
    key: "rosewood",
    email: "mohan.inlay@claim.crafthand.market",
    fullName: "Mohan Rao",
    workshopName: "Mysore Rosewood Inlay Works",
    username: "mysore-rosewood",
    artisanCode: "ART107",
    region: "Mysuru, Karnataka",
    address: "Heritage Inlay Lane, Mysuru, Karnataka",
    phone: "+91 98765 10707",
    description:
      "Rosewood marquetry masters composing elephants, landscapes, and boxes with ivory-substitute and metal inlay.",
    giTags: ["Mysore Rosewood Inlay"],
    logoUrl:
      "https://images.unsplash.com/photo-1611486212557-88be5ff6f941?auto=format&fit=crop&w=800&q=80",
  },
  {
    key: "kanchipuram",
    email: "priya.silk@claim.crafthand.market",
    fullName: "Priya Sundaram",
    workshopName: "Kanchipuram Silk Weave House",
    username: "kanchi-silk-house",
    artisanCode: "ART108",
    region: "Kanchipuram, Tamil Nadu",
    address: "Silk Weavers Street, Kanchipuram, Tamil Nadu",
    phone: "+91 98765 10808",
    description:
      "Temple-town silk weavers producing bridal kanjivaram sarees with pure zari borders and contrast pallus.",
    giTags: ["Kanchipuram Silk"],
    logoUrl:
      "https://images.unsplash.com/photo-1583391733981-599b0f8f8f2c?auto=format&fit=crop&w=800&q=80",
  },
  {
    key: "cane",
    email: "ismail.cane@claim.crafthand.market",
    fullName: "Ismail Hussain",
    workshopName: "Assam Cane & Bamboo Collective",
    username: "assam-cane-collective",
    artisanCode: "ART109",
    region: "Guwahati, Assam",
    address: "Bamboo Craft Cluster, Guwahati, Assam",
    phone: "+91 98765 10909",
    description:
      "Northeast cane and bamboo artisans weaving stools, trays, and architectural screens from sustainable harvests.",
    giTags: [],
    logoUrl:
      "https://images.unsplash.com/photo-1610701596061-2ecf227e861b?auto=format&fit=crop&w=800&q=80",
  },
  {
    key: "warli",
    email: "devika.warli@claim.crafthand.market",
    fullName: "Devika Pawar",
    workshopName: "Warli Folk Art Studio",
    username: "warli-folk-studio",
    artisanCode: "ART110",
    region: "Palghar, Maharashtra",
    address: "Warli Art Village, Palghar, Maharashtra",
    phone: "+91 98765 11010",
    description:
      "Warli painters documenting village life on cloth and canvas with rice-paste motifs and natural pigments.",
    giTags: ["Warli Painting"],
    logoUrl:
      "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?auto=format&fit=crop&w=800&q=80",
  },
]
