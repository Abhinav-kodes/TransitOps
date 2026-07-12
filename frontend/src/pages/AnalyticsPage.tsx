import { useState, useEffect } from "react"
import { useTranslation } from "react-i18next"
import { Loader2, TrendingUp, AlertCircle, RefreshCw } from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts"

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000"

interface DailyUtilization {
  name: string
  value: number
}

interface MonthlyRevenue {
  month: string
  revenue: number
}

interface CostliestVehicle {
  name: string
  cost: number
}

interface AnalyticsData {
  fleet_utilization: number
  on_time_delivery: number
  safety_incidents: number
  total_trips: number
  avg_fuel_efficiency: number
  vehicle_status_counts: Record<string, number>
  daily_utilization: DailyUtilization[]
  operational_cost: number
  vehicle_roi: number
  monthly_revenue: MonthlyRevenue[]
  top_costliest_vehicles: CostliestVehicle[]
}

const BAR_COLORS = [
  "bg-rose-500 dark:bg-rose-500",      // Pink/red for TRUCK-11
  "bg-amber-500 dark:bg-amber-500",    // Orange for MINI-03
  "bg-sky-500 dark:bg-sky-500",        // Blue for VAN-05
  "bg-emerald-500 dark:bg-emerald-500",  // Emerald
  "bg-indigo-500 dark:bg-indigo-500",    // Indigo
]

export default function AnalyticsPage() {
  const { t } = useTranslation()
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAnalytics = async () => {
    setLoading(true)
    setError(null)
    try {
      const token = localStorage.getItem("transitops-token")
      const headers = {
        "Content-Type": "application/json",
        ...(token && token !== "skip-mode" ? { Authorization: `Bearer ${token}` } : {}),
      }
      const res = await fetch(`${API_URL}/api/analytics/dashboard`, { headers })
      if (!res.ok) throw new Error("Failed to load analytics dashboard data.")
      const result = await res.json()
      setData(result)
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAnalytics()
  }, [])

  if (loading) {
    return (
      <div className="flex min-h-[500px] flex-col items-center justify-center text-zinc-400">
        <Loader2 className="size-8 animate-spin text-[#0080FF]" />
        <p className="mt-2 text-sm">Aggregating platform metrics & costs...</p>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="flex items-center gap-3 rounded-lg bg-red-50 p-4 text-sm font-medium text-red-700 border border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800">
          <AlertCircle className="size-5 shrink-0" />
          <span>{error || "Failed to load report."}</span>
          <button
            onClick={fetchAnalytics}
            className="ml-auto flex items-center gap-1 text-xs underline font-semibold text-red-700 dark:text-red-400"
          >
            <RefreshCw className="size-3" /> Retry
          </button>
        </div>
      </div>
    )
  }

  // Calculate maximum cost for scaling the progress bars of costliest vehicles
  const maxVehicleCost = data.top_costliest_vehicles.length > 0
    ? Math.max(...data.top_costliest_vehicles.map((v) => v.cost))
    : 1

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      {/* Page Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-white">
            Reports & Analytics
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Real-time operational KPIs, fuel efficiency, ROI index, and fleet expenditure analysis.
          </p>
        </div>
        <button
          onClick={fetchAnalytics}
          className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900"
        >
          <RefreshCw className="size-3.5" />
          Refresh Report
        </button>
      </div>

      {/* KPI Grid (Mockup top boxes) */}
      <div className="mb-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        
        {/* KPI: Fuel Efficiency */}
        <div className="relative overflow-hidden rounded-lg border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#0080FF]" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
            Fuel Efficiency
          </span>
          <div className="mt-2.5 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-zinc-900 dark:text-white">
              {data.avg_fuel_efficiency}
            </span>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">km/l</span>
          </div>
        </div>

        {/* KPI: Fleet Utilization */}
        <div className="relative overflow-hidden rounded-lg border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
            Fleet Utilization
          </span>
          <div className="mt-2.5 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-zinc-900 dark:text-white">
              {data.fleet_utilization}
            </span>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">%</span>
          </div>
        </div>

        {/* KPI: Operational Cost */}
        <div className="relative overflow-hidden rounded-lg border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-500" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
            Operational Cost
          </span>
          <div className="mt-2.5 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-zinc-900 dark:text-white">
              ₹{data.operational_cost.toLocaleString()}
            </span>
          </div>
        </div>

        {/* KPI: Vehicle ROI */}
        <div className="relative overflow-hidden rounded-lg border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
            Vehicle ROI
          </span>
          <div className="mt-2.5 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-zinc-900 dark:text-white">
              {data.vehicle_roi}%
            </span>
          </div>
          <p className="mt-2 text-[9px] text-zinc-400 dark:text-zinc-500">
            ROI = (Revenue - (Maintenance + Fuel)) / Acquisition Cost
          </p>
        </div>

      </div>

      {/* Main Charts & Breakdown row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        
        {/* Left Side: Monthly Revenue Chart */}
        <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 lg:col-span-7">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                Monthly Revenue
              </h3>
              <p className="mt-1 text-[11px] text-zinc-500">
                Gross billing calculated from completed dispatch distances.
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="size-3.5" />
              <span>Active Period</span>
            </div>
          </div>

          <div className="h-[320px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.monthly_revenue} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" className="dark:stroke-zinc-800/60" />
                <XAxis
                  dataKey="month"
                  tickLine={false}
                  axisLine={false}
                  fontSize={11}
                  tickMargin={8}
                  stroke="#a1a1aa"
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  fontSize={11}
                  tickMargin={8}
                  stroke="#a1a1aa"
                  tickFormatter={(val) => `₹${val.toLocaleString()}`}
                />
                <Tooltip
                  cursor={{ fill: "rgba(0, 128, 255, 0.05)" }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="rounded border border-zinc-200 bg-white p-3 shadow-md dark:border-zinc-800 dark:bg-zinc-900">
                          <p className="text-[10px] font-bold text-zinc-400 uppercase">{payload[0].payload.month}</p>
                          <p className="mt-1 text-xs font-bold text-[#0080FF]">
                            Revenue: ₹{payload[0].value?.toLocaleString()}
                          </p>
                        </div>
                      )
                    }
                    return null
                  }}
                />
                <Bar
                  dataKey="revenue"
                  fill="#0080FF"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={50}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right Side: Top Costliest Vehicles list with custom progress tracks */}
        <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 lg:col-span-5">
          <div className="mb-6">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
              Top Costliest Vehicles
            </h3>
            <p className="mt-1 text-[11px] text-zinc-500">
              Vehicles incurring the highest combined maintenance logs and fuel logs.
            </p>
          </div>

          <div className="space-y-6 pt-2">
            {data.top_costliest_vehicles.map((veh, i) => {
              const colorClass = BAR_COLORS[i % BAR_COLORS.length]
              const percent = Math.max(5, (veh.cost / maxVehicleCost) * 100)
              
              return (
                <div key={veh.name} className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-zinc-800 dark:text-zinc-200 truncate pr-4">
                      {veh.name}
                    </span>
                    <span className="text-zinc-600 dark:text-zinc-400 shrink-0 font-mono">
                      ₹{veh.cost.toLocaleString()}
                    </span>
                  </div>
                  
                  {/* Custom progress track */}
                  <div className="h-3 w-full overflow-hidden rounded bg-zinc-100 dark:bg-zinc-800/80">
                    <div
                      className={`h-full rounded transition-all duration-500 ${colorClass}`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

      </div>
    </div>
  )
}
