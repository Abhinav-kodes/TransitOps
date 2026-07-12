import { useState, useEffect } from "react"
import { useTranslation } from "react-i18next"
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts"

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000"

interface StatusItem {
  labelKey: string
  count: number
  color: string
}

export default function VehicleStatus() {
  const { t } = useTranslation()
  const [statuses, setStatuses] = useState<StatusItem[]>([
    { labelKey: "available", count: 42, color: "#10b981" },
    { labelKey: "onTrip", count: 53, color: "#0080FF" },
    { labelKey: "inShop", count: 5, color: "#f59e0b" },
    { labelKey: "retired", count: 2, color: "#d4d4d8" },
  ])

  useEffect(() => {
    const fetchStatusCounts = async () => {
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
            { labelKey: "available", count: counts["Available"] ?? 0, color: "#10b981" },
            { labelKey: "onTrip", count: counts["On Trip"] ?? 0, color: "#0080FF" },
            { labelKey: "inShop", count: counts["In Shop"] ?? 0, color: "#f59e0b" },
            { labelKey: "retired", count: counts["Retired"] ?? 0, color: "#d4d4d8" },
          ])
        }
      } catch (err) {
        console.error("Failed to load vehicle statuses:", err)
      }
    }
    fetchStatusCounts()
  }, [])

  return (
    <div className="rounded border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900/40">
      <span className="mb-4 block text-xs font-semibold text-zinc-800 dark:text-zinc-200">
        {t("vehicleStatus")}
      </span>

      <div className="flex items-center gap-6">
        <div className="size-28 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={statuses}
                dataKey="count"
                cx="50%"
                cy="50%"
                innerRadius={28}
                outerRadius={48}
                strokeWidth={0}
              >
                {statuses.map((s) => (
                  <Cell key={s.labelKey} fill={s.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="flex-1 space-y-2.5">
          {statuses.map((s) => (
            <div key={s.labelKey} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-full" style={{ backgroundColor: s.color }} />
                <span className="text-xs text-zinc-600 dark:text-zinc-400">{t(s.labelKey)}</span>
              </div>
              <span className="text-xs font-medium text-zinc-800 dark:text-zinc-200">{s.count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
