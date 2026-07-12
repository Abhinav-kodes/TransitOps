import { useTranslation } from "react-i18next"
import { Moon, Sun, Globe, Bell, LogOut } from "lucide-react"
import { useTheme } from "@/lib/theme"
import i18n from "@/lib/i18n"

export default function Header() {
  useTranslation()
  const { theme, toggleTheme } = useTheme()

  const cycleLang = () => {
    const langs = ["en", "es"]
    const next = langs[(langs.indexOf(i18n.language) + 1) % langs.length]
    i18n.changeLanguage(next)
    localStorage.setItem("transitops-lang", next)
  }

  const handleLogout = () => {
    localStorage.removeItem("transitops-token")
    window.location.reload()
  }

  const langLabel = i18n.language === "es" ? "ES" : "EN"

  return (
    <header className="sticky top-0 z-10 flex items-center justify-end gap-2 border-b border-zinc-200 bg-white/80 px-6 py-3 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/80">
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
      <div className="ml-2 flex items-center gap-2 border-l border-zinc-200 pl-2 dark:border-zinc-800">
        <div className="flex size-8 items-center justify-center rounded-full bg-[#0080FF] text-xs font-semibold text-white">
          JD
        </div>
        <button
          onClick={handleLogout}
          title="Sign out"
          className="rounded p-2 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-red-600 dark:hover:bg-zinc-800 dark:hover:text-red-400"
        >
          <LogOut className="size-4" />
        </button>
      </div>
    </header>
  )
}
