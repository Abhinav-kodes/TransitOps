import { useState, useEffect, useCallback } from "react"
import { useTranslation } from "react-i18next"
import { ChevronDown, RefreshCw } from "lucide-react"
import AddMaintenanceDialog from "./AddMaintenanceDialog"

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000"

interface Vehicle {
  id: number
  reg_no: string
  name_model: string
}

const STATUS_COLOR: Record<string, string> = {
  "Active": "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  "Completed": "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
}

export default function MaintenanceRegistryTable() {
  const { t } = useTranslation()
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [statusFilter, setStatusFilter] = useState("all")
  const [search, setSearch] = useState("")

  const fetchVehicles = useCallback(async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem("transitops-token")
      const res = await fetch(`${API_URL}/api/fleet/vehicles`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (res.ok) {
        const data = await res.json()
        setVehicles(data)
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchVehicles() }, [fetchVehicles])

  const filtered = vehicles.filter((v) =>
    search === "" || v.reg_no.toLowerCase().includes(search.toLowerCase()) || v.name_model.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="rounded border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900/40">
      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3 border-b border-zinc-100 px-5 py-4 dark:border-zinc-800">
        <div className="relative">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="appearance-none rounded border border-zinc-200 bg-white py-1.5 pl-3 pr-8 text-xs text-zinc-600 transition-colors hover:border-zinc-300 focus:border-[#0080FF] focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-zinc-600"
          >
            <option value="all">{t("maintenanceRegistry.statusAll")}</option>
            <option value="Active">{t("maintenanceRegistry.active")}</option>
            <option value="Completed">{t("maintenanceRegistry.completed")}</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 size-3 -translate-y-1/2 text-zinc-400" />
        </div>

        <input
          type="text"
          placeholder={t("maintenanceRegistry.searchPlaceholder")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-8 rounded border border-zinc-200 bg-white px-3 text-xs text-zinc-600 placeholder:text-zinc-400 focus:border-[#0080FF] focus:outline-none focus:ring-1 focus:ring-[#0080FF] dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:placeholder:text-zinc-500"
        />

        <button
          onClick={fetchVehicles}
          className="rounded border border-zinc-200 p-1.5 text-zinc-400 transition-colors hover:text-zinc-700 dark:border-zinc-700 dark:hover:text-zinc-300"
          title="Refresh"
        >
          <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
        </button>

        <button
          onClick={() => setDialogOpen(true)}
          className="ml-auto inline-flex items-center gap-1.5 rounded bg-[#0080FF] px-3.5 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[#006ce6]"
        >
          + {t("maintenanceRegistry.addMaintenance")}
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-zinc-100 text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
              <th className="px-5 py-3 font-medium">{t("maintenanceRegistry.vehicle")}</th>
              <th className="px-5 py-3 font-medium">{t("maintenanceRegistry.serviceType")}</th>
              <th className="px-5 py-3 font-medium">{t("maintenanceRegistry.cost")}</th>
              <th className="px-5 py-3 font-medium">{t("maintenanceRegistry.entryDate")}</th>
              <th className="px-5 py-3 font-medium">{t("maintenanceRegistry.status")}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-zinc-400">
                  Loading...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-zinc-400">
                  {t("maintenanceRegistry.noRecords")}
                </td>
              </tr>
            ) : (
              filtered.map((v) => (
                <tr
                  key={v.id}
                  className="border-b border-zinc-50 transition-colors hover:bg-zinc-50 dark:border-zinc-800/50 dark:hover:bg-zinc-800/30"
                >
                  <td className="px-5 py-3 font-medium text-zinc-900 dark:text-white">{v.reg_no}</td>
                  <td className="px-5 py-3 text-zinc-600 dark:text-zinc-300">{v.name_model}</td>
                  <td className="px-5 py-3 text-zinc-600 dark:text-zinc-300">—</td>
                  <td className="px-5 py-3 text-zinc-600 dark:text-zinc-300">—</td>
                  <td className="px-5 py-3">
                    <span className="inline-block rounded-full px-2 py-0.5 text-[10px] font-medium bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                      —
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* System Note */}
      <div className="border-t border-zinc-100 px-5 py-3 dark:border-zinc-800">
        <p className="text-[11px] text-zinc-400 dark:text-zinc-500">
          {t("maintenanceRegistry.systemNote")}
        </p>
      </div>

      <AddMaintenanceDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onCreated={fetchVehicles}
      />
    </div>
  )
}
