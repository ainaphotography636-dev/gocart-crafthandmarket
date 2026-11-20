/**
 * Crafthand Market — Gifting taxonomy (storefront + artisan product tagging).
 * Structure matches the approved gifting category sheet.
 */

export const GIFTING_GROUPS = [
  {
    id: "gift-hampers",
    title: "Gift Hampers",
    items: [
      "Diwali Gift Hampers",
      "Birthday Gift Hampers",
      "Corporate Gift Hampers",
      "Chocolate Gift Hampers",
      "Dry Fruits Gift Hampers",
    ],
  },
  {
    id: "occasional-gifts",
    title: "Occasional Gifts",
    items: [
      "Karwa Chauth Gifts",
      "Diwali Gifts",
      "Rakshabandhan Gifts",
      "Bhai Dooj Gifts",
      "Christmas Gifts",
      "Birthday Gifts",
      "Wedding Gifts",
      "Anniversary Gifts",
      "Mothers Day Gifts",
      "Fathers Day Gifts",
      "Womens Day Gifts",
      "Teachers Day Gifts",
      "Valentines Day Gifts",
    ],
  },
  {
    id: "gifts-by-relationship",
    title: "Gifts By Relationship",
    items: [
      "Gifts For Brother",
      "Gifts For Sister",
      "Gifts For Father",
      "Gifts For Mother",
      "Gifts For Husband",
      "Gifts For Wife",
      "Gifts For Boyfriend",
      "Gifts For Girlfriend",
      "Gifts For Grandfather",
      "Gifts For Grandmother",
      "Gifts For Friends",
      "Gifts For Son",
      "Gifts For Daughter",
    ],
  },
  {
    id: "return-gifts",
    title: "Return Gifts",
    items: [
      "Birthday Return Gifts",
      "Wedding Return Gifts",
      "Baby Shower Return Gifts",
      "Geet Sangeet Return Gifts",
      "Housewarming Return Gifts",
      "Anniversary Return Gifts",
    ],
  },
  {
    id: "diwali-decoration",
    title: "Diwali Decoration Items",
    items: [
      "Lakshmi Ganesha Idols",
      "Brass Diyas",
      "Door Hangings",
      "Tea Light Holders",
      "Incense Holders",
      "Scented Candles",
    ],
  },
  {
    id: "corporate-gifts",
    title: "Corporate Gifts",
    items: [
      "Gifts For Colleagues",
      "Gifts For Employees",
      "Gifts For Clients",
      "Retirement Gifts",
      "Farewell Gifts",
    ],
  },
  {
    // Sheet label was a stub "HEADING"; items are Karwa Chauth essentials.
    id: "karwa-chauth-essentials",
    title: "Karwa Chauth Essentials",
    items: ["Karwa Chauth Gifts", "Thali", "Diyas"],
  },
]

/** Flat list of every selectable gifting tag (unique). */
export const GIFTING_TAGS = [
  ...new Set(GIFTING_GROUPS.flatMap((group) => group.items)),
]

export function isGiftingTag(value) {
  return GIFTING_TAGS.includes(String(value || "").trim())
}

export function normalizeGiftingTags(input) {
  if (!Array.isArray(input)) return []
  const unique = []
  const seen = new Set()
  for (const raw of input) {
    const tag = String(raw || "").trim()
    if (!tag || !isGiftingTag(tag) || seen.has(tag)) continue
    seen.add(tag)
    unique.push(tag)
  }
  return unique
}

/**
 * Heuristic fallback when a product has no explicit gifting tags yet —
 * maps craft category / material / title keywords to suitable gift tags.
 */
export function inferGiftingTags(product) {
  const hay = [
    product?.category,
    product?.material,
    product?.title,
    product?.name,
    product?.giTag,
    product?.craftTechnique,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()

  const tags = new Set()

  if (/brass|bell metal|diya|lamp|nilavilakku|idol|metal/.test(hay)) {
    tags.add("Brass Diyas")
    tags.add("Diyas")
    tags.add("Diwali Gifts")
    tags.add("Lakshmi Ganesha Idols")
    tags.add("Wedding Gifts")
    tags.add("Housewarming Return Gifts")
    tags.add("Corporate Gift Hampers")
    tags.add("Gifts For Clients")
  }
  if (/textile|handloom|saree|silk|kasavu|stole|fabric/.test(hay)) {
    tags.add("Wedding Gifts")
    tags.add("Anniversary Gifts")
    tags.add("Mothers Day Gifts")
    tags.add("Gifts For Mother")
    tags.add("Gifts For Wife")
    tags.add("Diwali Gifts")
  }
  if (/wood|inlay|carv|rosewood|teak|sculpture/.test(hay)) {
    tags.add("Housewarming Return Gifts")
    tags.add("Retirement Gifts")
    tags.add("Gifts For Father")
    tags.add("Gifts For Husband")
    tags.add("Gifts For Colleagues")
    tags.add("Farewell Gifts")
  }
  if (/potter|terracotta|ceramic|clay|bowl/.test(hay)) {
    tags.add("Housewarming Return Gifts")
    tags.add("Wedding Return Gifts")
    tags.add("Birthday Return Gifts")
    tags.add("Anniversary Return Gifts")
  }
  if (/mirror|aranmula|jewellery|bead|jewelry/.test(hay)) {
    tags.add("Wedding Gifts")
    tags.add("Anniversary Gifts")
    tags.add("Valentines Day Gifts")
    tags.add("Gifts For Wife")
    tags.add("Gifts For Girlfriend")
    tags.add("Karwa Chauth Gifts")
  }
  if (/spice|pantry|food|dry fruit|chocolate/.test(hay)) {
    tags.add("Dry Fruits Gift Hampers")
    tags.add("Chocolate Gift Hampers")
    tags.add("Diwali Gift Hampers")
    tags.add("Corporate Gift Hampers")
  }

  // Always offer a few evergreen relationship / occasion tags for catalog coverage
  if (tags.size === 0) {
    tags.add("Birthday Gifts")
    tags.add("Wedding Gifts")
    tags.add("Gifts For Friends")
    tags.add("Corporate Gift Hampers")
  }

  return [...tags].filter((tag) => isGiftingTag(tag))
}

export function productGiftingTags(product) {
  const fromSpecs = normalizeGiftingTags(product?.specs?.giftingCategories)
  if (fromSpecs.length) return fromSpecs
  return inferGiftingTags(product)
}

export function productMatchesGiftingTag(product, tag) {
  if (!tag) return true
  return productGiftingTags(product).includes(tag)
}

export function findGiftingGroup(groupId) {
  return GIFTING_GROUPS.find((group) => group.id === groupId) || null
}
