'use client'
import { useAuth } from '@/lib/auth'
import LoginScreen from './LoginScreen'
import Sidebar from './Sidebar'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, ready } = useAuth()

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center"
        style={{ background: '#0f0800' }}>
        <div className="text-white/20 text-sm animate-pulse">Cargando...</div>
      </div>
    )
  }

  if (!user) return <LoginScreen />

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 min-h-screen p-6 overflow-x-hidden"
        style={{ marginLeft: 224 }}>
        {children}
      </main>
    </div>
  )
}
