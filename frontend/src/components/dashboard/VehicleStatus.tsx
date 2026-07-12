import { useState, useEffect } from "react"
import { useTranslation } from "react-i18next"

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000"

interface StatusItem {
  labelKey: string
  count: number
  color: string
}

export default function VehicleStatus() {
  const { t } = useTranslation()
  const [statuses, setStatuses] = useState<StatusItem[]>([
    { labelKey: "available", count: 0, color: "bg-emerald-500" },
    { labelKey: "onTrip", count: 0, color: "bg-[#0080FF]" },
    { labelKey: "inShop", count: 0, color: "bg-amber-500" },
    { labelKey: "retired", count: 0, color: "bg-rose-400" },
  ])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStatusCounts = async () => {
      setLoading(true)
      try {
        const token = localStorage.getItem("transitops-token")
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
          ...(token && token !== "skip-mode" ? { Authorization: `Bearer ${token}` } : {}),
        }
        const res = await fetch(`${API_URL}/api/analytics/dashboard`, { headers })
        if (res.ok) {
          const data = await res.json()
          const counts = data.vehicle_status_counts || {}
          setStatuses([
            { labelKey: "available", count: counts["Available"] ?? 0, color: "bg-emerald-500" },
            { labelKey: "onTrip", count: counts["On Trip"] ?? 0, color: "bg-[#0080FF]" },
            { labelKey: "inShop", count: counts["In Shop"] ?? 0, color: "bg-amber-500" },
            { labelKey: "retired", count: counts["Retired"] ?? 0, color: "bg-rose-400" },
          ])
        }
      } catch (err) {
        console.error("Failed to load vehicle statuses:", err)
      } finally {
        setLoading(false)
      }
    }
    fetchStatusCounts()
  }, [])

  // Calculate total vehicles to get percentages for the progress bars
  const totalCount = statuses.reduce((acc, curr) => acc + curr.count, 0) || 1

  const hasData = statuses.some((s) => s.count > 0)

  return (
    <div className="rounded border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900/40">
      <span className="mb-6 block text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
        Vehicle Status
      </span>

      <div className="space-y-4">
        {statuses.map((s) => {
          const percent = Math.max(2, (s.count / totalCount) * 100)
          
          return (
            <div key={s.labelKey} className="flex items-center justify-between gap-4">
              <span className="w-16 text-xs font-semibold text-zinc-700 dark:text-zinc-300 capitalize">
                {t(s.labelKey)}
              </span>

              {/* Progress track */}
              <div className="h-2.5 flex-1 overflow-hidden rounded bg-zinc-100 dark:bg-zinc-800/80">
                <div
                  className={`h-full rounded transition-all duration-500 ${s.color}`}
                  style={{ width: `${percent}%` }}
                />
              </div>

              <span className="w-6 text-right text-xs font-mono font-semibold text-zinc-800 dark:text-zinc-200">
                {s.count}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
