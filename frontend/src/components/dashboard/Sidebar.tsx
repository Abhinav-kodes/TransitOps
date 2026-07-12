import { useTranslation } from "react-i18next"
import {
  Truck, LayoutDashboard, Users, DollarSign, Settings
} from "lucide-react"
import { useState } from "react"

interface NavItem {
  labelKey: string
  icon: React.ReactNode
  children?: { labelKey: string; active?: boolean }[]
}

const NAV: NavItem[] = [
  { labelKey: "sidebar.fleet", icon: <Truck className="size-4" />, children: [
    { labelKey: "sidebar.allVehicles", active: true },
    { labelKey: "sidebar.liveTracking" },
    { labelKey: "sidebar.maintenance" },
  ]},
  { labelKey: "sidebar.dispatch", icon: <LayoutDashboard className="size-4" />, children: [
    { labelKey: "sidebar.activeDispatches" },
    { labelKey: "sidebar.createDispatch" },
    { labelKey: "sidebar.routeOptimization" },
  ]},
  { labelKey: "sidebar.drivers", icon: <Users className="size-4" />, children: [
    { labelKey: "sidebar.allDrivers" },
    { labelKey: "sidebar.safetyScores" },
    { labelKey: "sidebar.documents" },
  ]},
  { labelKey: "sidebar.finance", icon: <DollarSign className="size-4" />, children: [
    { labelKey: "sidebar.fuelUsage" },
    { labelKey: "sidebar.costReports" },
  ]},
  { labelKey: "sidebar.settings", icon: <Settings className="size-4" /> },
]

export default function Sidebar() {
  const { t } = useTranslation()
  const [open, setOpen] = useState<Record<number, boolean>>({ 0: true })

  const toggle = (i: number) => setOpen((prev) => ({ ...prev, [i]: !prev[i] }))

  return (
    <aside className="sticky top-0 flex h-screen w-64 shrink-0 flex-col border-r border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <div className="border-b border-zinc-200 px-5 py-5 dark:border-zinc-800">
        <span className="text-base font-bold tracking-tight text-zinc-900 dark:text-white">
          {t("app")}
        </span>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {NAV.map((item, i) => (
          <div key={item.labelKey} className="mb-1">
            <button
              onClick={() => item.children && toggle(i)}
              className="flex w-full items-center gap-3 rounded px-3 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              <span className="text-zinc-400 dark:text-zinc-500">{item.icon}</span>
              {t(item.labelKey)}
            </button>
            {item.children && open[i] && (
              <div className="ml-6 border-l border-zinc-200 pl-3 dark:border-zinc-700">
                {item.children.map((child) => (
                  <button
                    key={child.labelKey}
                    className={`block w-full rounded px-3 py-1.5 text-left text-xs transition-colors ${
                      child.active
                        ? "bg-zinc-100 font-medium text-zinc-900 dark:bg-zinc-800 dark:text-white"
                        : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
                    }`}
                  >
                    {t(child.labelKey)}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>
    </aside>
  )
}
