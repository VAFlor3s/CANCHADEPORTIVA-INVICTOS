'use client'
import { useState } from 'react'
import { useAuth } from '@/lib/auth'

export default function LoginScreen() {
  const { login } = useAuth()
  const [pin, setPin]       = useState('')
  const [error, setError]   = useState('')
  const [busy, setBusy]     = useState(false)
  const [shake, setShake]   = useState(false)

  async function press(d: string) {
    if (busy || pin.length >= 6) return
    const next = pin + d
    setPin(next)
    setError('')
    if (next.length < 4) return

    setBusy(true)
    const res = await login(next)
    setBusy(false)

    if (res === 'ok') return // AuthProvider will re-render with user set
    if (res === 'wrong') {
      setError('PIN incorrecto')
      setShake(true)
      setTimeout(() => { setShake(false); setPin('') }, 700)
    } else {
      setError('Error de conexión, intenta de nuevo')
      setTimeout(() => setPin(''), 500)
    }
  }

  function del() { if (!busy) { setPin(p => p.slice(0, -1)); setError('') } }

  const KEYS = ['1','2','3','4','5','6','7','8','9','_','0','⌫']

  return (
    <div className="min-h-screen flex items-center justify-center px-6"
      style={{ background: 'radial-gradient(ellipse at top, #1a0d00 0%, #0a0506 100%)' }}>

      <div className="w-full max-w-xs flex flex-col items-center gap-8">

        {/* Logo */}
        <div className="flex flex-col items-center gap-3 select-none">
          <svg width="64" height="72" viewBox="0 0 64 72" fill="none">
            <path d="M32 2 L60 12 L60 38 C60 53 46 63 32 70 C18 63 4 53 4 38 L4 12 Z"
              fill="#7c3aed" stroke="#f97316" strokeWidth="2.5"/>
            <path d="M32 8 L54 16 L54 38 C54 50 42 59 32 64 C22 59 10 50 10 38 L10 16 Z"
              fill="#6d28d9"/>
            <circle cx="32" cy="30" r="11" fill="none" stroke="#f97316" strokeWidth="1.5" opacity="0.5"/>
            <text x="32" y="47" textAnchor="middle"
              fontFamily="Oswald, sans-serif" fontWeight="700" fontSize="13"
              fill="#f97316" stroke="white" strokeWidth="0.4">INV</text>
          </svg>
          <div className="text-center">
            <div className="text-lg font-bold tracking-widest" style={{ fontFamily: 'Oswald, sans-serif', color: '#f97316' }}>
              INVICTOS
            </div>
            <div className="text-white/30 text-xs tracking-wider">Cancha Sintética · Sistema</div>
          </div>
        </div>

        {/* Dots */}
        <div className="flex flex-col items-center gap-3">
          <p className="text-white/40 text-sm">Ingresa tu PIN de acceso</p>
          <div className={`flex gap-4 ${shake ? 'animate-shake' : ''}`}>
            {[0,1,2,3].map(i => (
              <div key={i} className="w-3.5 h-3.5 rounded-full border-2 transition-all duration-200"
                style={{
                  borderColor: i < pin.length ? '#f97316' : 'rgba(255,255,255,0.15)',
                  background:  i < pin.length ? '#f97316' : 'transparent',
                  transform:   i < pin.length ? 'scale(1.1)' : 'scale(1)',
                }} />
            ))}
          </div>
          <div className="h-5">
            {error && <p className="text-red-400 text-xs text-center">{error}</p>}
            {busy  && <p className="text-white/30 text-xs text-center">Verificando...</p>}
          </div>
        </div>

        {/* Keypad */}
        <div className="grid grid-cols-3 gap-3 w-full">
          {KEYS.map((k, i) => {
            if (k === '_') return <div key={i} />
            if (k === '⌫') return (
              <button key={i} onClick={del} disabled={busy}
                className="h-14 rounded-2xl text-white/30 hover:text-white hover:bg-white/10
                           transition-all text-2xl flex items-center justify-center active:scale-95">
                {k}
              </button>
            )
            return (
              <button key={i} onClick={() => press(k)} disabled={busy}
                className="h-14 rounded-2xl text-white text-xl font-medium transition-all
                           active:scale-95 active:brightness-125 select-none"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(249,115,22,0.18)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}>
                {k}
              </button>
            )
          })}
        </div>

        <p className="text-white/15 text-xs text-center">Acceso restringido · Solo personal autorizado</p>
      </div>

      <style>{`
        @keyframes shake {
          0%,100%{transform:translateX(0)}
          15%{transform:translateX(-10px)}
          30%{transform:translateX(10px)}
          45%{transform:translateX(-7px)}
          60%{transform:translateX(7px)}
          75%{transform:translateX(-4px)}
          90%{transform:translateX(4px)}
        }
        .animate-shake { animation: shake 0.65s ease-in-out; }
      `}</style>
    </div>
  )
}
