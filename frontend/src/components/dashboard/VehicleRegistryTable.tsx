import { useState, useEffect, useCallback } from "react"
import { useTranslation } from "react-i18next"
import { ChevronDown, Loader2, RefreshCw } from "lucide-react"
import AddVehicleDialog from "./AddVehicleDialog"

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000"

interface Vehicle {
  id: number
  reg_no: string
  name_model: string
  type: string
  capacity_kg: number
  odometer: number
  acq_cost: number
  status: "Available" | "On Trip" | "In Shop" | "Retired"
}

const STATUS_COLOR: Record<string, string> = {
  "Available": "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  "On Trip": "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  "In Shop": "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  "Retired": "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
}

function formatNumber(n: number): string {
  return n.toLocaleString("en-IN")
}

export default function VehicleRegistryTable() {
  const { t } = useTranslation()

  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [typeFilter, setTypeFilter] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)

  const fetchVehicles = useCallback(async () => {
    setLoading(true)
    setError(null)

    const params = new URLSearchParams()
    if (typeFilter) params.set("type", typeFilter)
    if (statusFilter) params.set("status", statusFilter)
    if (searchQuery.trim()) params.set("search", searchQuery.trim())

    const token = localStorage.getItem("transitops-token")

    try {
      const res = await fetch(`${API_URL}/api/fleet/vehicles?${params.toString()}`, {
        headers: {
          ...(token && token !== "skip-mode" ? { Authorization: `Bearer ${token}` } : {}),
        },
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data: Vehicle[] = await res.json()
      setVehicles(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load vehicles")
    } finally {
      setLoading(false)
    }
  }, [typeFilter, statusFilter, searchQuery])

  useEffect(() => {
    const debounce = setTimeout(fetchVehicles, 300)
    return () => clearTimeout(debounce)
  }, [fetchVehicles])

  return (
    <div className="rounded border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900/40">
      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3 border-b border-zinc-100 px-5 py-4 dark:border-zinc-800">
        <div className="relative">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="appearance-none rounded border border-zinc-200 bg-white py-1.5 pl-3 pr-8 text-xs text-zinc-600 transition-colors hover:border-zinc-300 focus:border-[#0080FF] focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-zinc-600"
          >
            <option value="">{t("registry.typeAll")}</option>
            <option value="Van">Van</option>
            <option value="Truck">Truck</option>
            <option value="Mini">Mini</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 size-3 -translate-y-1/2 text-zinc-400" />
        </div>

        <div className="relative">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="appearance-none rounded border border-zinc-200 bg-white py-1.5 pl-3 pr-8 text-xs text-zinc-600 transition-colors hover:border-zinc-300 focus:border-[#0080FF] focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-zinc-600"
          >
            <option value="">{t("registry.statusAll")}</option>
            <option value="Available">{t("vehicleStatus")}: Available</option>
            <option value="On Trip">{t("vehicleStatus")}: On Trip</option>
            <option value="In Shop">{t("vehicleStatus")}: In Shop</option>
            <option value="Retired">{t("vehicleStatus")}: Retired</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 size-3 -translate-y-1/2 text-zinc-400" />
        </div>

        <input
          type="text"
          placeholder={t("registry.searchPlaceholder")}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-8 rounded border border-zinc-200 bg-white px-3 text-xs text-zinc-600 placeholder:text-zinc-400 focus:border-[#0080FF] focus:outline-none focus:ring-1 focus:ring-[#0080FF] dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:placeholder:text-zinc-500"
        />

        <button
          onClick={() => setDialogOpen(true)}
          className="ml-auto inline-flex items-center gap-1.5 rounded bg-[#0080FF] px-3.5 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[#006ce6]"
        >
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
            {loading ? (
              <tr>
                <td colSpan={7} className="px-5 py-12 text-center">
                  <Loader2 className="mx-auto size-5 animate-spin text-zinc-400" />
                  <p className="mt-2 text-xs text-zinc-500">Loading vehicles...</p>
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={7} className="px-5 py-12 text-center">
                  <p className="text-xs text-red-500">{error}</p>
                </td>
              </tr>
            ) : vehicles.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-5 py-12 text-center">
                  <p className="text-xs text-zinc-500">No vehicles found.</p>
                </td>
              </tr>
            ) : (
              vehicles.map((v) => (
                <tr
                  key={v.id}
                  className="border-b border-zinc-50 transition-colors hover:bg-zinc-50 dark:border-zinc-800/50 dark:hover:bg-zinc-800/30"
                >
                  <td className="px-5 py-3 font-medium text-zinc-900 dark:text-white">{v.reg_no}</td>
                  <td className="px-5 py-3 text-zinc-600 dark:text-zinc-300">{v.name_model}</td>
                  <td className="px-5 py-3 text-zinc-600 dark:text-zinc-300">{v.type}</td>
                  <td className="px-5 py-3 text-zinc-600 dark:text-zinc-300">{formatNumber(v.capacity_kg)} kg</td>
                  <td className="px-5 py-3 text-zinc-600 dark:text-zinc-300">{formatNumber(v.odometer)}</td>
                  <td className="px-5 py-3 text-zinc-600 dark:text-zinc-300">{formatNumber(v.acq_cost)}</td>
                  <td className="px-5 py-3">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_COLOR[v.status]}`}>
                      {v.status}
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
          {t("registry.systemNote")}
        </p>
      </div>

      <AddVehicleDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onCreated={fetchVehicles}
      />
    </div>
  )
}
