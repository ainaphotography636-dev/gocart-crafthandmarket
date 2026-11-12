'use client'

const INQUIRIES = [
  {
    id: "b2b_01",
    companyName: "Nordic Living Co.",
    contactName: "Freja Holm",
    email: "freja@nordicliving.example",
    country: "Denmark",
    quantity: 250,
    budget: 18000,
    status: "IN_REVIEW",
    notes: "Corporate Diwali gifting sets — brass + handloom mix.",
  },
  {
    id: "b2b_02",
    companyName: "Harbor Hotels Group",
    contactName: "James Whitaker",
    email: "j.whitaker@harborhotels.example",
    country: "United Arab Emirates",
    quantity: 80,
    budget: 12000,
    status: "QUOTED",
    notes: "Lobby artisan display pieces and welcome amenity kits.",
  },
  {
    id: "b2b_03",
    companyName: "Maple Grove Retail",
    contactName: "Aisha Khan",
    email: "aisha@maplegrove.example",
    country: "Canada",
    quantity: 500,
    budget: 32000,
    status: "NEW",
    notes: "Seasonal wholesale pottery + spice pantry assortment.",
  },
]

export default function AdminB2BPage() {
  return (
    <div className="text-slate-500 mb-28 max-w-5xl">
      <p className="text-xs uppercase tracking-[0.18em] text-brand-gold">Trade desk</p>
      <h1 className="text-2xl mt-1">
        B2B Trade & <span className="text-slate-800 font-medium">Corporate Gifting</span>
      </h1>
      <p className="text-sm mt-2 max-w-2xl">
        Pipeline for wholesale buyers and corporate gifting programs across global markets.
      </p>

      <div className="mt-8 space-y-4">
        {INQUIRIES.map((inquiry) => (
          <article key={inquiry.id} className="border border-slate-200 rounded-xl bg-white/80 p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-brand-gold">{inquiry.status}</p>
                <h2 className="text-slate-800 font-medium mt-1">{inquiry.companyName}</h2>
                <p className="text-sm mt-1">
                  {inquiry.contactName} · {inquiry.email}
                </p>
              </div>
              <div className="text-sm text-right">
                <p>{inquiry.country}</p>
                <p className="text-slate-700 font-medium mt-1">
                  Qty {inquiry.quantity} · ${inquiry.budget.toLocaleString()}
                </p>
              </div>
            </div>
            <p className="text-sm mt-3 max-w-3xl">{inquiry.notes}</p>
          </article>
        ))}
      </div>
    </div>
  )
}
