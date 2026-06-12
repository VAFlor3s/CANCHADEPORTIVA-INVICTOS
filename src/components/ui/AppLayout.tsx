'use client'
import Sidebar from '@/components/ui/Sidebar'
import LoginScreen from '@/components/ui/LoginScreen'
import { useAuth } from '@/lib/auth'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0f0800' }}>
        <div className="text-white/20 text-sm">Cargando...</div>
      </div>
    )
  }

  if (!user) return <LoginScreen />

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      {/* Desktop: margin-left para el sidebar fijo. Mobile: padding-bottom para el bottom nav */}
      <main className="flex-1 min-w-0 pb-20 md:pb-0" style={{ marginLeft: 0 }}
        id="app-main">
        <div className="min-h-screen p-4 md:p-6">
          {children}
        </div>
      </main>
    </div>
  )
}
