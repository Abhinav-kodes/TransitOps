import { createContext, useContext, useState, useEffect, type ReactNode } from "react"

interface AuthUser {
  id: number
  email: string
  role: string
}

interface AuthContextType {
  user: AuthUser | null
  loading: boolean
  login: (token: string) => Promise<void>
  logout: () => void
  hasRole: (...roles: string[]) => boolean
}

const AuthContext = createContext<AuthContextType | null>(null)

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000"

function parseJwtPayload(token: string): Record<string, any> | null {
  try {
    const base64Url = token.split(".")[1]
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/")
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    )
    return JSON.parse(jsonPayload)
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchUser = async (token: string) => {
    try {
      const res = await fetch(`${API_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setUser({
        id: data.id,
        email: data.email,
        role: data.role_name || "Guest",
      })
    } catch {
      localStorage.removeItem("transitops-token")
      setUser(null)
    }
  }

  useEffect(() => {
    const token = localStorage.getItem("transitops-token")
    if (token && token !== "skip-mode") {
      fetchUser(token).finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  const login = async (token: string) => {
    localStorage.setItem("transitops-token", token)
    await fetchUser(token)
  }

  const logout = () => {
    localStorage.removeItem("transitops-token")
    setUser(null)
  }

  const hasRole = (...roles: string[]) => {
    if (!user) return false
    return roles.includes(user.role)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, hasRole }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within AuthProvider")
  return ctx
}
