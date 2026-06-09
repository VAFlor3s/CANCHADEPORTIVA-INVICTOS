'use client'
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { supabase } from './supabase'

export type Role = 'admin' | 'cajero'

interface AuthUser { role: Role }

interface Ctx {
  user: AuthUser | null
  ready: boolean
  login: (pin: string) => Promise<'ok' | 'wrong' | 'error'>
  logout: () => void
  isAdmin: boolean
}

const AuthCtx = createContext<Ctx>({ user: null, ready: false, login: async () => 'error', logout: () => {}, isAdmin: false })

const KEY = 'inv_role'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [ready, setReady] = useState(false)

  // Restore from localStorage on mount (client only)
  useEffect(() => {
    try {
      const saved = localStorage.getItem(KEY)
      if (saved === 'admin' || saved === 'cajero') {
        setUser({ role: saved as Role })
      }
    } catch {}
    setReady(true)
  }, [])

  async function login(pin: string): Promise<'ok' | 'wrong' | 'error'> {
    try {
      const { data, error } = await supabase
        .from('app_config')
        .select('key, value')
        .in('key', ['pin_admin', 'pin_cajero'])

      if (error) return 'error'

      const map: Record<string, string> = {}
      ;(data || []).forEach((r: any) => { map[r.key] = r.value })

      const adminPin  = map['pin_admin']  || '1234'
      const cajeroPin = map['pin_cajero'] || '5678'

      let role: Role | null = null
      if (pin === adminPin)  role = 'admin'
      if (pin === cajeroPin) role = 'cajero'

      if (role) {
        setUser({ role })
        try { localStorage.setItem(KEY, role) } catch {}
        return 'ok'
      }
      return 'wrong'
    } catch {
      return 'error'
    }
  }

  function logout() {
    setUser(null)
    try { localStorage.removeItem(KEY) } catch {}
  }

  return (
    <AuthCtx.Provider value={{ user, ready, login, logout, isAdmin: user?.role === 'admin' }}>
      {children}
    </AuthCtx.Provider>
  )
}

export const useAuth = () => useContext(AuthCtx)
