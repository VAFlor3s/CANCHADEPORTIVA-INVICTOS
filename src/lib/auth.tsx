'use client'
import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { supabase } from './supabase'

export type Role = 'admin' | 'cajero'

export interface AuthUser {
  role: Role
  name: string
}

interface AuthContextType {
  user: AuthUser | null
  loading: boolean
  login: (pin: string) => Promise<{ success: boolean; error?: string }>
  logout: () => void
  isAdmin: boolean
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: async () => ({ success: false }),
  logout: () => {},
  isAdmin: false,
})

const SESSION_KEY = 'sc_session'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Restore session from sessionStorage (cleared when tab closes)
    try {
      const saved = sessionStorage.getItem(SESSION_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        setUser(parsed)
      }
    } catch {}
    setLoading(false)
  }, [])

  async function login(pin: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('app_config')
        .select('key, value')
        .in('key', ['pin_admin', 'pin_cajero'])

      if (error) throw error

      const configs = data || []
      const pinAdmin = configs.find(c => c.key === 'pin_admin')?.value || '1234'
      const pinCajero = configs.find(c => c.key === 'pin_cajero')?.value || '5678'

      let matched: AuthUser | null = null

      if (pin === pinAdmin) {
        matched = { role: 'admin', name: 'Administrador' }
      } else if (pin === pinCajero) {
        matched = { role: 'cajero', name: 'Cajero' }
      }

      if (matched) {
        setUser(matched)
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(matched))
        return { success: true }
      }

      return { success: false, error: 'PIN incorrecto' }
    } catch (e: any) {
      return { success: false, error: 'Error de conexión' }
    }
  }

  function logout() {
    setUser(null)
    sessionStorage.removeItem(SESSION_KEY)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isAdmin: user?.role === 'admin' }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
