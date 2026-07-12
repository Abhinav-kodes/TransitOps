import { useTranslation } from "react-i18next"


interface Trip {
  id: string
  driver: string
  vehicle: string
  status: "In Progress" | "Completed" | "Delayed" | "Scheduled"
  origin: string
  destination: string
}

const TRIPS: Trip[] = [
  { id: "TRP-1024", driver: "Marcus Johnson", vehicle: "TRK-4012", status: "In Progress", origin: "Dallas, TX", destination: "Houston, TX" },
  { id: "TRP-1025", driver: "Sarah Chen", vehicle: "VAN-2088", status: "Completed", origin: "Phoenix, AZ", destination: "Las Vegas, NV" },
  { id: "TRP-1026", driver: "Raj Patel", vehicle: "TRK-4019", status: "Delayed", origin: "Atlanta, GA", destination: "Miami, FL" },
  { id: "TRP-1027", driver: "Emily Davis", vehicle: "TNK-3005", status: "Scheduled", origin: "Chicago, IL", destination: "Detroit, MI" },
  { id: "TRP-1028", driver: "Carlos Ruiz", vehicle: "VAN-2091", status: "In Progress", origin: "Seattle, WA", destination: "Portland, OR" },
]

const STATUS_COLOR: Record<string, string> = {
  "In Progress": "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  "Completed": "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  "Delayed": "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  "Scheduled": "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
}

export default function RecentTrips() {
  const { t } = useTranslation()

  return (
    <div className="rounded border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900/40">
      <div className="border-b border-zinc-100 px-5 py-4 dark:border-zinc-800">
        <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
          {t("recentTrips")}
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-zinc-100 text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
              <th className="px-5 py-3 font-medium">Trip ID</th>
              <th className="px-5 py-3 font-medium">Driver</th>
              <th className="px-5 py-3 font-medium">Vehicle</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3 font-medium">Origin</th>
              <th className="px-5 py-3 font-medium">Destination</th>
            </tr>
          </thead>
          <tbody>
            {TRIPS.map((trip) => (
              <tr
                key={trip.id}
                className="border-b border-zinc-50 transition-colors hover:bg-zinc-50 dark:border-zinc-800/50 dark:hover:bg-zinc-800/30"
              >
                <td className="px-5 py-3 font-medium text-zinc-900 dark:text-white">{trip.id}</td>
                <td className="px-5 py-3 text-zinc-600 dark:text-zinc-300">{trip.driver}</td>
                <td className="px-5 py-3 text-zinc-600 dark:text-zinc-300">{trip.vehicle}</td>
                <td className="px-5 py-3">
                  <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_COLOR[trip.status]}`}>
                    {trip.status}
                  </span>
                </td>
                <td className="px-5 py-3 text-zinc-600 dark:text-zinc-300">{trip.origin}</td>
                <td className="px-5 py-3 text-zinc-600 dark:text-zinc-300">{trip.destination}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
