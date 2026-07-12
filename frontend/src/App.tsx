import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { ThemeProvider } from "@/lib/theme"
import { AuthProvider, useAuth } from "@/lib/auth"
import "@/lib/i18n"
import LoginPage from "./pages/LoginPage"
import DashboardLayout from "./components/DashboardLayout"
import DashboardPage from "./pages/DashboardPage"
import VehicleRegistryPage from "./pages/VehicleRegistryPage"
import DriverRegistryPage from "./pages/DriverRegistryPage"
import FuelExpensesPage from "./pages/FuelExpensesPage"
import MaintenancePage from "./pages/MaintenancePage"
import TripsPage from "./pages/TripsPage"
import AnalyticsPage from "./pages/AnalyticsPage"
import ComingSoonPage from "./pages/ComingSoonPage"

const ROLE_ROUTES: Record<string, string[]> = {
  "Fleet Manager":       ["/dashboard", "/fleet/vehicles", "/drivers", "/maintenance", "/fuel-expenses", "/analytics", "/settings"],
  "Dispatcher":          ["/dashboard", "/fleet/vehicles", "/drivers", "/trips", "/maintenance", "/fuel-expenses", "/analytics", "/settings"],
  "Driver":              ["/dashboard", "/trips", "/analytics"],
  "Safety Officer":      ["/dashboard", "/fleet/vehicles", "/drivers", "/analytics", "/settings"],
  "Financial Analyst":   ["/dashboard", "/fleet/vehicles", "/drivers", "/trips", "/maintenance", "/fuel-expenses", "/analytics", "/settings"],
  "Admin":               ["/dashboard", "/fleet/vehicles", "/drivers", "/trips", "/maintenance", "/fuel-expenses", "/analytics", "/settings"],
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()

  if (loading) return null
  if (!user) return <Navigate to="/login" replace />

  return <>{children}</>
}

function RoleGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const path = window.location.pathname

  if (loading) return null
  if (!user) return <Navigate to="/login" replace />

  const allowed = ROLE_ROUTES[user.role] || ROLE_ROUTES["Driver"]
  if (!allowed.includes(path)) {
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
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
              <Route path="dashboard" element={<RoleGuard><DashboardPage /></RoleGuard>} />
              <Route path="fleet/vehicles" element={<RoleGuard><VehicleRegistryPage /></RoleGuard>} />
              <Route path="drivers" element={<RoleGuard><DriverRegistryPage /></RoleGuard>} />
              <Route path="trips" element={<RoleGuard><TripsPage /></RoleGuard>} />
              <Route path="maintenance" element={<RoleGuard><MaintenancePage /></RoleGuard>} />
              <Route path="fuel-expenses" element={<RoleGuard><FuelExpensesPage /></RoleGuard>} />
              <Route path="analytics" element={<RoleGuard><AnalyticsPage /></RoleGuard>} />
              <Route path="settings" element={<RoleGuard><ComingSoonPage titleKey="sidebar.settings" /></RoleGuard>} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App
