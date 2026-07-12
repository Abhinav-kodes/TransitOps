import { useTranslation } from "react-i18next"
import Sidebar from "@/components/dashboard/Sidebar"
import Header from "@/components/dashboard/Header"
import VehicleRegistryTable from "@/components/dashboard/VehicleRegistryTable"

interface VehicleRegistryPageProps {
  activePage: string
  onNavigate: (page: string) => void
}

export default function VehicleRegistryPage({ activePage, onNavigate }: VehicleRegistryPageProps) {
  const { t } = useTranslation()

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar activePage={activePage} onNavigate={onNavigate} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto bg-zinc-50 dark:bg-zinc-950">
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
        </main>
      </div>
    </div>
  )
}
