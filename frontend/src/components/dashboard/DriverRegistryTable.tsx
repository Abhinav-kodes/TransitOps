import { useState, useEffect, useCallback } from "react"
import { useTranslation } from "react-i18next"
import { ChevronDown, RefreshCw, Download } from "lucide-react"
import AddDriverDialog from "./AddDriverDialog"

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000"

interface Driver {
  id: number
  name: string
  license_no: string
  category: string
  expiry_date: string
  contact_no: string
  safety_score: number
  status: string
  license_url: string | null
}

const STATUS_COLOR: Record<string, string> = {
  "Available": "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  "On Trip": "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  "Off Duty": "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
  "Suspended": "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
}

export default function DriverRegistryTable() {
  const { t } = useTranslation()
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [statusFilter, setStatusFilter] = useState("all")
  const [search, setSearch] = useState("")

  const fetchDrivers = useCallback(async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem("transitops-token")
      const params = new URLSearchParams()
      if (statusFilter !== "all") params.set("status", statusFilter)

      const res = await fetch(`${API_URL}/api/fleet/drivers?${params}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (res.ok) {
        const data = await res.json()
        setDrivers(data)
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  useEffect(() => { fetchDrivers() }, [fetchDrivers])

  const filtered = drivers.filter((d) =>
    search === "" || d.name.toLowerCase().includes(search.toLowerCase()) || d.license_no.toLowerCase().includes(search.toLowerCase())
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
            <option value="all">{t("driverRegistry.statusAll")}</option>
            <option value="Available">{t("available")}</option>
            <option value="On Trip">{t("onTrip")}</option>
            <option value="Off Duty">{t("driverRegistry.offDuty")}</option>
            <option value="Suspended">{t("driverRegistry.suspended")}</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 size-3 -translate-y-1/2 text-zinc-400" />
        </div>

        <input
          type="text"
          placeholder={t("driverRegistry.searchPlaceholder")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-8 rounded border border-zinc-200 bg-white px-3 text-xs text-zinc-600 placeholder:text-zinc-400 focus:border-[#0080FF] focus:outline-none focus:ring-1 focus:ring-[#0080FF] dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:placeholder:text-zinc-500"
        />

        <button
          onClick={fetchDrivers}
          className="rounded border border-zinc-200 p-1.5 text-zinc-400 transition-colors hover:text-zinc-700 dark:border-zinc-700 dark:hover:text-zinc-300"
          title="Refresh"
        >
          <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
        </button>

        <button
          onClick={() => setDialogOpen(true)}
          className="ml-auto inline-flex items-center gap-1.5 rounded bg-[#0080FF] px-3.5 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[#006ce6]"
        >
          + {t("driverRegistry.addDriver")}
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-zinc-100 text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
              <th className="px-5 py-3 font-medium">{t("driverRegistry.name")}</th>
              <th className="px-5 py-3 font-medium">{t("driverRegistry.licenseNo")}</th>
              <th className="px-5 py-3 font-medium">{t("driverRegistry.category")}</th>
              <th className="px-5 py-3 font-medium">{t("driverRegistry.expiryDate")}</th>
              <th className="px-5 py-3 font-medium">{t("driverRegistry.contactNo")}</th>
              <th className="px-5 py-3 font-medium">{t("driverRegistry.safetyScore")}</th>
              <th className="px-5 py-3 font-medium">{t("registry.status")}</th>
              <th className="px-5 py-3 font-medium">{t("driverRegistry.license")}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="px-5 py-8 text-center text-zinc-400">
                  Loading...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-5 py-8 text-center text-zinc-400">
                  {t("driverRegistry.noDrivers")}
                </td>
              </tr>
            ) : (
              filtered.map((d) => (
                <tr
                  key={d.id}
                  className="border-b border-zinc-50 transition-colors hover:bg-zinc-50 dark:border-zinc-800/50 dark:hover:bg-zinc-800/30"
                >
                  <td className="px-5 py-3 font-medium text-zinc-900 dark:text-white">{d.name}</td>
                  <td className="px-5 py-3 text-zinc-600 dark:text-zinc-300">{d.license_no}</td>
                  <td className="px-5 py-3 text-zinc-600 dark:text-zinc-300">{d.category}</td>
                  <td className="px-5 py-3 text-zinc-600 dark:text-zinc-300">{d.expiry_date}</td>
                  <td className="px-5 py-3 text-zinc-600 dark:text-zinc-300">{d.contact_no}</td>
                  <td className="px-5 py-3 text-zinc-600 dark:text-zinc-300">{d.safety_score}</td>
                  <td className="px-5 py-3">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_COLOR[d.status] || STATUS_COLOR["Available"]}`}>
                      {d.status}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    {d.license_url ? (
                      <a
                        href={`${API_URL}/api/documents/file/${d.license_url}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[#0080FF] transition-colors hover:text-[#006ce6]"
                        title="Download license"
                      >
                        <Download className="size-3.5" />
                        <span className="text-[10px] font-medium">View</span>
                      </a>
                    ) : (
                      <span className="text-[10px] text-zinc-400">-</span>
                    )}
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
          {t("driverRegistry.systemNote")}
        </p>
      </div>

      <AddDriverDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onCreated={fetchDrivers}
      />
    </div>
  )
}
