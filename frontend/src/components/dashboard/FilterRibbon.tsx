import { useState } from "react"
import { useTranslation } from "react-i18next"
import { ChevronDown } from "lucide-react"

export interface DashboardFilters {
  vehicleType: string
  status: string
  region: string
}

interface FilterRibbonProps {
  onFilterChange?: (filters: DashboardFilters) => void
}

export default function FilterRibbon({ onFilterChange }: FilterRibbonProps) {
  const { t } = useTranslation()
  const [vehicleType, setVehicleType] = useState("all")
  const [status, setStatus] = useState("all")
  const [region, setRegion] = useState("all")

  const handleTypeChange = (val: string) => {
    setVehicleType(val)
    onFilterChange?.({ vehicleType: val, status, region })
  }

  const handleStatusChange = (val: string) => {
    setStatus(val)
    onFilterChange?.({ vehicleType, status: val, region })
  }

  const handleRegionChange = (val: string) => {
    setRegion(val)
    onFilterChange?.({ vehicleType, status, region: val })
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Vehicle Type Filter */}
      <div className="relative">
        <select
          value={vehicleType}
          onChange={(e) => handleTypeChange(e.target.value)}
          className="appearance-none rounded border border-zinc-200 bg-white py-1.5 pl-3 pr-8 text-xs text-zinc-600 transition-colors hover:border-zinc-300 focus:border-[#0080FF] focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-zinc-600"
        >
          <option value="all">{t("filters.allTypes")}</option>
          <option value="Truck">Truck</option>
          <option value="Van">Van</option>
          <option value="Mini">Mini</option>
        </select>
        <ChevronDown className="pointer-events-none absolute right-2 top-1/2 size-3 -translate-y-1/2 text-zinc-400" />
      </div>

      {/* Vehicle Status Filter */}
      <div className="relative">
        <select
          value={status}
          onChange={(e) => handleStatusChange(e.target.value)}
          className="appearance-none rounded border border-zinc-200 bg-white py-1.5 pl-3 pr-8 text-xs text-zinc-600 transition-colors hover:border-zinc-300 focus:border-[#0080FF] focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-zinc-600"
        >
          <option value="all">All Statuses</option>
          <option value="Available">Available</option>
          <option value="On Trip">On Trip</option>
          <option value="In Shop">In Shop</option>
          <option value="Retired">Retired</option>
        </select>
        <ChevronDown className="pointer-events-none absolute right-2 top-1/2 size-3 -translate-y-1/2 text-zinc-400" />
      </div>

      {/* Region Filter */}
      <div className="relative">
        <select
          value={region}
          onChange={(e) => handleRegionChange(e.target.value)}
          className="appearance-none rounded border border-zinc-200 bg-white py-1.5 pl-3 pr-8 text-xs text-zinc-600 transition-colors hover:border-zinc-300 focus:border-[#0080FF] focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-zinc-600"
        >
          <option value="all">All Regions</option>
          <option value="North">North</option>
          <option value="South">South</option>
          <option value="East">East</option>
          <option value="West">West</option>
        </select>
        <ChevronDown className="pointer-events-none absolute right-2 top-1/2 size-3 -translate-y-1/2 text-zinc-400" />
      </div>
    </div>
  )
}
