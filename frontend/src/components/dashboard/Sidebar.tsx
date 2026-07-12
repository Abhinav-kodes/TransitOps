import { useTranslation } from "react-i18next"
import { useLocation, useNavigate } from "react-router-dom"
import {
  LayoutDashboard, Truck, Users, Map, Wrench, Fuel, BarChart3, Settings
} from "lucide-react"
import { useAuth } from "@/lib/auth"

const NAV = [
  { labelKey: "sidebar.dashboard", icon: <LayoutDashboard className="size-4" />, path: "/dashboard", roles: ["Fleet Manager", "Dispatcher", "Driver", "Safety Officer", "Financial Analyst"] },
  { labelKey: "sidebar.fleet", icon: <Truck className="size-4" />, children: [
    { labelKey: "sidebar.allVehicles", path: "/fleet/vehicles" },
  ], roles: ["Fleet Manager", "Dispatcher", "Safety Officer", "Financial Analyst"] },
  { labelKey: "sidebar.drivers", icon: <Users className="size-4" />, children: [
    { labelKey: "sidebar.allDrivers", path: "/drivers" },
  ], roles: ["Fleet Manager", "Dispatcher", "Safety Officer", "Financial Analyst"] },
  { labelKey: "sidebar.trips", icon: <Map className="size-4" />, path: "/trips", roles: ["Dispatcher", "Driver"] },
  { labelKey: "sidebar.maintenance", icon: <Wrench className="size-4" />, children: [
    { labelKey: "sidebar.serviceLog", path: "/maintenance" },
  ], roles: ["Fleet Manager", "Dispatcher", "Financial Analyst"] },
  { labelKey: "sidebar.fuelExpenses", icon: <Fuel className="size-4" />, children: [
    { labelKey: "sidebar.allRecords", path: "/fuel-expenses" },
  ], roles: ["Fleet Manager", "Dispatcher", "Financial Analyst"] },
  { labelKey: "sidebar.analytics", icon: <BarChart3 className="size-4" />, path: "/analytics", roles: ["Fleet Manager", "Dispatcher", "Driver", "Safety Officer", "Financial Analyst"] },
  { labelKey: "sidebar.settings", icon: <Settings className="size-4" />, path: "/settings", roles: ["Fleet Manager", "Dispatcher", "Driver", "Safety Officer", "Financial Analyst"] },
]

export default function Sidebar() {
  const { t } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()
  const { user } = useAuth()

  const visibleNav = NAV.filter((item) => {
    if (!user) return false
    return item.roles.includes(user.role)
  })

  return (
    <aside className="sticky top-0 flex h-screen w-64 shrink-0 flex-col border-r border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <div className="border-b border-zinc-200 px-5 py-5 dark:border-zinc-800">
        <span className="text-base font-bold tracking-tight text-zinc-900 dark:text-white">
          {t("app")}
        </span>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {visibleNav.map((item) => {
          const isActive = item.path
            ? location.pathname === item.path
            : item.children?.some((child) => location.pathname === child.path)

          return (
            <div key={item.labelKey} className="mb-1">
              <button
                onClick={() => item.path && navigate(item.path)}
                className={`flex w-full items-center gap-3 rounded px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-white"
                    : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                }`}
              >
                <span className="text-zinc-400 dark:text-zinc-500">{item.icon}</span>
                {t(item.labelKey)}
              </button>

              {item.children && (
                <div className="ml-6 border-l border-zinc-200 pl-3 dark:border-zinc-700">
                  {item.children.map((child) => (
                    <button
                      key={child.labelKey}
                      onClick={() => navigate(child.path)}
                      className={`block w-full rounded px-3 py-1.5 text-left text-xs transition-colors ${
                        location.pathname === child.path
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
