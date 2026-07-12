import { useState } from "react"
import { useTranslation } from "react-i18next"
import AddFuelDialog from "./AddFuelDialog"
import AddExpenseDialog from "./AddExpenseDialog"

const FUEL_LOGS = [
  { vehicle: "VAN-05", date: "05 Jul 2026", liters: "42 L", fuelCost: "3,150" },
  { vehicle: "TRUCK-11", date: "06 Jul 2026", liters: "110 L", fuelCost: "8,400" },
  { vehicle: "MINI-08", date: "06 Jul 2026", liters: "28 L", fuelCost: "2,050" },
]

const EXPENSES = [
  { trip: "TR001", vehicle: "VAN-05", toll: "120", other: "0", maint: "0", total: "Available" },
  { trip: "TR002", vehicle: "TRK-12", toll: "340", other: "150", maint: "18,000", total: "Completed" },
]

export default function FuelExpensesContent() {
  const { t } = useTranslation()
  const [fuelDialogOpen, setFuelDialogOpen] = useState(false)
  const [expenseDialogOpen, setExpenseDialogOpen] = useState(false)

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
              {FUEL_LOGS.map((row, i) => (
                <tr
                  key={i}
                  className="border-b border-zinc-50 transition-colors hover:bg-zinc-50 dark:border-zinc-800/50 dark:hover:bg-zinc-800/30"
                >
                  <td className="px-5 py-3 font-medium text-zinc-900 dark:text-white">{row.vehicle}</td>
                  <td className="px-5 py-3 text-zinc-600 dark:text-zinc-300">{row.date}</td>
                  <td className="px-5 py-3 text-zinc-600 dark:text-zinc-300">{row.liters}</td>
                  <td className="px-5 py-3 text-zinc-600 dark:text-zinc-300">{row.fuelCost}</td>
                </tr>
              ))}
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
                <th className="px-5 py-3 font-medium">{t("fuelExpensesPage.maintLinked")}</th>
                <th className="px-5 py-3 font-medium">{t("fuelExpensesPage.total")}</th>
              </tr>
            </thead>
            <tbody>
              {EXPENSES.map((row, i) => (
                <tr
                  key={i}
                  className="border-b border-zinc-50 transition-colors hover:bg-zinc-50 dark:border-zinc-800/50 dark:hover:bg-zinc-800/30"
                >
                  <td className="px-5 py-3 font-medium text-zinc-900 dark:text-white">{row.trip}</td>
                  <td className="px-5 py-3 text-zinc-600 dark:text-zinc-300">{row.vehicle}</td>
                  <td className="px-5 py-3 text-zinc-600 dark:text-zinc-300">{row.toll}</td>
                  <td className="px-5 py-3 text-zinc-600 dark:text-zinc-300">{row.other}</td>
                  <td className="px-5 py-3 text-zinc-600 dark:text-zinc-300">{row.maint}</td>
                  <td className="px-5 py-3">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${
                      row.total === "Available"
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                        : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                    }`}>
                      {row.total}
                    </span>
                  </td>
                </tr>
              ))}
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
          34,070
        </span>
      </div>

      <AddFuelDialog
        open={fuelDialogOpen}
        onClose={() => setFuelDialogOpen(false)}
        onCreated={() => {}}
      />
      <AddExpenseDialog
        open={expenseDialogOpen}
        onClose={() => setExpenseDialogOpen(false)}
        onCreated={() => {}}
      />
    </div>
  )
}
