import { useState, useEffect } from "react"
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { ThemeProvider } from "@/lib/theme"
import "@/lib/i18n"
import LoginPage from "./pages/LoginPage"
import DashboardLayout from "./components/DashboardLayout"
import DashboardPage from "./pages/DashboardPage"
import VehicleRegistryPage from "./pages/VehicleRegistryPage"
import DriverRegistryPage from "./pages/DriverRegistryPage"
import ComingSoonPage from "./pages/ComingSoonPage"

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const [checked, setChecked] = useState(false)
  const [authed, setAuthed] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem("transitops-token")
    setAuthed(!!token)
    setChecked(true)
  }, [])

  if (!checked) return null
  if (!authed) return <Navigate to="/login" replace />
  return <>{children}</>
}

function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="fleet/vehicles" element={<VehicleRegistryPage />} />
            <Route path="drivers" element={<DriverRegistryPage />} />
            <Route path="trips" element={<ComingSoonPage titleKey="sidebar.trips" />} />
            <Route path="maintenance" element={<ComingSoonPage titleKey="sidebar.maintenance" />} />
            <Route path="fuel-expenses" element={<ComingSoonPage titleKey="sidebar.fuelExpenses" />} />
            <Route path="analytics" element={<ComingSoonPage titleKey="sidebar.analytics" />} />
            <Route path="settings" element={<ComingSoonPage titleKey="sidebar.settings" />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  )
}

export default App
