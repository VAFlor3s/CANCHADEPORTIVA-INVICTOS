'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/auth'

const NAV_ADMIN = [
  { href: '/dashboard',   label: 'Dashboard',       icon: '⊞' },
  { href: '/reservas',    label: 'Alquiler Cancha',  icon: '🏟' },
  { href: '/campeonatos', label: 'Campeonatos',      icon: '🏆' },
  { href: '/inventario',  label: 'Inventario',       icon: '📦' },
  { href: '/ventas',      label: 'Ventas / Caja',    icon: '💰' },
  { href: '/reportes',    label: 'Reportes',         icon: '📊' },
  { href: '/admin',       label: 'Configuración',    icon: '⚙️' },
]
const NAV_CAJERO = [
  { href: '/reservas', label: 'Alquiler Cancha', icon: '🏟' },
  { href: '/ventas',   label: 'Ventas / Caja',   icon: '💰' },
]
const BOTTOM_ADMIN  = ['/dashboard', '/reservas', '/ventas', '/inventario', '/reportes']
const BOTTOM_CAJERO = ['/reservas', '/ventas']

function Logo({ small }: { small?: boolean }) {
  return (
    <svg viewBox="0 0 40 44" fill="none" xmlns="http://www.w3.org/2000/svg"
      className={small ? 'w-7 h-7 flex-shrink-0' : 'w-9 h-9 flex-shrink-0'}>
      <path d="M20 2 L36 8 L36 24 C36 33 28 40 20 43 C12 40 4 33 4 24 L4 8 Z" fill="#7c3aed" stroke="#f97316" strokeWidth="1.5"/>
      <path d="M20 6 L32 11 L32 24 C32 31 26 37 20 39.5 C14 37 8 31 8 24 L8 11 Z" fill="#6d28d9"/>
      <text x="20" y="28" textAnchor="middle" fontFamily="Oswald,sans-serif" fontWeight="700" fontSize="11" fill="#f97316">INV</text>
      <circle cx="20" cy="19" r="6" fill="none" stroke="#f97316" strokeWidth="1" opacity="0.6"/>
    </svg>
  )
}

function MoreMenu({ nav, bottomKeys, isActive }: { nav: typeof NAV_ADMIN; bottomKeys: string[]; isActive: (h: string) => boolean }) {
  const [open, setOpen] = useState(false)
  const extras = nav.filter(n => !bottomKeys.includes(n.href))
  const anyActive = extras.some(n => isActive(n.href))
  return (
    <div className="flex-1 flex flex-col items-center justify-center py-2.5 gap-0.5 relative">
      <button onClick={() => setOpen(!open)} className="flex flex-col items-center gap-0.5 w-full"
        style={{ color: open || anyActive ? '#f97316' : 'rgba(255,255,255,0.3)' }}>
        <span className="text-[22px] leading-none">⋯</span>
        <span className="text-[9px] font-medium tracking-wide">Más</span>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute bottom-16 right-0 z-40 rounded-2xl overflow-hidden shadow-2xl min-w-48"
            style={{ background: '#1a0a14', border: '1px solid rgba(249,115,22,0.2)' }}>
            {extras.map(item => (
              <Link key={item.href} href={item.href} onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-4 py-3 text-sm transition-all"
                style={{ color: isActive(item.href) ? '#f97316' : 'rgba(255,255,255,0.7)', background: isActive(item.href) ? 'rgba(249,115,22,0.1)' : 'transparent' }}>
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export default function Sidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const { user, logout, isAdmin } = useAuth()
  const NAV = isAdmin ? NAV_ADMIN : NAV_CAJERO
  const BOTTOM_KEYS = isAdmin ? BOTTOM_ADMIN : BOTTOM_CAJERO
  const bottomNav = NAV.filter(n => BOTTOM_KEYS.includes(n.href))

  useEffect(() => {
    const el = document.getElementById('app-main')
    if (!el) return
    const sync = () => { el.style.marginLeft = window.innerWidth < 768 ? '0' : collapsed ? '68px' : '230px' }
    sync()
    window.addEventListener('resize', sync)
    return () => window.removeEventListener('resize', sync)
  }, [collapsed])

  const isActive = (href: string) => pathname === href || (href !== '/dashboard' && pathname.startsWith(href))

  return (
    <>
      {/* DESKTOP SIDEBAR */}
      <aside className="hidden md:flex fixed left-0 top-0 h-screen flex-col z-40 transition-all duration-300"
        style={{ width: collapsed ? 68 : 230, background: 'linear-gradient(180deg,#12080f 0%,#0a0508 100%)', borderRight: '1px solid rgba(249,115,22,0.15)' }}>
        <div className="flex items-center gap-3 px-4 py-4 border-b border-orange-500/10">
          <Logo />
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <div className="font-bold text-sm tracking-widest" style={{ fontFamily: 'Oswald,sans-serif', color: '#f97316' }}>INVICTOS</div>
              <div className="text-white/50 text-xs truncate">Cancha Sintética</div>
            </div>
          )}
          <button onClick={() => setCollapsed(!collapsed)}
            className="ml-auto text-white/20 hover:text-orange-400 transition-colors text-lg leading-none flex-shrink-0">
            {collapsed ? '›' : '‹'}
          </button>
        </div>
        {!collapsed && user && (
          <div className="px-4 py-2 border-b border-white/5 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full flex-shrink-0 inline-block" style={{ background: isAdmin ? '#f97316' : '#22c55e' }} />
            <span className="text-xs truncate" style={{ color: isAdmin ? '#f97316' : '#22c55e' }}>
              {isAdmin ? 'Administrador' : 'Cajero'}
            </span>
          </div>
        )}
        <nav className="flex-1 py-3 px-2 flex flex-col gap-0.5 overflow-y-auto">
          {NAV.map(item => {
            const active = isActive(item.href)
            return (
              <Link key={item.href} href={item.href} title={collapsed ? item.label : undefined}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm font-medium ${active ? 'text-white border border-orange-500/30' : 'text-white/40 hover:text-white/80 hover:bg-white/5'}`}
                style={active ? { background: 'linear-gradient(90deg,rgba(249,115,22,0.15),rgba(124,58,237,0.1))' } : {}}>
                <span className="text-base flex-shrink-0 w-5 text-center">{item.icon}</span>
                {!collapsed && <span className="truncate">{item.label}</span>}
              </Link>
            )
          })}
        </nav>
        <div className="px-2 pb-3 border-t border-orange-500/10 pt-2">
          <button onClick={logout} title={collapsed ? 'Cerrar sesión' : undefined}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-white/30 hover:text-red-400 hover:bg-red-500/10 w-full transition-all">
            <span className="text-base flex-shrink-0 w-5 text-center">🔒</span>
            {!collapsed && <span>Cerrar sesión</span>}
          </button>
        </div>
      </aside>

      {/* MOBILE HEADER */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4"
        style={{ background: 'rgba(18,8,15,0.96)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(249,115,22,0.12)', paddingTop: 'max(12px,env(safe-area-inset-top))', paddingBottom: '12px' }}>
        <div className="flex items-center gap-2.5">
          <Logo small />
          <div>
            <div className="text-orange-400 font-bold text-sm tracking-widest leading-tight" style={{ fontFamily: 'Oswald,sans-serif' }}>INVICTOS</div>
            <div className="text-white/30 text-[10px] leading-tight">{isAdmin ? 'Administrador' : 'Cajero'}</div>
          </div>
        </div>
        <button onClick={logout} className="text-white/30 hover:text-red-400 transition-colors p-2 rounded-xl hover:bg-red-500/10">
          🔒
        </button>
      </header>

      {/* MOBILE SPACER */}
      <div className="md:hidden" style={{ height: 'calc(52px + env(safe-area-inset-top))' }} />

      {/* MOBILE BOTTOM NAV */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 flex"
        style={{ background: 'rgba(10,5,8,0.97)', backdropFilter: 'blur(16px)', borderTop: '1px solid rgba(249,115,22,0.12)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
        {bottomNav.map(item => {
          const active = isActive(item.href)
          return (
            <Link key={item.href} href={item.href}
              className="flex-1 flex flex-col items-center justify-center py-2.5 gap-0.5 transition-all relative"
              style={{ color: active ? '#f97316' : 'rgba(255,255,255,0.3)' }}>
              <span className="text-[22px] leading-none">{item.icon}</span>
              <span className="text-[9px] font-medium tracking-wide leading-tight">{item.label.split(' ')[0]}</span>
              {active && <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-5 h-0.5 rounded-full bg-orange-400" />}
            </Link>
          )
        })}
        {isAdmin && <MoreMenu nav={NAV} bottomKeys={BOTTOM_KEYS} isActive={isActive} />}
      </nav>
    </>
  )
}
