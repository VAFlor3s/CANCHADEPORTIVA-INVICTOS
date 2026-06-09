'use client'
import { useEffect, useState } from 'react'
import AppLayout from '@/components/ui/AppLayout'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { useRouter } from 'next/navigation'

export default function AdminPage() {
  const { isAdmin } = useAuth()
  const router = useRouter()
  const [pins, setPins]         = useState({ admin: '', cajero: '' })
  const [newPins, setNewPins]   = useState({ admin: '', cajero: '' })
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)
  const [msg, setMsg]           = useState<{text:string;ok:boolean}|null>(null)
  const [fields, setFields]     = useState<any[]>([])
  const [newField, setNewField] = useState({ name: '', sport_type: 'fútbol', price_per_hour: 0 })
  const [savingF, setSavingF]   = useState(false)

  useEffect(() => {
    if (!isAdmin) { router.replace('/dashboard'); return }
    loadData()
  }, [isAdmin])

  async function loadData() {
    setLoading(true)
    const [cfgRes, fRes] = await Promise.all([
      supabase.from('app_config').select('key, value').in('key', ['pin_admin','pin_cajero']),
      supabase.from('fields').select('*').eq('is_active', true).order('name'),
    ])
    const cfg = cfgRes.data || []
    setPins({
      admin:  cfg.find(c => c.key === 'pin_admin')?.value  || '1234',
      cajero: cfg.find(c => c.key === 'pin_cajero')?.value || '5678',
    })
    setFields(fRes.data || [])
    setLoading(false)
  }

  async function savePins() {
    const a = newPins.admin.trim()
    const c = newPins.cajero.trim()
    if (!a && !c) { setMsg({ text: 'Ingresa al menos un PIN para cambiar', ok: false }); return }
    if (a && (a.length < 4 || a.length > 6 || !/^\d+$/.test(a)))
      { setMsg({ text: 'PIN Admin: debe ser numérico de 4-6 dígitos', ok: false }); return }
    if (c && (c.length < 4 || c.length > 6 || !/^\d+$/.test(c)))
      { setMsg({ text: 'PIN Cajero: debe ser numérico de 4-6 dígitos', ok: false }); return }

    setSaving(true)
    const upserts = []
    if (a) upserts.push({ key: 'pin_admin',  value: a })
    if (c) upserts.push({ key: 'pin_cajero', value: c })
    const { error } = await supabase.from('app_config').upsert(upserts, { onConflict: 'key' })
    setSaving(false)
    if (error) { setMsg({ text: 'Error: ' + error.message, ok: false }); return }
    setMsg({ text: '✓ PINs actualizados correctamente', ok: true })
    setNewPins({ admin: '', cajero: '' })
    loadData()
    setTimeout(() => setMsg(null), 4000)
  }

  async function saveField() {
    if (!newField.name) return
    setSavingF(true)
    await supabase.from('fields').insert([{ ...newField }])
    setSavingF(false)
    setNewField({ name: '', sport_type: 'fútbol', price_per_hour: 0 })
    loadData()
  }

  async function deactivateField(id: string) {
    if (!confirm('¿Desactivar esta cancha?')) return
    await supabase.from('fields').update({ is_active: false }).eq('id', id)
    loadData()
  }

  if (!isAdmin) return null

  return (
    <AppLayout>
      <div className="space-y-6 max-w-2xl">
        <div>
          <h1 className="ttitle">Configuración</h1>
          <p className="text-white/30 text-sm mt-1">Solo visible para el Administrador</p>
        </div>

        {loading ? (
          <div className="text-white/20 text-sm">Cargando...</div>
        ) : (
          <>
            {/* PINs */}
            <div className="card space-y-5">
              <h2 className="text-white/50 text-xs uppercase tracking-wider">🔐 PINs de acceso</h2>

              <div className="space-y-4">
                <div className="p-4 rounded-xl border border-orange-500/20" style={{ background:'rgba(249,115,22,0.05)' }}>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-2 h-2 rounded-full bg-orange-400" />
                    <span className="text-orange-400 text-sm font-medium">Administrador</span>
                    <span className="text-white/25 text-xs ml-auto">PIN actual: {'•'.repeat(pins.admin.length)}</span>
                  </div>
                  <label className="label">Nuevo PIN (4–6 dígitos)</label>
                  <input type="password" inputMode="numeric" maxLength={6} className="input"
                    value={newPins.admin} placeholder="Dejar vacío para no cambiar"
                    onChange={e => setNewPins(p => ({ ...p, admin: e.target.value.replace(/\D/g,'') }))} />
                </div>

                <div className="p-4 rounded-xl border border-green-500/20" style={{ background:'rgba(34,197,94,0.05)' }}>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-2 h-2 rounded-full bg-green-400" />
                    <span className="text-green-400 text-sm font-medium">Cajero</span>
                    <span className="text-white/25 text-xs ml-auto">PIN actual: {'•'.repeat(pins.cajero.length)}</span>
                  </div>
                  <label className="label">Nuevo PIN (4–6 dígitos)</label>
                  <input type="password" inputMode="numeric" maxLength={6} className="input"
                    value={newPins.cajero} placeholder="Dejar vacío para no cambiar"
                    onChange={e => setNewPins(p => ({ ...p, cajero: e.target.value.replace(/\D/g,'') }))} />
                </div>

                {msg && (
                  <p className={`text-sm px-3 py-2 rounded-lg ${msg.ok ? 'text-green-400 bg-green-500/10' : 'text-red-400 bg-red-500/10'}`}>
                    {msg.text}
                  </p>
                )}

                <button onClick={savePins} disabled={saving || (!newPins.admin && !newPins.cajero)}
                  className="btn btn-primary w-full justify-center">
                  {saving ? 'Guardando...' : '✓ Actualizar PINs'}
                </button>
              </div>
            </div>

            {/* Canchas */}
            <div className="card space-y-4">
              <h2 className="text-white/50 text-xs uppercase tracking-wider">🏟 Canchas</h2>

              <div className="space-y-2">
                {fields.map(f => (
                  <div key={f.id} className="flex items-center gap-3 py-2.5 px-3 rounded-xl"
                    style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)' }}>
                    <div className="flex-1">
                      <div className="text-white text-sm font-medium">{f.name}</div>
                      <div className="text-white/30 text-xs">{f.sport_type} · {new Intl.NumberFormat('es-CO',{style:'currency',currency:'COP',minimumFractionDigits:0}).format(f.price_per_hour)}/h</div>
                    </div>
                    <button onClick={() => deactivateField(f.id)} className="btn btn-danger px-2 py-1 text-xs">🗑</button>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-3 gap-3 pt-2 border-t border-white/5">
                <div>
                  <label className="label">Nombre</label>
                  <input className="input" value={newField.name} onChange={e => setNewField(p => ({ ...p, name: e.target.value }))} placeholder="Cancha 3" />
                </div>
                <div>
                  <label className="label">Deporte</label>
                  <input className="input" value={newField.sport_type} onChange={e => setNewField(p => ({ ...p, sport_type: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Precio/hora</label>
                  <input type="number" className="input" value={newField.price_per_hour} onChange={e => setNewField(p => ({ ...p, price_per_hour: Number(e.target.value) }))} min="0" />
                </div>
              </div>
              <button onClick={saveField} disabled={savingF || !newField.name} className="btn btn-primary">
                {savingF ? 'Guardando...' : '+ Agregar Cancha'}
              </button>
            </div>

            {/* Permisos */}
            <div className="card">
              <h2 className="text-white/50 text-xs uppercase tracking-wider mb-4">👥 Permisos por rol</h2>
              <div className="space-y-1.5">
                {[
                  ['⊞ Dashboard',        '✓ Admin',          '✗'],
                  ['🏟 Alquiler Cancha', '✓ Admin + borrar', '✓ Cajero'],
                  ['🏆 Campeonatos',     '✓ Admin + borrar', '✗'],
                  ['📦 Inventario',      '✓ Admin + editar', '✗'],
                  ['💰 Ventas / Caja',   '✓ Admin + borrar', '✓ Cajero'],
                  ['📊 Reportes',        '✓ Admin',          '✗'],
                  ['⚙️ Configuración',   '✓ Admin',          '✗'],
                ].map(([page, admin, cajero]) => (
                  <div key={page as string} className="grid grid-cols-3 gap-2 py-2 border-b border-white/5 text-xs">
                    <span className="text-white/60">{page}</span>
                    <span className="text-orange-400">{admin}</span>
                    <span className={cajero.startsWith('✓') ? 'text-green-400' : 'text-white/20'}>{cajero}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </AppLayout>
  )
}
