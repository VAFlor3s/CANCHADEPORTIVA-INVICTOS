'use client'
import { useState } from 'react'
import { useAuth } from '@/lib/auth'

export default function LoginScreen() {
  const { login } = useAuth()
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [shake, setShake] = useState(false)

  async function handleDigit(d: string) {
    if (pin.length >= 6) return
    const next = pin + d
    setPin(next)
    setError('')

    if (next.length >= 4) {
      setLoading(true)
      const res = await login(next)
      setLoading(false)
      if (!res.success) {
        setError(res.error || 'PIN incorrecto')
        setShake(true)
        setTimeout(() => { setShake(false); setPin('') }, 600)
      }
    }
  }

  function handleDelete() {
    setPin(p => p.slice(0, -1))
    setError('')
  }

  const DIGITS = ['1','2','3','4','5','6','7','8','9','','0','⌫']

  return (
    <div className="min-h-screen flex items-center justify-center"
      style={{ background: 'linear-gradient(135deg, #0f0800 0%, #12050e 100%)', paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="flex flex-col items-center gap-8 w-full max-w-xs px-6">

        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <svg viewBox="0 0 60 66" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-16 h-16">
            <path d="M30 3 L54 12 L54 36 C54 49.5 42 59 30 64.5 C18 59 6 49.5 6 36 L6 12 Z" fill="#7c3aed" stroke="#f97316" strokeWidth="2"/>
            <path d="M30 9 L48 16.5 L48 36 C48 46.5 39 55 30 59 C21 55 12 46.5 12 36 L12 16.5 Z" fill="#6d28d9"/>
            <text x="30" y="42" textAnchor="middle" fontFamily="Oswald, sans-serif" fontWeight="700" fontSize="16" fill="#f97316" stroke="#fff" strokeWidth="0.4">INV</text>
            <circle cx="30" cy="29" r="9" fill="none" stroke="#f97316" strokeWidth="1.5" opacity="0.6"/>
          </svg>
          <div className="text-center">
            <div className="text-orange-400 font-bold text-xl tracking-widest" style={{ fontFamily: 'Oswald, sans-serif' }}>
              INVICTOS
            </div>
            <div className="text-white/40 text-xs tracking-wider">Cancha Sintética · Sistema</div>
          </div>
        </div>

        {/* PIN display */}
        <div className="flex flex-col items-center gap-3">
          <p className="text-white/50 text-sm">Ingresa tu PIN</p>
          <div className={`flex gap-3 transition-transform ${shake ? 'animate-shake' : ''}`}>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i}
                className="w-4 h-4 rounded-full border-2 transition-all duration-150"
                style={{
                  borderColor: i < pin.length ? '#f97316' : 'rgba(255,255,255,0.2)',
                  background: i < pin.length ? '#f97316' : 'transparent',
                }}
              />
            ))}
          </div>
          {error && (
            <p className="text-red-400 text-xs text-center">{error}</p>
          )}
        </div>

        {/* Keypad */}
        <div className="grid grid-cols-3 gap-3 w-full">
          {DIGITS.map((d, i) => (
            d === '' ? (
              <div key={i} />
            ) : d === '⌫' ? (
              <button key={i} onClick={handleDelete}
                className="h-14 rounded-2xl flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-all text-xl"
                disabled={loading}>
                {d}
              </button>
            ) : (
              <button key={i} onClick={() => handleDigit(d)}
                disabled={loading}
                className="h-14 rounded-2xl flex items-center justify-center text-white text-xl font-medium transition-all active:scale-95"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(249,115,22,0.15)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}>
                {loading ? '·' : d}
              </button>
            )
          ))}
        </div>

        <p className="text-white/20 text-xs text-center">
          Acceso restringido · Solo personal autorizado
        </p>
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-8px); }
          40% { transform: translateX(8px); }
          60% { transform: translateX(-6px); }
          80% { transform: translateX(6px); }
        }
        .animate-shake { animation: shake 0.5s ease-in-out; }
      `}</style>
    </div>
  )
}
