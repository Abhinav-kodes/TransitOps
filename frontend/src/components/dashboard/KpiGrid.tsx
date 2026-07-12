import { useState, useEffect } from "react"
import type { DashboardFilters } from "./FilterRibbon"

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000"

interface KpiGridProps {
  filters?: DashboardFilters
}

export default function KpiGrid({ filters }: KpiGridProps) {
  const [data, setData] = useState({
    activeVehicles: 0,
    availableVehicles: 0,
    vehiclesInMaintenance: 0,
    activeTrips: 0,
    pendingTrips: 0,
    driversOnDuty: 0,
    fleetUtilization: 0,
  })

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const token = localStorage.getItem("transitops-token")
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
          ...(token && token !== "skip-mode" ? { Authorization: `Bearer ${token}` } : {}),
        }
        const params = new URLSearchParams()
        if (filters) {
          if (filters.vehicleType) params.append("vehicleType", filters.vehicleType)
          if (filters.status) params.append("status", filters.status)
          if (filters.region) params.append("region", filters.region)
        }
        const res = await fetch(`${API_URL}/api/analytics/dashboard?${params.toString()}`, { headers })
        if (res.ok) {
          const result = await res.json()
          setData({
            activeVehicles: result.active_vehicles ?? 0,
            availableVehicles: result.available_vehicles ?? 0,
            vehiclesInMaintenance: result.vehicles_in_maintenance ?? 0,
            activeTrips: result.active_trips ?? 0,
            pendingTrips: result.pending_trips ?? 0,
            driversOnDuty: result.drivers_on_duty ?? 0,
            fleetUtilization: result.fleet_utilization ?? 0,
          })
        }
      } catch (err) {
        console.error("Failed to load dashboard KPIs:", err)
      }
    }
    fetchAnalytics()
  }, [filters])

  const formatNumber = (num: number) => {
    return num < 10 ? `0${num}` : String(num)
  }

  const kpis = [
    {
      label: "Active Vehicles",
      value: formatNumber(data.activeVehicles),
      colorClass: "border-l-4 border-l-[#0080FF] dark:border-l-[#0080FF]",
    },
    {
      label: "Available Vehicles",
      value: formatNumber(data.availableVehicles),
      colorClass: "border-l-4 border-l-[#10b981] dark:border-l-[#10b981]",
    },
    {
      label: "Vehicles in Maintenance",
      value: formatNumber(data.vehiclesInMaintenance),
      colorClass: "border-l-4 border-l-[#f59e0b] dark:border-l-[#f59e0b]",
    },
    {
      label: "Active Trips",
      value: formatNumber(data.activeTrips),
      colorClass: "border-l-4 border-l-[#0080FF] dark:border-l-[#0080FF]",
    },
    {
      label: "Pending Trips",
      value: formatNumber(data.pendingTrips),
      colorClass: "border-l-4 border-l-[#0080FF] dark:border-l-[#0080FF]",
    },
    {
      label: "Drivers on Duty",
      value: formatNumber(data.driversOnDuty),
      colorClass: "border-l-4 border-l-[#10b981] dark:border-l-[#10b981]",
    },
    {
      label: "Fleet Utilization",
      value: `${Math.round(data.fleetUtilization)}%`,
      colorClass: "border-l-4 border-l-[#10b981] dark:border-l-[#10b981]",
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7">
      {kpis.map((kpi, idx) => (
        <div
          key={idx}
          className={`relative overflow-hidden rounded border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/40 ${kpi.colorClass}`}
        >
          <span className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 truncate">
            {kpi.label}
          </span>
          <span className="mt-2 block text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
            {kpi.value}
          </span>
        </div>
      ))}
    </div>
  )
}
