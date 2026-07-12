import { useState } from "react"
import { useTranslation } from "react-i18next"
import { ChevronDown } from "lucide-react"

export interface DashboardFilters {
  vehicleType: string
  dateRange: string
}

interface FilterRibbonProps {
  onFilterChange?: (filters: DashboardFilters) => void
}

export default function FilterRibbon({ onFilterChange }: FilterRibbonProps) {
  const { t } = useTranslation()
  const [vehicleType, setVehicleType] = useState("all")
  const [dateRange, setDateRange] = useState("all")

  const handleTypeChange = (val: string) => {
    setVehicleType(val)
    onFilterChange?.({ vehicleType: val, dateRange })
  }

  const handleDateChange = (val: string) => {
    setDateRange(val)
    onFilterChange?.({ vehicleType, dateRange: val })
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
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

      <div className="relative">
        <select
          value={dateRange}
          onChange={(e) => handleDateChange(e.target.value)}
          className="appearance-none rounded border border-zinc-200 bg-white py-1.5 pl-3 pr-8 text-xs text-zinc-600 transition-colors hover:border-zinc-300 focus:border-[#0080FF] focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-zinc-600"
        >
          <option value="all">{t("filters.allDates")}</option>
          <option value="7">{t("filters.last7days")}</option>
          <option value="30">{t("filters.last30days")}</option>
          <option value="90">{t("filters.last90days")}</option>
        </select>
        <ChevronDown className="pointer-events-none absolute right-2 top-1/2 size-3 -translate-y-1/2 text-zinc-400" />
      </div>
    </div>
  )
}
