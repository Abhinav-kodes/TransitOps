import { useState, useEffect, useCallback } from "react"
import { useTranslation } from "react-i18next"
import AddFuelDialog from "./AddFuelDialog"
import AddExpenseDialog from "./AddExpenseDialog"

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000"

interface FuelLog {
  id: number
  vehicle_id: number
  vehicle_name: string | null
  date: string
  liters: number
  fuel_cost: number
  fuel_bill_url: string | null
}

interface Expense {
  id: number
  vehicle_id: number
  vehicle_name: string | null
  trip_id: number | null
  trip_code: string | null
  toll: number
  other: number
  total_cost: number
  expense_bill_url: string | null
}

export default function FuelExpensesContent() {
  const { t } = useTranslation()
  const [fuelDialogOpen, setFuelDialogOpen] = useState(false)
  const [expenseDialogOpen, setExpenseDialogOpen] = useState(false)
  const [fuelLogs, setFuelLogs] = useState<FuelLog[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem("transitops-token")
      const authHeaders: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {}
      const [fuelRes, expenseRes] = await Promise.all([
        fetch(`${API_URL}/api/finance/fuel-logs`, { headers: authHeaders }),
        fetch(`${API_URL}/api/finance/expenses`, { headers: authHeaders }),
      ])
      if (fuelRes.ok) setFuelLogs(await fuelRes.json())
      if (expenseRes.ok) setExpenses(await expenseRes.json())
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const totalCost = fuelLogs.reduce((sum, l) => sum + l.fuel_cost, 0) +
    expenses.reduce((sum, e) => sum + e.total_cost, 0)

  return (
    <div className="space-y-8">
      {/* Fuel Logs Section */}
      <div className="rounded border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900/40">
        <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4 dark:border-zinc-800">
          <h2 className="text-sm font-semibold tracking-wide text-zinc-900 dark:text-white">
            {t("fuelExpensesPage.fuelLogs")}
          </h2>
          <button
            onClick={() => setFuelDialogOpen(true)}
            className="inline-flex items-center gap-1.5 rounded bg-[#0080FF] px-3.5 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[#006ce6]"
          >
            + {t("fuelExpensesPage.logFuel")}
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-zinc-100 text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                <th className="px-5 py-3 font-medium">{t("fuelExpensesPage.vehicle")}</th>
                <th className="px-5 py-3 font-medium">{t("fuelExpensesPage.date")}</th>
                <th className="px-5 py-3 font-medium">{t("fuelExpensesPage.liters")}</th>
                <th className="px-5 py-3 font-medium">{t("fuelExpensesPage.fuelCost")}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-5 py-8 text-center text-zinc-400">Loading...</td>
                </tr>
              ) : fuelLogs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-5 py-8 text-center text-zinc-400">No fuel logs yet</td>
                </tr>
              ) : (
                fuelLogs.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-zinc-50 transition-colors hover:bg-zinc-50 dark:border-zinc-800/50 dark:hover:bg-zinc-800/30"
                  >
                    <td className="px-5 py-3 font-medium text-zinc-900 dark:text-white">{row.vehicle_name || `Vehicle #${row.vehicle_id}`}</td>
                    <td className="px-5 py-3 text-zinc-600 dark:text-zinc-300">{new Date(row.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</td>
                    <td className="px-5 py-3 text-zinc-600 dark:text-zinc-300">{row.liters} L</td>
                    <td className="px-5 py-3 text-zinc-600 dark:text-zinc-300">{row.fuel_cost.toLocaleString("en-IN")}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Other Expenses Section */}
      <div className="rounded border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900/40">
        <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4 dark:border-zinc-800">
          <h2 className="text-sm font-semibold tracking-wide text-zinc-900 dark:text-white">
            {t("fuelExpensesPage.otherExpenses")}
          </h2>
          <button
            onClick={() => setExpenseDialogOpen(true)}
            className="inline-flex items-center gap-1.5 rounded border border-zinc-200 bg-white px-3.5 py-1.5 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            + {t("fuelExpensesPage.addExpense")}
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-zinc-100 text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                <th className="px-5 py-3 font-medium">{t("fuelExpensesPage.trip")}</th>
                <th className="px-5 py-3 font-medium">{t("fuelExpensesPage.vehicle")}</th>
                <th className="px-5 py-3 font-medium">{t("fuelExpensesPage.toll")}</th>
                <th className="px-5 py-3 font-medium">{t("fuelExpensesPage.other")}</th>
                <th className="px-5 py-3 font-medium">{t("fuelExpensesPage.total")}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-zinc-400">Loading...</td>
                </tr>
              ) : expenses.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-zinc-400">No expenses yet</td>
                </tr>
              ) : (
                expenses.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-zinc-50 transition-colors hover:bg-zinc-50 dark:border-zinc-800/50 dark:hover:bg-zinc-800/30"
                  >
                    <td className="px-5 py-3 font-medium text-zinc-900 dark:text-white">{row.trip_code || "—"}</td>
                    <td className="px-5 py-3 text-zinc-600 dark:text-zinc-300">{row.vehicle_name || `Vehicle #${row.vehicle_id}`}</td>
                    <td className="px-5 py-3 text-zinc-600 dark:text-zinc-300">{row.toll.toLocaleString("en-IN")}</td>
                    <td className="px-5 py-3 text-zinc-600 dark:text-zinc-300">{row.other.toLocaleString("en-IN")}</td>
                    <td className="px-5 py-3 text-zinc-600 dark:text-zinc-300">{row.total_cost.toLocaleString("en-IN")}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary Footer */}
      <div className="flex items-center justify-between rounded border border-zinc-200 bg-white px-5 py-4 dark:border-zinc-800 dark:bg-zinc-900/40">
        <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
          {t("fuelExpensesPage.totalOperationalCost")}
        </span>
        <span className="text-sm font-bold text-zinc-900 dark:text-white">
          {totalCost.toLocaleString("en-IN")}
        </span>
      </div>

      <AddFuelDialog
        open={fuelDialogOpen}
        onClose={() => setFuelDialogOpen(false)}
        onCreated={fetchData}
      />
      <AddExpenseDialog
        open={expenseDialogOpen}
        onClose={() => setExpenseDialogOpen(false)}
        onCreated={fetchData}
      />
    </div>
  )
}
