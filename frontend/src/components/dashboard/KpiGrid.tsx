import { useTranslation } from "react-i18next"
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell } from "recharts"

const DATA = [
  { name: "Mon", value: 87 },
  { name: "Tue", value: 92 },
  { name: "Wed", value: 78 },
  { name: "Thu", value: 95 },
  { name: "Fri", value: 88 },
  { name: "Sat", value: 65 },
  { name: "Sun", value: 52 },
]

interface Kpi {
  labelKey: string
  value: string
  change: string
  positive: boolean
  bar?: boolean
}

const KPIS: Kpi[] = [
  { labelKey: "kpi.fleetUtilization", value: "87%", change: "+3.2%", positive: true, bar: true },
  { labelKey: "kpi.onTimeDelivery", value: "94.1%", change: "+1.8%", positive: true },
  { labelKey: "kpi.safetyIncidents", value: "2", change: "-4", positive: true },
  { labelKey: "kpi.totalTrips", value: "1,284", change: "+126", positive: true },
  { labelKey: "kpi.avgFuelEfficiency", value: "8.2 MPG", change: "-0.3", positive: false },
]

export default function KpiGrid() {
  const { t } = useTranslation()

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {KPIS.map((kpi) => (
        <div
          key={kpi.labelKey}
          className="rounded border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900/40"
        >
          <span className="mb-1 block text-xs font-semibold text-zinc-800 dark:text-zinc-200">
            {t(kpi.labelKey)}
          </span>
          <span className="mb-2 block text-2xl font-bold text-zinc-900 dark:text-white">
            {kpi.value}
          </span>
          <span
            className={`text-xs font-medium ${
              kpi.positive ? "text-emerald-600" : "text-red-500"
            }`}
          >
            {kpi.change}
          </span>

          {kpi.bar && (
            <div className="mt-3 h-16">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={DATA}>
                  <XAxis dataKey="name" hide />
                  <YAxis hide />
                  <Bar dataKey="value" radius={[2, 2, 0, 0]}>
                    {DATA.map((_, i) => (
                      <Cell
                        key={i}
                        fill={i === 3 ? "#0080FF" : "#e4e4e7"}
                        className="dark:fill-zinc-700"
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
