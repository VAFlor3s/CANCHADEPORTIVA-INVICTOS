'use client'
import { useEffect, useState } from 'react'
import AppLayout from '@/components/ui/AppLayout'
import Modal from '@/components/ui/Modal'
import { supabase, Championship, Team } from '@/lib/supabase'
import { fmt, fmtDate, STATUS_COLOR, STATUS_LABEL } from '@/lib/utils'
import { useAuth } from '@/lib/auth'

const EMPTY_C = { name: '', sport_type: 'fútbol', category: '', start_date: '', end_date: '', registration_fee: 0, prize: '', max_teams: 0, status: 'inscripcion', notes: '' }
const EMPTY_T = { name: '', captain_name: '', captain_phone: '', player_count: 0, registration_paid: false, amount_paid: 0, notes: '' }

export default function CampeonatosPage() {
  const { isAdmin } = useAuth()
  const [champs, setChamps]     = useState<Championship[]>([])
  const [teams, setTeams]       = useState<Team[]>([])
  const [sel, setSel]           = useState<Championship|null>(null)
  const [loading, setLoading]   = useState(true)
  const [openC, setOpenC]       = useState(false)
  const [openT, setOpenT]       = useState(false)
  const [formC, setFormC]       = useState({ ...EMPTY_C })
  const [formT, setFormT]       = useState({ ...EMPTY_T })
  const [saving, setSaving]     = useState(false)
  const [delC, setDelC]         = useState<string|null>(null)
  const [delT, setDelT]         = useState<string|null>(null)

  useEffect(() => { loadChamps() }, [])
  useEffect(() => { if (sel) loadTeams(sel.id) }, [sel])

  async function loadChamps() {
    setLoading(true)
    const { data } = await supabase.from('championships').select('*').order('created_at', { ascending: false })
    setChamps(data || [])
    setLoading(false)
  }

  async function loadTeams(cid: string) {
    const { data } = await supabase.from('teams').select('*').eq('championship_id', cid).order('name')
    setTeams(data || [])
  }

  async function saveChamp() {
    if (!formC.name) { alert('El nombre es obligatorio'); return }
    setSaving(true)
    await supabase.from('championships').insert([{ ...formC, start_date: formC.start_date || null, end_date: formC.end_date || null, max_teams: formC.max_teams || null }])
    setSaving(false)
    setOpenC(false)
    setFormC({ ...EMPTY_C })
    loadChamps()
  }

  async function saveTeam() {
    if (!sel || !formT.name) { alert('El nombre del equipo es obligatorio'); return }
    setSaving(true)
    await supabase.from('teams').insert([{ ...formT, championship_id: sel.id }])
    // Si pagó, registrar en ventas
    if (formT.amount_paid > 0) {
      await supabase.from('sales').insert([{
        sale_type: 'campeonato', customer_name: formT.name,
        total_amount: formT.amount_paid, payment_method: 'efectivo',
        notes: `Inscripción ${sel.name}`,
      }])
    }
    setSaving(false)
    setOpenT(false)
    setFormT({ ...EMPTY_T })
    loadTeams(sel.id)
  }

  async function delChamp(id: string) {
    if (!confirm('¿Eliminar campeonato y todos sus equipos?')) return
    setDelC(id)
    await supabase.from('teams').delete().eq('championship_id', id)
    await supabase.from('championships').delete().eq('id', id)
    if (sel?.id === id) setSel(null)
    setDelC(null)
    loadChamps()
  }

  async function delTeam(id: string) {
    if (!confirm('¿Eliminar este equipo?')) return
    setDelT(id)
    await supabase.from('teams').delete().eq('id', id)
    setDelT(null)
    if (sel) loadTeams(sel.id)
  }

  const selTeams = teams.filter(t => t.championship_id === sel?.id)
  const paidTeams = selTeams.filter(t => t.registration_paid)

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="ttitle">Campeonatos</h1>
            <p className="text-white/30 text-sm mt-1">{champs.length} campeonatos</p>
          </div>
          {isAdmin && <button onClick={() => setOpenC(true)} className="btn btn-primary">+ Nuevo Campeonato</button>}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Lista campeonatos */}
          <div className="lg:col-span-2 space-y-3">
            {loading ? (
              <div className="text-white/20 text-sm py-8 text-center">Cargando...</div>
            ) : champs.length === 0 ? (
              <div className="text-white/20 text-sm py-8 text-center">Sin campeonatos</div>
            ) : champs.map(c => (
              <div key={c.id}
                onClick={() => setSel(c)}
                className="card cursor-pointer transition-all"
                style={{
                  borderColor: sel?.id === c.id ? 'rgba(249,115,22,0.5)' : 'rgba(255,255,255,0.1)',
                  background: sel?.id === c.id ? 'rgba(249,115,22,0.08)' : 'rgba(255,255,255,0.04)',
                }}>
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="text-white font-medium truncate">{c.name}</div>
                    <div className="text-white/30 text-xs mt-0.5">{c.sport_type} {c.category ? `· ${c.category}` : ''}</div>
                    <div className="flex items-center gap-2 mt-2">
                      <span className={`badge ${STATUS_COLOR[c.status]}`}>{STATUS_LABEL[c.status]}</span>
                      <span className="text-white/30 text-xs">{fmt(c.registration_fee)}/equipo</span>
                    </div>
                  </div>
                  {isAdmin && (
                    <button onClick={e => { e.stopPropagation(); delChamp(c.id) }} disabled={delC === c.id}
                      className="btn btn-danger px-2 py-1 text-xs ml-2 flex-shrink-0">🗑</button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Detalle campeonato */}
          <div className="lg:col-span-3">
            {!sel ? (
              <div className="card h-64 flex items-center justify-center text-white/20 text-sm">
                Selecciona un campeonato para ver sus equipos
              </div>
            ) : (
              <div className="space-y-4">
                <div className="card">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-white font-semibold">{sel.name}</h2>
                      <p className="text-white/30 text-xs mt-0.5">{sel.sport_type}</p>
                    </div>
                    {isAdmin && <button onClick={() => setOpenT(true)} className="btn btn-primary text-sm">+ Equipo</button>}
                  </div>

                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="kpi">
                      <div className="text-white/35 text-xs">Equipos</div>
                      <div className="text-white font-bold text-xl" style={{ fontFamily: 'Oswald,sans-serif' }}>{selTeams.length}</div>
                    </div>
                    <div className="kpi">
                      <div className="text-white/35 text-xs">Pagaron</div>
                      <div className="text-green-400 font-bold text-xl" style={{ fontFamily: 'Oswald,sans-serif' }}>{paidTeams.length}</div>
                    </div>
                    <div className="kpi">
                      <div className="text-white/35 text-xs">Recaudado</div>
                      <div className="text-orange-400 font-bold text-lg" style={{ fontFamily: 'Oswald,sans-serif' }}>
                        {fmt(paidTeams.reduce((s, t) => s + Number(t.amount_paid), 0))}
                      </div>
                    </div>
                  </div>

                  {selTeams.length === 0 ? (
                    <div className="text-white/20 text-sm py-4 text-center">Sin equipos inscritos</div>
                  ) : (
                    <div className="space-y-2">
                      {selTeams.map(t => (
                        <div key={t.id} className="flex items-center gap-3 py-2.5 px-3 rounded-xl"
                          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                          <div className="flex-1 min-w-0">
                            <div className="text-white text-sm font-medium">{t.name}</div>
                            {t.captain_name && <div className="text-white/30 text-xs">Cap: {t.captain_name}</div>}
                          </div>
                          <div className="text-right">
                            <div className={`text-xs font-medium ${t.registration_paid ? 'text-green-400' : 'text-yellow-400'}`}>
                              {t.registration_paid ? '✓ Pagado' : 'Pendiente'}
                            </div>
                            {t.amount_paid > 0 && <div className="text-white/40 text-xs">{fmt(Number(t.amount_paid))}</div>}
                          </div>
                          {isAdmin && (
                            <button onClick={() => delTeam(t.id)} disabled={delT === t.id}
                              className="btn btn-danger px-2 py-1 text-xs">
                              {delT === t.id ? '...' : '🗑'}
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal nuevo campeonato */}
      <Modal open={openC} onClose={() => { setOpenC(false); setFormC({...EMPTY_C}) }} title="Nuevo Campeonato">
        <div className="space-y-4">
          <div>
            <label className="label">Nombre *</label>
            <input className="input" value={formC.name} onChange={e => setFormC(p => ({ ...p, name: e.target.value }))} placeholder="Nombre del campeonato" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Deporte</label>
              <input className="input" value={formC.sport_type} onChange={e => setFormC(p => ({ ...p, sport_type: e.target.value }))} />
            </div>
            <div>
              <label className="label">Categoría</label>
              <input className="input" value={formC.category} onChange={e => setFormC(p => ({ ...p, category: e.target.value }))} placeholder="Sub-20, Libre, Femenino..." />
            </div>
            <div>
              <label className="label">Fecha inicio</label>
              <input type="date" className="input" value={formC.start_date} onChange={e => setFormC(p => ({ ...p, start_date: e.target.value }))} />
            </div>
            <div>
              <label className="label">Fecha fin</label>
              <input type="date" className="input" value={formC.end_date} onChange={e => setFormC(p => ({ ...p, end_date: e.target.value }))} />
            </div>
            <div>
              <label className="label">Cuota inscripción</label>
              <input type="number" className="input" value={formC.registration_fee} onChange={e => setFormC(p => ({ ...p, registration_fee: Number(e.target.value) }))} min="0" />
            </div>
            <div>
              <label className="label">Máx. equipos</label>
              <input type="number" className="input" value={formC.max_teams} onChange={e => setFormC(p => ({ ...p, max_teams: Number(e.target.value) }))} min="0" />
            </div>
          </div>
          <div>
            <label className="label">Premio</label>
            <input className="input" value={formC.prize} onChange={e => setFormC(p => ({ ...p, prize: e.target.value }))} placeholder="Descripción del premio" />
          </div>
          <div>
            <label className="label">Estado</label>
            <select className="input" value={formC.status} onChange={e => setFormC(p => ({ ...p, status: e.target.value }))}>
              {['inscripcion','en_curso','finalizado','cancelado'].map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={() => setOpenC(false)} className="btn btn-secondary">Cancelar</button>
          <button onClick={saveChamp} disabled={saving} className="btn btn-primary">
            {saving ? 'Guardando...' : '✓ Crear Campeonato'}
          </button>
        </div>
      </Modal>

      {/* Modal nuevo equipo */}
      <Modal open={openT} onClose={() => { setOpenT(false); setFormT({...EMPTY_T}) }} title="Inscribir Equipo">
        <div className="space-y-4">
          <div>
            <label className="label">Nombre del equipo *</label>
            <input className="input" value={formT.name} onChange={e => setFormT(p => ({ ...p, name: e.target.value }))} placeholder="Nombre del equipo" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Capitán</label>
              <input className="input" value={formT.captain_name} onChange={e => setFormT(p => ({ ...p, captain_name: e.target.value }))} placeholder="Nombre del capitán" />
            </div>
            <div>
              <label className="label">Teléfono</label>
              <input className="input" value={formT.captain_phone} onChange={e => setFormT(p => ({ ...p, captain_phone: e.target.value }))} />
            </div>
            <div>
              <label className="label">Nro. jugadores</label>
              <input type="number" className="input" value={formT.player_count} onChange={e => setFormT(p => ({ ...p, player_count: Number(e.target.value) }))} min="0" />
            </div>
            <div>
              <label className="label">Monto pagado</label>
              <input type="number" className="input" value={formT.amount_paid} onChange={e => setFormT(p => ({ ...p, amount_paid: Number(e.target.value) }))} min="0" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <input type="checkbox" id="paid" checked={formT.registration_paid}
              onChange={e => setFormT(p => ({ ...p, registration_paid: e.target.checked }))}
              className="w-4 h-4 accent-orange-500" />
            <label htmlFor="paid" className="text-white/60 text-sm cursor-pointer">Inscripción pagada</label>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={() => setOpenT(false)} className="btn btn-secondary">Cancelar</button>
          <button onClick={saveTeam} disabled={saving} className="btn btn-primary">
            {saving ? 'Guardando...' : '✓ Inscribir Equipo'}
          </button>
        </div>
      </Modal>
    </AppLayout>
  )
}
