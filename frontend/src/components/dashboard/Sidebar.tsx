import { useTranslation } from "react-i18next"
import {
  LayoutDashboard, Truck, Users, Map, Wrench, Fuel, BarChart3, Settings
} from "lucide-react"

const NAV = [
  { labelKey: "sidebar.dashboard", icon: <LayoutDashboard className="size-4" />, page: "dashboard" },
  { labelKey: "sidebar.fleet", icon: <Truck className="size-4" />, children: [
    { labelKey: "sidebar.allVehicles", page: "vehicle-registry" },
  ]},
  { labelKey: "sidebar.drivers", icon: <Users className="size-4" />, comingSoon: true },
  { labelKey: "sidebar.trips", icon: <Map className="size-4" />, comingSoon: true },
  { labelKey: "sidebar.maintenance", icon: <Wrench className="size-4" />, comingSoon: true },
  { labelKey: "sidebar.fuelExpenses", icon: <Fuel className="size-4" />, comingSoon: true },
  { labelKey: "sidebar.analytics", icon: <BarChart3 className="size-4" />, comingSoon: true },
  { labelKey: "sidebar.settings", icon: <Settings className="size-4" />, comingSoon: true },
]

interface SidebarProps {
  activePage: string
  onNavigate: (page: string) => void
}

export default function Sidebar({ activePage, onNavigate }: SidebarProps) {
  const { t } = useTranslation()

  return (
    <aside className="sticky top-0 flex h-screen w-64 shrink-0 flex-col border-r border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <div className="border-b border-zinc-200 px-5 py-5 dark:border-zinc-800">
        <span className="text-base font-bold tracking-tight text-zinc-900 dark:text-white">
          {t("app")}
        </span>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {NAV.map((item) => {
          const isActive = item.page && activePage === item.page

          return (
            <div key={item.labelKey} className="mb-1">
              <button
                onClick={() => {
                  if (item.comingSoon) {
                    alert(`${t(item.labelKey)} — Coming Soon`)
                  } else if (item.page) {
                    onNavigate(item.page)
                  }
                }}
                className={`flex w-full items-center gap-3 rounded px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-white"
                    : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                }`}
              >
                <span className="text-zinc-400 dark:text-zinc-500">{item.icon}</span>
                {t(item.labelKey)}
                {item.comingSoon && (
                  <span className="ml-auto rounded bg-zinc-100 px-1.5 py-0.5 text-[9px] font-medium text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500">
                    SOON
                  </span>
                )}
              </button>

              {item.children && (
                <div className="ml-6 border-l border-zinc-200 pl-3 dark:border-zinc-700">
                  {item.children.map((child) => (
                    <button
                      key={child.labelKey}
                      onClick={() => onNavigate(child.page)}
                      className={`block w-full rounded px-3 py-1.5 text-left text-xs transition-colors ${
                        activePage === child.page
                          ? "bg-zinc-50 font-medium text-zinc-900 dark:bg-zinc-800/50 dark:text-white"
                          : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
                      }`}
                    >
                      {t(child.labelKey)}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </nav>
    </aside>
  )
}
