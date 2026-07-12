import { useState } from "react"
import { useTranslation } from "react-i18next"
import { Database, AlertCircle, CheckCircle2, Loader2 } from "lucide-react"
import { useAuth } from "@/lib/auth"

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000"

interface SeedResult {
  message: string
  data: {
    users: number
    vehicles: number
    drivers: number
    trips: number
    fuel_logs: number
    expenses: number
    maintenance_logs: number
  }
}

export default function SettingsPage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<SeedResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const isAdmin = user?.role === "Admin"

  const handleSeed = async () => {
    if (!confirm("This will populate the database with demo data. Continue?")) return
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const token = localStorage.getItem("transitops-token")
      const res = await fetch(`${API_URL}/api/admin/seed`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token && token !== "skip-mode" ? { Authorization: `Bearer ${token}` } : {}),
        },
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.detail || "Failed to seed database.")
      }
      setResult(data)
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.")
    } finally {
      setLoading(false)
    }
  }

  if (!isAdmin) {
    return (
      <div className="p-8">
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-white">{t("sidebar.settings")}</h1>
        <p className="mt-2 text-sm text-zinc-500">Only administrators can access these settings.</p>
      </div>
    )
  }

  return (
    <div className="p-8">
      <h1 className="text-lg font-semibold text-zinc-900 dark:text-white">{t("sidebar.settings")}</h1>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        System configuration and data management for TransitOps.
      </p>

      <div className="mt-8 max-w-xl space-y-6">

        {/* Seed Database Card */}
        <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/40">
          <div className="flex items-start gap-4">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#0080FF]/10">
              <Database className="size-5 text-[#0080FF]" />
            </div>
            <div className="flex-1">
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">
                Seed Demo Data
              </h2>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                Populate the database with realistic vehicles, drivers, trips, fuel logs, expenses, and maintenance records for demonstration purposes. Requires an empty database.
              </p>

              {error && (
                <div className="mt-4 flex items-center gap-2 rounded bg-red-50 p-3 text-xs font-medium text-red-700 border border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800">
                  <AlertCircle className="size-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {result && (
                <div className="mt-4 rounded bg-emerald-50 p-4 text-xs text-emerald-700 border border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800">
                  <div className="mb-2 flex items-center gap-2 font-semibold">
                    <CheckCircle2 className="size-4" />
                    <span>{result.message}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 pl-6">
                    {Object.entries(result.data).map(([key, val]) => (
                      <div key={key}>
                        <span className="capitalize">{key.replace(/_/g, " ")}:</span>{" "}
                        <span className="font-semibold">{val}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={handleSeed}
                disabled={loading}
                className="mt-4 inline-flex items-center gap-2 rounded bg-[#0080FF] px-4 py-2 text-xs font-medium text-white hover:bg-[#006ce6] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    Seeding...
                  </>
                ) : (
                  <>
                    <Database className="size-3.5" />
                    Seed Database
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Seed Credentials Card */}
        <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/40">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">
            Demo Login Credentials
          </h2>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            After seeding, use these credentials to log in as different roles.
          </p>
          <div className="mt-4 overflow-hidden rounded border border-zinc-200 dark:border-zinc-700">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-zinc-50 dark:bg-zinc-800">
                  <th className="px-3 py-2 text-left font-medium text-zinc-600 dark:text-zinc-400">Email</th>
                  <th className="px-3 py-2 text-left font-medium text-zinc-600 dark:text-zinc-400">Password</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {[
                  { email: "admin@transitops.in", password: "admin123", role: "Admin" },
                  { email: "fleet@transitops.in", password: "fleet123", role: "Fleet Manager" },
                  { email: "dispatch@transitops.in", password: "dispatch123", role: "Dispatcher" },
                  { email: "driver1@transitops.in", password: "driver123", role: "Driver" },
                  { email: "safety@transitops.in", password: "safety123", role: "Safety Officer" },
                  { email: "finance@transitops.in", password: "finance123", role: "Financial Analyst" },
                ].map((c) => (
                  <tr key={c.email} className="bg-white dark:bg-zinc-900/40">
                    <td className="px-3 py-2 font-mono text-zinc-900 dark:text-zinc-100">{c.email}</td>
                    <td className="px-3 py-2 font-mono text-zinc-600 dark:text-zinc-400">{c.password}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
