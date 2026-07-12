import { useState, useEffect } from "react"
import { CheckCircle2, Globe, AlertCircle } from "lucide-react"
import { useNavigate } from "react-router-dom"
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
import { useAuth } from "@/lib/auth"
import geminiLogo from "@/assets/TT-removebg-preview.png"

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000"

interface LoginFormState {
  email: string
  password: string
  role: string
}

interface RoleOption {
  id: number
  name: string
}

const FEATURES = [
  "Reduce collisions and downtime with automated event detection and AI-driven telemetry.",
  "Get unmatched visibility into your fleet, track active dispatches, and optimize routing in real time.",
  "Assign workflows, enforce compliance standards, and digitize driver safety logs seamlessly.",
  "Lower operational costs, analyze fuel consumption, and prevent unauthorized usage with granular RBAC.",
]

const PUBLIC_ROLES = ["Fleet Manager", "Dispatcher", "Driver", "Safety Officer", "Financial Analyst", "Admin"]

export default function LoginPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { login: authLogin } = useAuth()
  const [form, setForm] = useState<LoginFormState>({ email: "", password: "", role: "Dispatcher" })
  const [isSignUp, setIsSignUp] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [roles, setRoles] = useState<RoleOption[]>([])

  useEffect(() => {
    fetch(`${API_URL}/api/auth/roles`)
      .then((r) => r.json())
      .then((data: RoleOption[]) => setRoles(data))
      .catch(() => {})
  }, [])

  const handleLogin = async (emailToLogin: string, passwordToLogin: string) => {
    const params = new URLSearchParams()
    params.append("username", emailToLogin)
    params.append("password", passwordToLogin)

    const res = await fetch(`${API_URL}/api/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params,
    })

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.detail || "Authentication failed. Please verify your credentials.")
    }

    const data = await res.json()
    await authLogin(data.access_token)
    navigate("/dashboard")
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setLoading(true)

    if (!form.email || !form.password) {
      setError("Please fill in all required fields.")
      setLoading(false)
      return
    }

    try {
      if (isSignUp) {
        const targetRole = roles.find((r) => r.name === form.role)
        const targetRoleId = targetRole?.id || 2
        const res = await fetch(`${API_URL}/api/auth/register`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: form.email,
            password: form.password,
            role_id: targetRoleId,
          }),
        })

        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data.detail || "Registration failed. Email might already be registered.")
        }

        setSuccess("Account successfully created! Logging in...")
        await handleLogin(form.email, form.password)
      } else {
        await handleLogin(form.email, form.password)
      }
    } catch (err: any) {
      setError(err.message || "An unexpected network error occurred.")
    } finally {
      setLoading(false)
    }
  }

  const cycleLang = () => {
    const langs = ["en", "hi"]
    const current = i18n.language
    const next = langs[(langs.indexOf(current) + 1) % langs.length]
    i18n.changeLanguage(next)
    localStorage.setItem("transitops-lang", next)
  }

  const langLabel = i18n.language === "hi" ? "HI" : "EN"

  return (
    <div className="flex min-h-screen">
      <div className="hidden w-1/2 flex-col justify-center border-r border-zinc-800/80 bg-black lg:flex">
        <div className="mx-auto max-w-lg px-12 py-16">
          <div className="mb-8 inline-block">
            <img
              src={geminiLogo}
              alt="TransitOps"
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
          <div className="flex items-center gap-2.5">
            <img src={geminiLogo} alt="TransitOps" className="h-8 w-8 rounded-lg object-contain" />
            <span className="text-2xl font-black tracking-tighter text-black">
              {t("app")}
            </span>
          </div>
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
              {isSignUp ? "Create Your Account" : t("login.title")}
            </h2>

            {error && (
              <div className="mb-4 flex items-center gap-2 rounded bg-red-50 p-3 text-xs font-medium text-red-700 border border-red-200">
                <AlertCircle className="size-4 shrink-0 text-red-500" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="mb-4 flex items-center gap-2 rounded bg-emerald-50 p-3 text-xs font-medium text-emerald-700 border border-emerald-200">
                <CheckCircle2 className="size-4 shrink-0 text-emerald-500" />
                <span>{success}</span>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <Label htmlFor="email" className="mb-1.5 block text-xs font-normal text-zinc-600">
                {t("login.email")}
              </Label>
              <Input
                id="email"
                type="email"
                placeholder={t("login.emailPlaceholder")}
                value={form.email}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setForm({ ...form, email: e.target.value })
                }
                disabled={loading}
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
                disabled={loading}
                className="h-10 rounded border-zinc-300 bg-white text-sm text-zinc-900 shadow-none placeholder:text-zinc-400 focus-visible:border-[#0080FF] focus-visible:ring-1 focus-visible:ring-[#0080FF]"
              />

              <Label className="mb-1.5 mt-4 block text-xs font-normal text-zinc-600">
                {t("login.role")}
              </Label>
              <Select.Root
                defaultValue="Dispatcher"
                onValueChange={(val: string | null) => val && setForm({ ...form, role: val })}
                disabled={loading}
              >
                <SelectTrigger className="h-10 w-full rounded border-zinc-300 bg-white text-sm text-zinc-900 shadow-none focus-visible:border-[#0080FF] focus-visible:ring-1 focus-visible:ring-[#0080FF]">
                  <SelectValue placeholder={t("login.selectRole")} />
                </SelectTrigger>
                <SelectContent className="border-zinc-200 bg-white">
                  {roles
                    .filter((r) => PUBLIC_ROLES.includes(r.name))
                    .map((r) => (
                      <SelectItem key={r.id} value={r.name} className="text-sm text-zinc-700">
                        {r.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select.Root>

              {!isSignUp && (
                <button
                  type="button"
                  disabled={loading}
                  className="mt-2 inline-block text-xs font-medium text-[#0080FF] hover:underline bg-transparent border-none p-0 cursor-pointer disabled:opacity-50"
                >
                  {t("login.forgotPassword")}
                </button>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="mt-6 h-10 w-full rounded bg-[#0080FF] text-sm font-medium text-white shadow-sm transition-all hover:bg-[#006ce6] disabled:bg-[#0080FF]/50"
              >
                {loading
                  ? (isSignUp ? "Signing Up..." : "Logging In...")
                  : (isSignUp ? "Sign Up" : t("login.loginButton"))}
              </Button>


            </form>

            <p className="mt-6 block text-center text-xs text-zinc-500">
              {isSignUp ? (
                <>
                  Already have an account?{" "}
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => {
                      setIsSignUp(false)
                      setError(null)
                      setSuccess(null)
                    }}
                    className="font-medium text-[#0080FF] hover:underline bg-transparent border-none p-0 cursor-pointer disabled:opacity-50"
                  >
                    Log In
                  </button>
                </>
              ) : (
                <>
                  {t("login.noAccount")}{" "}
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => {
                      setIsSignUp(true)
                      setError(null)
                      setSuccess(null)
                    }}
                    className="font-medium text-[#0080FF] hover:underline bg-transparent border-none p-0 cursor-pointer disabled:opacity-50"
                  >
                    {t("login.signUp")}
                  </button>
                </>
              )}
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
