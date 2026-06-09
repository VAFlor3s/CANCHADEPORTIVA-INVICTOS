'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { useAuth } from '@/lib/auth'

const ADMIN_NAV = [
  { href: '/dashboard',    icon: '⊞', label: 'Dashboard' },
  { href: '/reservas',     icon: '🏟', label: 'Alquiler Cancha' },
  { href: '/campeonatos',  icon: '🏆', label: 'Campeonatos' },
  { href: '/inventario',   icon: '📦', label: 'Inventario' },
  { href: '/ventas',       icon: '💰', label: 'Ventas / Caja' },
  { href: '/reportes',     icon: '📊', label: 'Reportes' },
  { href: '/admin',        icon: '⚙️', label: 'Configuración' },
]

const CAJERO_NAV = [
  { href: '/reservas',  icon: '🏟', label: 'Alquiler Cancha' },
  { href: '/ventas',    icon: '💰', label: 'Ventas / Caja' },
]

export default function Sidebar() {
  const pathname  = usePathname()
  const { user, logout, isAdmin } = useAuth()
  const [col, setCol] = useState(false)

  const nav = isAdmin ? ADMIN_NAV : CAJERO_NAV

  return (
    <aside
      className="fixed left-0 top-0 h-screen flex flex-col z-40 transition-all duration-300"
      style={{
        width: col ? 64 : 224,
        background: 'linear-gradient(180deg,#130a0e 0%,#080508 100%)',
        borderRight: '1px solid rgba(249,115,22,0.12)',
      }}>

      {/* Header */}
      <div className="flex items-center gap-3 px-3 py-4 border-b border-white/5">
        <div className="flex-shrink-0">
          <svg width="36" height="40" viewBox="0 0 64 72" fill="none">
            <path d="M32 2 L60 12 L60 38 C60 53 46 63 32 70 C18 63 4 53 4 38 L4 12 Z"
              fill="#7c3aed" stroke="#f97316" strokeWidth="2.5"/>
            <path d="M32 8 L54 16 L54 38 C54 50 42 59 32 64 C22 59 10 50 10 38 L10 16 Z"
              fill="#6d28d9"/>
            <text x="32" y="47" textAnchor="middle"
              fontFamily="Oswald,sans-serif" fontWeight="700" fontSize="13"
              fill="#f97316" stroke="white" strokeWidth="0.4">INV</text>
          </svg>
        </div>
        {!col && (
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold tracking-widest truncate"
              style={{ fontFamily:'Oswald,sans-serif', color:'#f97316' }}>INVICTOS</div>
            <div className="text-white/30 text-xs truncate">Cancha Sintética</div>
          </div>
        )}
        <button onClick={() => setCol(!col)}
          className="flex-shrink-0 text-white/20 hover:text-orange-400 transition-colors text-lg leading-none">
          {col ? '›' : '‹'}
        </button>
      </div>

      {/* Role badge */}
      {!col && (
        <div className="px-4 py-2 border-b border-white/5">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full"
              style={{ background: isAdmin ? '#f97316' : '#22c55e' }} />
            <span className="text-xs" style={{ color: isAdmin ? '#f97316' : '#22c55e' }}>
              {isAdmin ? 'Administrador' : 'Cajero'}
            </span>
          </div>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 flex flex-col gap-0.5">
        {nav.map(item => {
          const active = item.href === '/dashboard'
            ? pathname === '/dashboard'
            : pathname.startsWith(item.href)
          return (
            <Link key={item.href} href={item.href}
              title={col ? item.label : undefined}
              className="flex items-center gap-3 px-2.5 py-2.5 rounded-xl transition-all text-sm"
              style={{
                color:      active ? '#fff' : 'rgba(255,255,255,0.35)',
                background: active
                  ? 'linear-gradient(90deg,rgba(249,115,22,0.18),rgba(124,58,237,0.1))'
                  : 'transparent',
                border: active ? '1px solid rgba(249,115,22,0.25)' : '1px solid transparent',
              }}
              onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
              onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}>
              <span className="flex-shrink-0 w-5 text-center text-base">{item.icon}</span>
              {!col && <span className="truncate font-medium">{item.label}</span>}
            </Link>
          )
        })}
      </nav>

      {/* Logout */}
      <div className="px-2 pb-4 border-t border-white/5 pt-2">
        <button onClick={logout} title={col ? 'Cerrar sesión' : undefined}
          className="flex items-center gap-3 px-2.5 py-2.5 rounded-xl transition-all text-sm w-full
                     text-white/25 hover:text-red-400 hover:bg-red-500/10">
          <span className="flex-shrink-0 w-5 text-center">🔒</span>
          {!col && <span className="truncate">Cerrar sesión</span>}
        </button>
      </div>
    </aside>
  )
}
