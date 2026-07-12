import { useState } from "react"
import { useTranslation } from "react-i18next"
import FilterRibbon, { DashboardFilters } from "@/components/dashboard/FilterRibbon"
import KpiGrid from "@/components/dashboard/KpiGrid"
import RecentTrips from "@/components/dashboard/RecentTrips"
import VehicleStatus from "@/components/dashboard/VehicleStatus"

export default function DashboardPage() {
  const { t } = useTranslation()
  const [filters, setFilters] = useState<DashboardFilters>({ vehicleType: "all", dateRange: "all" })

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <div className="mb-6">
        <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-white">
          {t("dashboard.title")}
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          {t("dashboard.subtitle")}
        </p>
      </div>

      <div className="mb-6">
        <FilterRibbon onFilterChange={setFilters} />
      </div>

      <div className="mb-6">
        <KpiGrid filters={filters} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <RecentTrips filters={filters} />
        </div>
        <div>
          <VehicleStatus filters={filters} />
        </div>
      </div>
    </div>
  )
}
