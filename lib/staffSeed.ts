/**
 * Canonical demo / bootstrap staff directory for Crafthand Market admin.
 * Used by the local registry and by `connectDemoStaffToSupabase`.
 */

export const DEMO_STAFF_SEED = [
  {
    key: "founder",
    name: "Aina Menon",
    email: "aina@crafthand.market",
    portfolio:
      "Founder — Kerala craft heritage, marketplace ops, and platform vision.",
    role: "SUPER_ADMIN",
    permissions: ["*"] as string[],
    isFounder: true,
  },
  {
    key: "main",
    name: "Jordan Blake",
    email: "jordan@crafthand.market",
    portfolio: "Senior ops lead across catalog, logistics, and staff workflows.",
    role: "MAIN_ADMIN",
    permissions: [] as string[],
    isFounder: false,
  },
  {
    key: "ops",
    name: "Rahul Iyer",
    email: "rahul@crafthand.market",
    portfolio: "Day-to-day order ops and DDP logistics coordination.",
    role: "OPERATIONS",
    permissions: [] as string[],
    isFounder: false,
  },
  {
    key: "artisan",
    name: "Meera Nair",
    email: "meera@crafthand.market",
    portfolio: "Workshop onboarding and product QC for GI-tagged crafts.",
    role: "ARTISAN_LEAD",
    permissions: [] as string[],
    isFounder: false,
  },
  {
    key: "b2b",
    name: "Sofia Alvarez",
    email: "sofia@crafthand.market",
    portfolio: "Wholesale and corporate gifting partnerships.",
    role: "B2B_TRADE",
    permissions: [] as string[],
    isFounder: false,
  },
] as const

export type DemoStaffSeed = (typeof DEMO_STAFF_SEED)[number]
