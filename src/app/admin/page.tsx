'use client'
import { useEffect, useState } from 'react'
import AppLayout from '@/components/ui/AppLayout'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { useRouter } from 'next/navigation'

export default function AdminPage() {
  const { isAdmin } = useAuth()
  const router = useRouter()
  const [pinAdmin, setPinAdmin] = useState('')
  const [pinCajero, setPinCajero] = useState('')
  const [newPinAdmin, setNewPinAdmin] = useState('')
  const [newPinCajero, setNewPinCajero] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isAdmin) { router.replace('/'); return }
    fetchPins()
  }, [isAdmin])

  async function fetchPins() {
    const { data } = await supabase.from('app_config').select('key, value').in('key', ['pin_admin', 'pin_cajero'])
    const configs = data || []
    setPinAdmin(configs.find(c => c.key === 'pin_admin')?.value || '1234')
    setPinCajero(configs.find(c => c.key === 'pin_cajero')?.value || '5678')
    setLoading(false)
  }

  async function savePins() {
    if (newPinAdmin && (newPinAdmin.length < 4 || newPinAdmin.length > 6 || !/^\d+$/.test(newPinAdmin))) {
      setMsg('El PIN debe ser numérico y tener 4-6 dígitos'); return
    }
    if (newPinCajero && (newPinCajero.length < 4 || newPinCajero.length > 6 || !/^\d+$/.test(newPinCajero))) {
      setMsg('El PIN debe ser numérico y tener 4-6 dígitos'); return
    }

    setSaving(true)
    setMsg('')

    const upserts = []
    if (newPinAdmin) upserts.push({ key: 'pin_admin', value: newPinAdmin })
    if (newPinCajero) upserts.push({ key: 'pin_cajero', value: newPinCajero })

    if (upserts.length > 0) {
      const { error } = await supabase.from('app_config').upsert(upserts, { onConflict: 'key' })
      if (error) { setMsg('Error al guardar: ' + error.message); setSaving(false); return }
    }

    setSaving(false)
    setMsg('✓ PINs actualizados correctamente')
    setNewPinAdmin('')
    setNewPinCajero('')
    fetchPins()
    setTimeout(() => setMsg(''), 3000)
  }

  if (!isAdmin) return null

  return (
    <AppLayout>
      <div className="space-y-6 animate-in max-w-xl">
        <div>
          <h1 className="section-title text-white">Configuración</h1>
          <p className="text-white/40 text-sm mt-1">Solo visible para el Administrador</p>
        </div>

        <div className="card space-y-6">
          <h2 className="text-white/70 text-sm font-medium uppercase tracking-wider">🔐 PINs de acceso</h2>

          {loading ? (
            <div className="text-white/30 text-sm">Cargando...</div>
          ) : (
            <div className="space-y-5">
              {/* Admin PIN */}
              <div className="p-4 rounded-xl border border-orange-500/20" style={{ background: 'rgba(249,115,22,0.05)' }}>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="text-orange-400 text-sm font-medium">PIN Administrador</div>
                    <div className="text-white/30 text-xs mt-0.5">Acceso total · PIN actual: {'•'.repeat(pinAdmin.length)}</div>
                  </div>
                  <div className="w-2.5 h-2.5 rounded-full bg-orange-400" />
                </div>
                <div>
                  <label className="label">Nuevo PIN (4-6 dígitos)</label>
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={6}
                    className="input-field"
                    value={newPinAdmin}
                    onChange={e => setNewPinAdmin(e.target.value.replace(/\D/g, ''))}
                    placeholder="Dejar vacío para no cambiar"
                  />
                </div>
              </div>

              {/* Cajero PIN */}
              <div className="p-4 rounded-xl border border-green-500/20" style={{ background: 'rgba(34,197,94,0.05)' }}>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="text-green-400 text-sm font-medium">PIN Cajero</div>
                    <div className="text-white/30 text-xs mt-0.5">Ventas y alquiler · PIN actual: {'•'.repeat(pinCajero.length)}</div>
                  </div>
                  <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
                </div>
                <div>
                  <label className="label">Nuevo PIN (4-6 dígitos)</label>
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={6}
                    className="input-field"
                    value={newPinCajero}
                    onChange={e => setNewPinCajero(e.target.value.replace(/\D/g, ''))}
                    placeholder="Dejar vacío para no cambiar"
                  />
                </div>
              </div>

              {msg && (
                <div className={`text-sm px-3 py-2 rounded-lg ${msg.startsWith('✓') ? 'text-green-400 bg-green-500/10' : 'text-red-400 bg-red-500/10'}`}>
                  {msg}
                </div>
              )}

              <button onClick={savePins} disabled={saving || (!newPinAdmin && !newPinCajero)} className="btn-primary w-full justify-center">
                {saving ? 'Guardando...' : '✓ Guardar PINs'}
              </button>
            </div>
          )}
        </div>

        {/* Permisos info */}
        <div className="card space-y-3">
          <h2 className="text-white/70 text-sm font-medium uppercase tracking-wider">👥 Permisos por rol</h2>
          <div className="space-y-2 text-xs text-white/50">
            {[
              ['⊞ Dashboard', '✓ Admin', '✗ Cajero'],
              ['🏟 Alquiler Cancha', '✓ Admin (+ borrar)', '✓ Cajero'],
              ['🏆 Campeonatos', '✓ Admin (+ borrar)', '✗ Cajero'],
              ['📦 Productos', '✓ Admin (+ modificar stock)', '✗ Cajero'],
              ['🧃 Bebidas', '✓ Admin (+ modificar stock)', '✗ Cajero'],
              ['💰 Ventas / Caja', '✓ Admin (+ borrar)', '✓ Cajero (solo ver + vender)'],
              ['📊 Reportes', '✓ Admin', '✗ Cajero'],
              ['⚙️ Configuración', '✓ Admin', '✗ Cajero'],
            ].map(([page, admin, cajero]) => (
              <div key={page as string} className="grid grid-cols-3 gap-2 py-1.5 border-b border-white/5">
                <span className="text-white/70">{page}</span>
                <span className="text-orange-400">{admin}</span>
                <span className={cajero.startsWith('✓') ? 'text-green-400' : 'text-white/25'}>{cajero}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
