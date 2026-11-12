'use client'

const SHIPMENTS = [
  {
    id: "shp_01",
    orderId: "ord_8841",
    destination: "United States",
    trackingNumber: "DDP-IN-US-22910",
    status: "IN_TRANSIT",
    ddpEnabled: true,
    insuranceCovered: true,
    insuranceAmount: 420,
    eta: "2026-11-18",
  },
  {
    id: "shp_02",
    orderId: "ord_8847",
    destination: "United Kingdom",
    trackingNumber: "DDP-IN-GB-11028",
    status: "CUSTOMS",
    ddpEnabled: true,
    insuranceCovered: true,
    insuranceAmount: 260,
    eta: "2026-11-16",
  },
  {
    id: "shp_03",
    orderId: "ord_8852",
    destination: "Canada",
    trackingNumber: "DDP-IN-CA-44190",
    status: "LABEL_CREATED",
    ddpEnabled: true,
    insuranceCovered: false,
    insuranceAmount: 0,
    eta: "2026-11-22",
  },
]

export default function AdminLogisticsPage() {
  return (
    <div className="text-slate-500 mb-28 max-w-5xl">
      <p className="text-xs uppercase tracking-[0.18em] text-brand-gold">Fulfillment</p>
      <h1 className="text-2xl mt-1">
        Orders & <span className="text-slate-800 font-medium">Global Logistics</span>
      </h1>
      <p className="text-sm mt-2 max-w-2xl">
        Track DDP (Delivered Duty Paid) consignments and transit insurance coverage for
        international handicraft orders.
      </p>

      <div className="mt-8 space-y-4">
        {SHIPMENTS.map((shipment) => (
          <article
            key={shipment.id}
            className="border border-slate-200 rounded-xl bg-white/80 p-5 flex flex-col md:flex-row md:items-center justify-between gap-4"
          >
            <div>
              <p className="text-xs text-brand-gold uppercase tracking-wide">{shipment.status}</p>
              <h2 className="text-slate-800 font-medium mt-1">Order {shipment.orderId}</h2>
              <p className="text-sm mt-1">
                {shipment.trackingNumber} → {shipment.destination}
              </p>
              <p className="text-xs mt-2">ETA {shipment.eta}</p>
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="px-2.5 py-1 rounded-full bg-brand-emerald-soft text-brand-emerald">
                {shipment.ddpEnabled ? "DDP on" : "DDP off"}
              </span>
              <span
                className={`px-2.5 py-1 rounded-full ${
                  shipment.insuranceCovered
                    ? "bg-brand-amber-soft text-brand-amber"
                    : "bg-slate-100 text-slate-500"
                }`}
              >
                {shipment.insuranceCovered
                  ? `Insured $${shipment.insuranceAmount}`
                  : "No transit insurance"}
              </span>
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}
