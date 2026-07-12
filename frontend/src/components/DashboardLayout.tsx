import { Outlet } from "react-router-dom"
import Sidebar from "./dashboard/Sidebar"
import Header from "./dashboard/Header"

export default function DashboardLayout() {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto bg-zinc-50 dark:bg-zinc-950">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
