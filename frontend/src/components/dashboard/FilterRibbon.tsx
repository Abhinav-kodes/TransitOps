import { useTranslation } from "react-i18next"
import { ChevronDown } from "lucide-react"

export default function FilterRibbon() {
  const { t } = useTranslation()

  const filters = [
    { labelKey: "filters.region", options: ["filters.allRegions", "North", "South", "East", "West"] },
    { labelKey: "filters.vehicleType", options: ["filters.allTypes", "Truck", "Van", "Trailer", "Tanker"] },
    { labelKey: "filters.dateRange", options: ["filters.allDates", "filters.last7days", "filters.last30days", "filters.last90days"] },
  ]

  return (
    <div className="flex flex-wrap items-center gap-3">
      {filters.map((f) => (
        <div key={f.labelKey} className="relative">
          <select className="appearance-none rounded border border-zinc-200 bg-white py-1.5 pl-3 pr-8 text-xs text-zinc-600 transition-colors hover:border-zinc-300 focus:border-[#0080FF] focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-zinc-600">
            {f.options.map((o) => (
              <option key={o} value={o}>{t(o)}</option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 size-3 -translate-y-1/2 text-zinc-400" />
        </div>
      ))}
    </div>
  )
}
