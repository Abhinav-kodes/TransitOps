import { useState } from "react"
import { CheckCircle2, Globe } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import i18n from "@/lib/i18n"
import loginBadges from "@/assets/login_badges.webp"

interface LoginFormState {
  email: string
  password: string
  role: string
}

const FEATURES = [
  "Reduce collisions and downtime with automated event detection and AI-driven telemetry.",
  "Get unmatched visibility into your fleet, track active dispatches, and optimize routing in real time.",
  "Assign workflows, enforce compliance standards, and digitize driver safety logs seamlessly.",
  "Lower operational costs, analyze fuel consumption, and prevent unauthorized usage with granular RBAC.",
]

const ROLES = ["fleetManager", "dispatcher", "safetyOfficer", "financialAnalyst"] as const

export default function LoginPage() {
  const { t } = useTranslation()
  const [form, setForm] = useState<LoginFormState>({ email: "", password: "", role: "dispatcher" })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
  }

  const cycleLang = () => {
    const langs = ["en", "es"]
    const current = i18n.language
    const next = langs[(langs.indexOf(current) + 1) % langs.length]
    i18n.changeLanguage(next)
    localStorage.setItem("transitops-lang", next)
  }

  const langLabel = i18n.language === "es" ? "ES" : "EN"

  return (
    <div className="flex min-h-screen">
      <div className="hidden w-1/2 flex-col justify-center border-r border-zinc-800/80 bg-black lg:flex">
        <div className="mx-auto max-w-lg px-12 py-16">
          <div className="mb-8 inline-block">
            <img
              src={loginBadges}
              alt="Enterprise Leader Badge"
              className="h-20 w-auto rounded-xl object-contain"
            />
          </div>

          <h1 className="mb-3 text-3xl font-bold tracking-tight text-white">
            Welcome to TransitOps.
          </h1>
          <p className="mb-8 text-sm leading-relaxed text-zinc-300">
            Build a safer, more productive, and more profitable transport operation
            with the TransitOps Integrated Platform.
          </p>

          <div className="mb-8 space-y-4">
            {FEATURES.map((feature, i) => (
              <div key={i} className="flex gap-3">
                <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-[#0080FF]" />
                <span className="text-sm leading-normal text-zinc-300">{feature}</span>
              </div>
            ))}
          </div>

          <p className="text-xs leading-relaxed text-zinc-400">
            Contact your Account Manager to unlock additional modular capabilities
            and enterprise features.
          </p>
        </div>
      </div>

      <div className="flex w-full flex-col bg-white lg:w-1/2">
        <div className="flex items-center justify-between px-12 py-5 lg:px-20">
          <span className="text-2xl font-black tracking-tighter text-black">
            {t("app")}
          </span>
          <button
            onClick={cycleLang}
            className="flex items-center gap-1.5 text-xs font-medium text-zinc-500 transition-colors hover:text-zinc-800"
          >
            <Globe className="size-3.5" />
            {langLabel}
            <svg className="size-3" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 5l3 3 3-3" />
            </svg>
          </button>
        </div>

        <div className="flex flex-1 items-center justify-center px-12 py-8 lg:px-20">
          <div className="w-full max-w-sm">
            <h2 className="mb-6 text-2xl font-bold tracking-tight text-zinc-900">
              {t("login.title")}
            </h2>

            <form onSubmit={handleSubmit}>
              <Label htmlFor="email" className="mb-1.5 block text-xs font-normal text-zinc-600">
                {t("login.email")}
              </Label>
              <Input
                id="email"
                type="text"
                placeholder={t("login.emailPlaceholder")}
                value={form.email}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setForm({ ...form, email: e.target.value })
                }
                className="h-10 rounded border-zinc-300 bg-white text-sm text-zinc-900 shadow-none placeholder:text-zinc-400 focus-visible:border-[#0080FF] focus-visible:ring-1 focus-visible:ring-[#0080FF]"
              />

              <Label htmlFor="password" className="mb-1.5 mt-4 block text-xs font-normal text-zinc-600">
                {t("login.password")}
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={form.password}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setForm({ ...form, password: e.target.value })
                }
                className="h-10 rounded border-zinc-300 bg-white text-sm text-zinc-900 shadow-none placeholder:text-zinc-400 focus-visible:border-[#0080FF] focus-visible:ring-1 focus-visible:ring-[#0080FF]"
              />

              <Label className="mb-1.5 mt-4 block text-xs font-normal text-zinc-600">
                {t("login.role")}
              </Label>
              <Select.Root
                defaultValue="dispatcher"
                onValueChange={(val: string | null) => val && setForm({ ...form, role: val })}
              >
                <SelectTrigger className="h-10 w-full rounded border-zinc-300 bg-white text-sm text-zinc-900 shadow-none focus-visible:border-[#0080FF] focus-visible:ring-1 focus-visible:ring-[#0080FF]">
                  <SelectValue placeholder={t("login.selectRole")} />
                </SelectTrigger>
                <SelectContent className="border-zinc-200 bg-white">
                  {ROLES.map((role) => (
                    <SelectItem key={role} value={role} className="text-sm text-zinc-700">
                      {t(`login.${role}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select.Root>

              <button
                type="button"
                className="mt-2 inline-block text-xs font-medium text-[#0080FF] hover:underline"
              >
                {t("login.forgotPassword")}
              </button>

              <Button
                type="submit"
                className="mt-6 h-10 w-full rounded bg-[#0080FF] text-sm font-medium text-white shadow-sm transition-all hover:bg-[#006ce6]"
              >
                {t("login.loginButton")}
              </Button>

              <Button
                type="button"
                variant="outline"
                className="mt-3 h-10 w-full rounded border-zinc-300 bg-white text-sm font-medium text-zinc-800 shadow-none hover:bg-zinc-50"
              >
                {t("login.ssoButton")}
              </Button>
            </form>

            <p className="mt-6 block text-center text-xs text-zinc-500">
              {t("login.noAccount")}{" "}
              <a href="#" className="font-medium text-[#0080FF] hover:underline">
                {t("login.signUp")}
              </a>
            </p>
          </div>
        </div>

        <div className="px-12 py-5 text-center lg:px-20">
          <p className="text-xs text-zinc-500">
            {t("login.needHelp")}{" "}
            <a href="#" className="font-medium text-[#0080FF] hover:underline">
              {t("login.contactSupport")}
            </a>{" "}
            {t("login.orCall")}
          </p>
        </div>
      </div>
    </div>
  )
}
