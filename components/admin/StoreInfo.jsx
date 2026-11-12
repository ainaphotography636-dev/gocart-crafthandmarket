'use client'
import Image from "next/image"
import { MapPin, Mail, Phone } from "lucide-react"
import { assets } from "@/assets/assets"

const StoreInfo = ({ store }) => {
  if (!store) return null

  const logo =
    (typeof store.logoUrl === "string" && store.logoUrl) ||
    (typeof store.logo === "string" && store.logo) ||
    assets.upload_area
  const user = store.user || {}
  const userImage =
    (typeof user.image === "string" && user.image) || logo
  const userName = user.name || store.name || "Artisan"
  const userEmail = user.email || store.email || ""
  const createdAt = store.createdAt || store.syncedAt || store.updatedAt
  const createdLabel = createdAt
    ? new Date(createdAt).toLocaleDateString()
    : "—"
  const isDataUrl = (value) =>
    typeof value === "string" && value.startsWith("data:")
  const shouldUnoptimize = (value) =>
    isDataUrl(value) ||
    (typeof value === "string" && value.startsWith("http"))

  return (
    <div className="flex-1 space-y-2 text-sm">
      <Image
        width={100}
        height={100}
        src={logo}
        alt={store.name || "Workshop logo"}
        className="max-w-20 max-h-20 object-contain shadow rounded-full max-sm:mx-auto"
        unoptimized={shouldUnoptimize(logo)}
      />
      <div className="flex flex-col sm:flex-row gap-3 items-center">
        <h3 className="text-xl font-semibold text-slate-800">{store.name}</h3>
        {store.artisanCode ? (
          <p className="text-xs font-mono text-brand-emerald mt-1">{store.artisanCode}</p>
        ) : null}
        <span className="text-sm">@{store.username || "workshop"}</span>

        <span
          className={`text-xs font-semibold px-4 py-1 rounded-full ${
            store.status === "pending"
              ? "bg-yellow-100 text-yellow-800"
              : store.status === "rejected"
                ? "bg-red-100 text-red-800"
                : "bg-green-100 text-green-800"
          }`}
        >
          {store.status || "approved"}
        </span>
      </div>

      <p className="text-slate-600 my-5 max-w-2xl">{store.description}</p>
      <p className="flex items-center gap-2">
        <MapPin size={16} /> {store.address || "—"}
      </p>
      <p className="flex items-center gap-2">
        <Phone size={16} /> {store.contact || "—"}
      </p>
      <p className="flex items-center gap-2">
        <Mail size={16} /> {store.email || "—"}
      </p>
      <p className="text-slate-700 mt-5">
        Applied on <span className="text-xs">{createdLabel}</span> by
      </p>
      <div className="flex items-center gap-2 text-sm ">
        <Image
          width={36}
          height={36}
          src={userImage}
          alt={userName}
          className="w-9 h-9 rounded-full object-cover"
          unoptimized={shouldUnoptimize(userImage)}
        />
        <div>
          <p className="text-slate-600 font-medium">{userName}</p>
          <p className="text-slate-400">{userEmail}</p>
        </div>
      </div>
    </div>
  )
}

export default StoreInfo

