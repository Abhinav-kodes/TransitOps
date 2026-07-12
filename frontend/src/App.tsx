import { useState, useEffect } from "react"
import { ThemeProvider } from "@/lib/theme"
import "@/lib/i18n"
import LoginPage from "./pages/LoginPage"
import DashboardPage from "./pages/DashboardPage"

function App() {
  const [loggedIn, setLoggedIn] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem("transitops-token")
    if (token) {
      setLoggedIn(true)
    }
  }, [])

  if (!loggedIn) {
    return (
      <ThemeProvider>
        <LoginPage onLoginSuccess={() => setLoggedIn(true)} />
        <button
          onClick={() => {
            localStorage.setItem("transitops-token", "skip-mode")
            setLoggedIn(true)
          }}
          className="fixed bottom-6 right-6 z-50 rounded border border-zinc-200 bg-white px-4 py-2 text-xs font-medium text-zinc-600 shadow-sm transition-colors hover:bg-zinc-50 hover:text-zinc-900"
        >
          Skip to Dashboard →
        </button>
      </ThemeProvider>
    )
  }

  return (
    <ThemeProvider>
      <DashboardPage />
    </ThemeProvider>
  )
}

export default App
