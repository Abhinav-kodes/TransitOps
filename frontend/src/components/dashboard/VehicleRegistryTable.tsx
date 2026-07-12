import { useTranslation } from "react-i18next"
import { ChevronDown } from "lucide-react"

const VEHICLES = [
  { regNo: "GJ01AB4521", name: "VAN-05", type: "Van", capacity: "500 kg", odometer: "74,000", acqCost: "6,20,000", status: "Available" },
  { regNo: "GJ01AB9921", name: "TRUCK-11", type: "Truck", capacity: "5 Ton", odometer: "182,000", acqCost: "24,50,000", status: "On Trip" },
  { regNo: "GJ01AB1120", name: "MINI-03", type: "Mini", capacity: "1 Ton", odometer: "66,000", acqCost: "4,10,000", status: "In Shop" },
  { regNo: "GJ01AB0018", name: "VAN-09", type: "Van", capacity: "750 kg", odometer: "2,41,900", acqCost: "5,90,000", status: "Retired" },
]

const STATUS_COLOR: Record<string, string> = {
  "Available": "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  "On Trip": "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  "In Shop": "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  "Retired": "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
}

export default function VehicleRegistryTable() {
  const { t } = useTranslation()

  return (
    <div className="rounded border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900/40">
      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3 border-b border-zinc-100 px-5 py-4 dark:border-zinc-800">
        <div className="relative">
          <select className="appearance-none rounded border border-zinc-200 bg-white py-1.5 pl-3 pr-8 text-xs text-zinc-600 transition-colors hover:border-zinc-300 focus:border-[#0080FF] focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-zinc-600">
            <option>{t("registry.typeAll")}</option>
            <option>Van</option>
            <option>Truck</option>
            <option>Mini</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 size-3 -translate-y-1/2 text-zinc-400" />
        </div>

        <div className="relative">
          <select className="appearance-none rounded border border-zinc-200 bg-white py-1.5 pl-3 pr-8 text-xs text-zinc-600 transition-colors hover:border-zinc-300 focus:border-[#0080FF] focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-zinc-600">
            <option>{t("registry.statusAll")}</option>
            <option>{t("vehicleStatus")}: Available</option>
            <option>{t("vehicleStatus")}: On Trip</option>
            <option>{t("vehicleStatus")}: In Shop</option>
            <option>{t("vehicleStatus")}: Retired</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 size-3 -translate-y-1/2 text-zinc-400" />
        </div>

        <input
          type="text"
          placeholder={t("registry.searchPlaceholder")}
          className="h-8 rounded border border-zinc-200 bg-white px-3 text-xs text-zinc-600 placeholder:text-zinc-400 focus:border-[#0080FF] focus:outline-none focus:ring-1 focus:ring-[#0080FF] dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:placeholder:text-zinc-500"
        />

        <button className="ml-auto inline-flex items-center gap-1.5 rounded bg-[#0080FF] px-3.5 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[#006ce6]">
          + {t("registry.addVehicle")}
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-zinc-100 text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
              <th className="px-5 py-3 font-medium">{t("registry.regNo")}</th>
              <th className="px-5 py-3 font-medium">{t("registry.nameModel")}</th>
              <th className="px-5 py-3 font-medium">{t("registry.type")}</th>
              <th className="px-5 py-3 font-medium">{t("registry.capacity")}</th>
              <th className="px-5 py-3 font-medium">{t("registry.odometer")}</th>
              <th className="px-5 py-3 font-medium">{t("registry.acqCost")}</th>
              <th className="px-5 py-3 font-medium">{t("registry.status")}</th>
            </tr>
          </thead>
          <tbody>
            {VEHICLES.map((v) => (
              <tr
                key={v.regNo}
                className="border-b border-zinc-50 transition-colors hover:bg-zinc-50 dark:border-zinc-800/50 dark:hover:bg-zinc-800/30"
              >
                <td className="px-5 py-3 font-medium text-zinc-900 dark:text-white">{v.regNo}</td>
                <td className="px-5 py-3 text-zinc-600 dark:text-zinc-300">{v.name}</td>
                <td className="px-5 py-3 text-zinc-600 dark:text-zinc-300">{v.type}</td>
                <td className="px-5 py-3 text-zinc-600 dark:text-zinc-300">{v.capacity}</td>
                <td className="px-5 py-3 text-zinc-600 dark:text-zinc-300">{v.odometer}</td>
                <td className="px-5 py-3 text-zinc-600 dark:text-zinc-300">{v.acqCost}</td>
                <td className="px-5 py-3">
                  <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_COLOR[v.status]}`}>
                    {v.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* System Note */}
      <div className="border-t border-zinc-100 px-5 py-3 dark:border-zinc-800">
        <p className="text-[11px] text-zinc-400 dark:text-zinc-500">
          {t("registry.systemNote")}
        </p>
      </div>
    </div>
  )
}
