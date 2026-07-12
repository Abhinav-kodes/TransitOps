import { useState, useEffect } from "react"
import { useTranslation } from "react-i18next"
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell } from "recharts"

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000"

interface DailyUtilizationItem {
  name: string
  value: number
}

export default function KpiGrid() {
  const { t } = useTranslation()
  const [data, setData] = useState({
    fleetUtilization: 87.0,
    onTimeDelivery: 94.1,
    safetyIncidents: 2,
    totalTrips: 1284,
    avgFuelEfficiency: 8.2,
  })
  const [dailyData, setDailyData] = useState<DailyUtilizationItem[]>([
    { name: "Mon", value: 87 },
    { name: "Tue", value: 92 },
    { name: "Wed", value: 78 },
    { name: "Thu", value: 95 },
    { name: "Fri", value: 88 },
    { name: "Sat", value: 65 },
    { name: "Sun", value: 52 },
  ])

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const token = localStorage.getItem("transitops-token")
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
          ...(token && token !== "skip-mode" ? { Authorization: `Bearer ${token}` } : {}),
        }
        const res = await fetch(`${API_URL}/api/analytics/dashboard`, { headers })
        if (res.ok) {
          const result = await res.json()
          setData({
            fleetUtilization: result.fleet_utilization,
            onTimeDelivery: result.on_time_delivery,
            safetyIncidents: result.safety_incidents,
            totalTrips: result.total_trips,
            avgFuelEfficiency: result.avg_fuel_efficiency,
          })
          if (result.daily_utilization) {
            setDailyData(result.daily_utilization)
          }
        }
      } catch (err) {
        console.error("Failed to load dashboard KPIs:", err)
      }
    }
    fetchAnalytics()
  }, [])

  const kpis = [
    { labelKey: "kpi.fleetUtilization", value: `${data.fleetUtilization}%`, change: "+3.2%", positive: true, bar: true },
    { labelKey: "kpi.onTimeDelivery", value: `${data.onTimeDelivery}%`, change: "+1.8%", positive: true },
    { labelKey: "kpi.safetyIncidents", value: String(data.safetyIncidents), change: "-4", positive: true },
    { labelKey: "kpi.totalTrips", value: data.totalTrips.toLocaleString(), change: "+126", positive: true },
    { labelKey: "kpi.avgFuelEfficiency", value: `${data.avgFuelEfficiency} KM/L`, change: "-0.3", positive: false },
  ]

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {kpis.map((kpi) => (
        <div
          key={kpi.labelKey}
          className="rounded border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900/40"
        >
          <span className="mb-1 block text-xs font-semibold text-zinc-800 dark:text-zinc-200">
            {t(kpi.labelKey)}
          </span>
          <span className="mb-2 block text-2xl font-bold text-zinc-900 dark:text-white">
            {kpi.value}
          </span>
          <span
            className={`text-xs font-medium ${
              kpi.positive ? "text-emerald-600" : "text-red-500"
            }`}
          >
            {kpi.change}
          </span>

          {kpi.bar && (
            <div className="mt-3 h-16">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyData}>
                  <XAxis dataKey="name" hide />
                  <YAxis hide />
                  <Bar dataKey="value" radius={[2, 2, 0, 0]}>
                    {dailyData.map((_, i) => (
                      <Cell
                        key={i}
                        fill={i === 3 ? "#0080FF" : "#e4e4e7"}
                        className="dark:fill-zinc-700"
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
