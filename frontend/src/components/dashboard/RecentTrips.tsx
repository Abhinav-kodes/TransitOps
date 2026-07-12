import { useState, useEffect } from "react"
import { useTranslation } from "react-i18next"

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000"

const STATUS_COLOR: Record<string, string> = {
  "In Progress": "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  "Completed": "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  "Delayed": "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  "Scheduled": "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
  "Cancelled": "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
}

const getDisplayStatus = (status: string) => {
  if (status === "Dispatched") return "In Progress"
  if (status === "Draft") return "Scheduled"
  return status
}

export default function RecentTrips() {
  const { t } = useTranslation()
  const [trips, setTrips] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchRecentTrips = async () => {
      try {
        const token = localStorage.getItem("transitops-token")
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
          ...(token && token !== "skip-mode" ? { Authorization: `Bearer ${token}` } : {}),
        }
        const res = await fetch(`${API_URL}/api/operations/trips`, { headers })
        if (res.ok) {
          const data = await res.json()
          const sorted = data.sort((a: any, b: any) => b.id - a.id).slice(0, 5)
          setTrips(sorted)
        }
      } catch (err) {
        console.error("Failed to load recent trips:", err)
      } finally {
        setLoading(false)
      }
    }
    fetchRecentTrips()
  }, [])

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
            {loading ? (
              <tr>
                <td colSpan={6} className="px-5 py-6 text-center text-zinc-400">
                  Loading trips...
                </td>
              </tr>
            ) : trips.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-6 text-center text-zinc-400">
                  No recent trips found.
                </td>
              </tr>
            ) : (
              trips.map((trip) => {
                const displayStatus = getDisplayStatus(trip.status)
                return (
                  <tr
                    key={trip.id}
                    className="border-b border-zinc-50 transition-colors hover:bg-zinc-50 dark:border-zinc-800/50 dark:hover:bg-zinc-800/30"
                  >
                    <td className="px-5 py-3 font-medium text-zinc-900 dark:text-white">
                      {trip.trip_code}
                    </td>
                    <td className="px-5 py-3 text-zinc-600 dark:text-zinc-300">
                      {trip.driver_name || "Unassigned"}
                    </td>
                    <td className="px-5 py-3 text-zinc-600 dark:text-zinc-300">
                      {trip.vehicle_name || "Unassigned"}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_COLOR[displayStatus] || STATUS_COLOR["Scheduled"]}`}>
                        {displayStatus}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-zinc-600 dark:text-zinc-300">{trip.source}</td>
                    <td className="px-5 py-3 text-zinc-600 dark:text-zinc-300">{trip.destination}</td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
