import { useTranslation } from "react-i18next"
import FuelExpensesContent from "@/components/dashboard/FuelExpensesContent"

export default function FuelExpensesPage() {
  const { t } = useTranslation()

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <div className="mb-6">
        <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-white">
          {t("fuelExpensesPage.title")}
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          {t("fuelExpensesPage.subtitle")}
        </p>
      </div>

      <FuelExpensesContent />
    </div>
  )
}
