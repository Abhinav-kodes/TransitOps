import { useTranslation } from "react-i18next"
import VehicleRegistryTable from "@/components/dashboard/VehicleRegistryTable"

export default function VehicleRegistryPage() {
  const { t } = useTranslation()

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <div className="mb-6">
        <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-white">
          {t("registry.title")}
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          {t("registry.subtitle")}
        </p>
      </div>

      <VehicleRegistryTable />
    </div>
  )
}
