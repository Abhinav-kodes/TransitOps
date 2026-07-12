import { useTranslation } from "react-i18next"
import { Moon, Sun, Globe, Bell, LogOut, Search } from "lucide-react"
import { useTheme } from "@/lib/theme"
import { useAuth } from "@/lib/auth"
import i18n from "@/lib/i18n"

function getInitials(email: string): string {
  const name = email.split("@")[0]
  const parts = name.split(/[._-]/)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }
  return name.substring(0, 2).toUpperCase()
}

function getDisplayName(email: string): string {
  const name = email.split("@")[0]
  const parts = name.split(/[._-]/)
  return parts.map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(" ")
}

export default function Header() {
  useTranslation()
  const { theme, toggleTheme } = useTheme()
  const { user, logout } = useAuth()

  const cycleLang = () => {
    const langs = ["en", "hi"]
    const next = langs[(langs.indexOf(i18n.language) + 1) % langs.length]
    i18n.changeLanguage(next)
    localStorage.setItem("transitops-lang", next)
  }

  const langLabel = i18n.language === "hi" ? "HI" : "EN"
  const displayName = user ? getDisplayName(user.email) : "Guest"
  const initials = user ? getInitials(user.email) : "G"
  const roleName = user?.role || "User"

  return (
    <header className="sticky top-0 z-10 flex items-center gap-4 border-b border-zinc-200 bg-white/80 px-6 py-3 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/80">
      <div className="relative flex-1 max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
        <input
          type="text"
          placeholder="Search..."
          className="h-9 w-full rounded border border-zinc-200 bg-zinc-50 pl-9 pr-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-[#0080FF] focus:outline-none focus:ring-1 focus:ring-[#0080FF] dark:border-zinc-700 dark:bg-zinc-900 dark:text-white dark:placeholder:text-zinc-500"
        />
      </div>

      <div className="ml-auto flex items-center gap-2">
        <button
          onClick={cycleLang}
          className="flex items-center gap-1.5 rounded px-2.5 py-1.5 text-xs font-medium text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-800 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
        >
          <Globe className="size-3.5" />
          {langLabel}
        </button>
        <button
          onClick={toggleTheme}
          className="rounded p-2 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-800 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
        >
          {theme === "light" ? <Moon className="size-4" /> : <Sun className="size-4" />}
        </button>
        <button className="rounded p-2 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-800 dark:hover:bg-zinc-800 dark:hover:text-zinc-200">
          <Bell className="size-4" />
        </button>

        <div className="ml-2 flex items-center gap-2.5 border-l border-zinc-200 pl-3 dark:border-zinc-800">
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-200">{displayName}</span>
          <span className="rounded-full bg-[#0080FF]/10 px-2.5 py-0.5 text-[10px] font-semibold text-[#0080FF]">
            {roleName}
          </span>
          <div className="flex size-8 items-center justify-center rounded-full bg-zinc-900 text-xs font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900">
            {initials}
          </div>
        </div>
        <button
          onClick={logout}
          title="Sign out"
          className="rounded p-2 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-red-600 dark:hover:bg-zinc-800 dark:hover:text-red-400"
        >
          <LogOut className="size-4" />
        </button>
      </div>
    </header>
  )
}
