'use client'
import { useEffect, useState } from 'react'
import AppLayout from '@/components/ui/AppLayout'
import Modal from '@/components/ui/Modal'
import { supabase, Championship, Team } from '@/lib/supabase'
import { formatCurrency, formatDate, STATUS_COLORS, getStatusLabel } from '@/lib/utils'
import { useAuth } from '@/lib/auth'

const INITIAL_CHAMP = {
  name: '', sport_type: 'fútbol', category: '', start_date: '', end_date: '',
  registration_fee: 0, prize_description: '', max_teams: 0, status: 'inscripcion', description: '',
}

const INITIAL_TEAM = {
  championship_id: '', name: '', captain_name: '', captain_phone: '',
  player_count: 0, registration_paid: false, amount_paid: 0, notes: '',
}

const STATUS_LABELS: Championship['status'][] = ['inscripcion', 'en_curso', 'finalizado', 'cancelado']

export default function CampeonatosPage() {
  const { isAdmin } = useAuth()
  const [championships, setChampionships] = useState<Championship[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [selected, setSelected] = useState<Championship | null>(null)
  const [loading, setLoading] = useState(true)
  const [showChampModal, setShowChampModal] = useState(false)
  const [showTeamModal, setShowTeamModal] = useState(false)
  const [champForm, setChampForm] = useState({ ...INITIAL_CHAMP })
  const [teamForm, setTeamForm] = useState({ ...INITIAL_TEAM })
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    const { data } = await supabase.from('championships').select('*').order('created_at', { ascending: false })
    setChampionships(data || [])
    setLoading(false)
    if (selected) fetchTeams(selected.id)
  }

  async function fetchTeams(champId: string) {
    const { data } = await supabase.from('teams').select('*').eq('championship_id', champId).order('name')
    setTeams(data || [])
  }

  function selectChamp(c: Championship) {
    setSelected(c)
    fetchTeams(c.id)
  }

  async function saveChamp() {
    if (!champForm.name) { alert('El nombre es obligatorio'); return }
    setSaving(true)
    const { error } = await supabase.from('championships').insert([{
      ...champForm,
      registration_fee: Number(champForm.registration_fee),
      max_teams: champForm.max_teams ? Number(champForm.max_teams) : null,
      start_date: champForm.start_date || null,
      end_date: champForm.end_date || null,
    }])
    setSaving(false)
    if (error) { alert('Error: ' + error.message); return }
    setShowChampModal(false)
    setChampForm({ ...INITIAL_CHAMP })
    fetchAll()
  }

  async function saveTeam() {
    if (!selected || !teamForm.name) { alert('El nombre del equipo es obligatorio'); return }
    setSaving(true)
    const { error } = await supabase.from('teams').insert([{
      championship_id: selected.id,
      name: teamForm.name,
      captain_name: teamForm.captain_name || null,
      captain_phone: teamForm.captain_phone || null,
      player_count: Number(teamForm.player_count),
      registration_paid: teamForm.registration_paid,
      amount_paid: Number(teamForm.amount_paid),
      notes: teamForm.notes || null,
    }])
    if (!error && teamForm.registration_paid && selected.registration_fee > 0) {
      await supabase.from('sales').insert([{
        sale_type: 'campeonato',
        customer_name: teamForm.captain_name || teamForm.name,
        total_amount: Number(teamForm.amount_paid) || selected.registration_fee,
        payment_method: 'efectivo',
        notes: `Inscripción ${selected.name} - Equipo ${teamForm.name}`,
      }])
    }
    setSaving(false)
    if (error) { alert('Error: ' + error.message); return }
    setShowTeamModal(false)
    setTeamForm({ ...INITIAL_TEAM })
    if (selected) fetchTeams(selected.id)
  }

  async function updateChampStatus(id: string, status: Championship['status']) {
    await supabase.from('championships').update({ status }).eq('id', id)
    fetchAll()
  }

  async function deleteChamp(id: string) {
    if (!confirm('¿Eliminar este campeonato y todos sus equipos?')) return
    setDeleting(id)
    await supabase.from('teams').delete().eq('championship_id', id)
    await supabase.from('championships').delete().eq('id', id)
    setDeleting(null)
    if (selected?.id === id) setSelected(null)
    fetchAll()
  }

  async function deleteTeam(id: string) {
    if (!confirm('¿Eliminar este equipo?')) return
    await supabase.from('teams').delete().eq('id', id)
    if (selected) fetchTeams(selected.id)
  }

  return (
    <AppLayout>
      <div className="space-y-5 animate-in pt-2 md:pt-0">

        <div className="flex items-center justify-between">
          <div>
            <h1 className="section-title text-white">Campeonatos</h1>
            <p className="text-white/40 text-sm mt-1">{championships.length} campeonatos registrados</p>
          </div>
          {isAdmin && (
            <button onClick={() => setShowChampModal(true)} className="btn-primary">
              + <span className="hidden sm:inline">Nuevo </span>Campeonato
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Lista campeonatos */}
          <div className="lg:col-span-1 space-y-3">
            <h3 className="text-white/50 text-xs uppercase tracking-wider">Todos los campeonatos</h3>
            {loading ? (
              <div className="text-white/20 text-sm py-8 text-center">Cargando...</div>
            ) : championships.length === 0 ? (
              <div className="card text-center text-white/20 text-sm py-8">Sin campeonatos</div>
            ) : championships.map(c => (
              <div
                key={c.id}
                onClick={() => selectChamp(c)}
                className={`card cursor-pointer transition-all ${selected?.id === c.id ? 'border-orange-500/40 bg-orange-500/5' : 'hover:border-white/20'}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-white font-medium text-sm truncate">{c.name}</div>
                    <div className="text-white/40 text-xs mt-0.5">{c.sport_type} · {c.category}</div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <span className={`badge ${(STATUS_COLORS as any)[c.status] || 'bg-gray-100 text-gray-800'}`}>
                      {getStatusLabel(c.status)}
                    </span>
                    {isAdmin && (
                      <button
                        onClick={e => { e.stopPropagation(); deleteChamp(c.id) }}
                        disabled={deleting === c.id}
                        className="text-red-400/40 hover:text-red-400 transition-colors text-xs p-1 rounded hover:bg-red-500/10"
                      >
                        {deleting === c.id ? '…' : '🗑'}
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4 mt-2 text-xs text-white/40">
                  {c.registration_fee > 0 && <span>Inscripción: {formatCurrency(c.registration_fee)}</span>}
                  {c.max_teams ? <span>Máx {c.max_teams} equipos</span> : null}
                </div>
              </div>
            ))}
          </div>

          {/* Detalle campeonato */}
          <div className="lg:col-span-2">
            {!selected ? (
              <div className="card h-48 flex items-center justify-center text-white/20 text-sm">
                Selecciona un campeonato para ver los equipos
              </div>
            ) : (
              <div className="space-y-4">
                <div className="card">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-white font-semibold text-lg" style={{ fontFamily: 'Oswald, sans-serif' }}>
                        {selected.name.toUpperCase()}
                      </h2>
                      <p className="text-white/40 text-sm">
                        {selected.sport_type}{selected.category ? ` · ${selected.category}` : ''}
                      </p>
                    </div>
                    {isAdmin && (
                      <select
                        value={selected.status}
                        onChange={e => updateChampStatus(selected.id, e.target.value as Championship['status'])}
                        className="input-field w-36 text-xs flex-shrink-0"
                      >
                        {STATUS_LABELS.map(s => (
                          <option key={s} value={s}>{getStatusLabel(s)}</option>
                        ))}
                      </select>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
                    <div className="stat-card">
                      <div className="text-white/40 text-xs">Equipos inscritos</div>
                      <div className="text-2xl font-bold text-white" style={{ fontFamily: 'Oswald, sans-serif' }}>
                        {teams.length}
                      </div>
                    </div>
                    <div className="stat-card">
                      <div className="text-white/40 text-xs">Inscripciones cobradas</div>
                      <div className="text-2xl font-bold text-orange-400" style={{ fontFamily: 'Oswald, sans-serif' }}>
                        {formatCurrency(teams.filter(t => t.registration_paid).reduce((s, t) => s + Number(t.amount_paid), 0))}
                      </div>
                    </div>
                    <div className="stat-card">
                      <div className="text-white/40 text-xs">Pendientes de pago</div>
                      <div className="text-2xl font-bold text-yellow-400" style={{ fontFamily: 'Oswald, sans-serif' }}>
                        {teams.filter(t => !t.registration_paid).length}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <h3 className="text-white/70 text-sm font-medium">Equipos ({teams.length})</h3>
                  <button onClick={() => setShowTeamModal(true)} className="btn-secondary text-xs">
                    + Agregar Equipo
                  </button>
                </div>

                <div className="card overflow-hidden p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm min-w-[520px]">
                      <thead style={{ background: 'rgba(255,255,255,0.03)' }}>
                        <tr className="text-white/30 text-xs uppercase tracking-wider">
                          <th className="text-left px-4 py-3">Equipo</th>
                          <th className="text-left px-4 py-3">Capitán</th>
                          <th className="text-center px-4 py-3">Jugadores</th>
                          <th className="text-center px-4 py-3">Inscripción</th>
                          {isAdmin && <th className="px-4 py-3" />}
                        </tr>
                      </thead>
                      <tbody>
                        {teams.length === 0 ? (
                          <tr>
                            <td colSpan={isAdmin ? 5 : 4} className="text-center text-white/20 py-8">
                              Sin equipos inscritos
                            </td>
                          </tr>
                        ) : teams.map(t => (
                          <tr key={t.id} className="table-row">
                            <td className="px-4 py-3 text-white font-medium">{t.name}</td>
                            <td className="px-4 py-3 text-white/60">
                              <div>{t.captain_name || '—'}</div>
                              {t.captain_phone && (
                                <div className="text-white/30 text-xs">{t.captain_phone}</div>
                              )}
                            </td>
                            <td className="px-4 py-3 text-center text-white/60">{t.player_count}</td>
                            <td className="px-4 py-3 text-center">
                              {t.registration_paid
                                ? <span className="badge bg-orange-100 text-orange-800">✓ Pagado</span>
                                : <span className="badge bg-red-100 text-red-800">Pendiente</span>
                              }
                            </td>
                            {isAdmin && (
                              <td className="px-4 py-3 text-center">
                                <button
                                  onClick={() => deleteTeam(t.id)}
                                  className="text-red-400/40 hover:text-red-400 transition-colors text-xs px-2 py-1 rounded hover:bg-red-500/10"
                                >
                                  🗑
                                </button>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            )}
          </div>

        </div>
      </div>

      {/* Modal Campeonato */}
      <Modal
        isOpen={showChampModal}
        onClose={() => { setShowChampModal(false); setChampForm({ ...INITIAL_CHAMP }) }}
        title="Nuevo Campeonato"
        size="lg"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="label">Nombre del campeonato *</label>
            <input className="input-field" value={champForm.name}
              onChange={e => setChampForm(p => ({ ...p, name: e.target.value }))}
              placeholder="Copa Navidad 2025" />
          </div>
          <div>
            <label className="label">Deporte</label>
            <select className="input-field" value={champForm.sport_type}
              onChange={e => setChampForm(p => ({ ...p, sport_type: e.target.value }))}>
              <option value="fútbol">Fútbol</option>
              <option value="microfútbol">Microfútbol</option>
              <option value="baloncesto">Baloncesto</option>
              <option value="voleibol">Voleibol</option>
              <option value="otro">Otro</option>
            </select>
          </div>
          <div>
            <label className="label">Categoría</label>
            <input className="input-field" value={champForm.category}
              onChange={e => setChampForm(p => ({ ...p, category: e.target.value }))}
              placeholder="Sub-20, Libre, Femenino..." />
          </div>
          <div>
            <label className="label">Fecha inicio</label>
            <input type="date" className="input-field" value={champForm.start_date}
              onChange={e => setChampForm(p => ({ ...p, start_date: e.target.value }))} />
          </div>
          <div>
            <label className="label">Fecha fin</label>
            <input type="date" className="input-field" value={champForm.end_date}
              onChange={e => setChampForm(p => ({ ...p, end_date: e.target.value }))} />
          </div>
          <div>
            <label className="label">Cuota de inscripción</label>
            <input type="number" className="input-field" value={champForm.registration_fee}
              onChange={e => setChampForm(p => ({ ...p, registration_fee: Number(e.target.value) }))} />
          </div>
          <div>
            <label className="label">Máximo de equipos</label>
            <input type="number" className="input-field" value={champForm.max_teams}
              onChange={e => setChampForm(p => ({ ...p, max_teams: Number(e.target.value) }))} />
          </div>
          <div className="md:col-span-2">
            <label className="label">Premio / Descripción</label>
            <textarea className="input-field h-20 resize-none" value={champForm.prize_description}
              onChange={e => setChampForm(p => ({ ...p, prize_description: e.target.value }))}
              placeholder="Descripción del premio o torneo..." />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={() => setShowChampModal(false)} className="btn-secondary">Cancelar</button>
          <button onClick={saveChamp} disabled={saving} className="btn-primary">
            {saving ? 'Guardando...' : '✓ Crear Campeonato'}
          </button>
        </div>
      </Modal>

      {/* Modal Equipo */}
      <Modal
        isOpen={showTeamModal}
        onClose={() => { setShowTeamModal(false); setTeamForm({ ...INITIAL_TEAM }) }}
        title="Agregar Equipo"
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="label">Nombre del equipo *</label>
            <input className="input-field" value={teamForm.name}
              onChange={e => setTeamForm(p => ({ ...p, name: e.target.value }))}
              placeholder="Los Cracks FC" />
          </div>
          <div>
            <label className="label">Capitán</label>
            <input className="input-field" value={teamForm.captain_name}
              onChange={e => setTeamForm(p => ({ ...p, captain_name: e.target.value }))}
              placeholder="Nombre del capitán" />
          </div>
          <div>
            <label className="label">Teléfono capitán</label>
            <input className="input-field" value={teamForm.captain_phone}
              onChange={e => setTeamForm(p => ({ ...p, captain_phone: e.target.value }))}
              placeholder="0991234567" />
          </div>
          <div>
            <label className="label">Número de jugadores</label>
            <input type="number" className="input-field" value={teamForm.player_count}
              onChange={e => setTeamForm(p => ({ ...p, player_count: Number(e.target.value) }))} />
          </div>
          <div className="flex items-center gap-3">
            <input type="checkbox" id="paid" checked={teamForm.registration_paid}
              onChange={e => setTeamForm(p => ({ ...p, registration_paid: e.target.checked }))}
              className="w-4 h-4" />
            <label htmlFor="paid" className="text-white/70 text-sm cursor-pointer">
              Inscripción pagada {selected ? `(${formatCurrency(selected.registration_fee)})` : ''}
            </label>
          </div>
          {teamForm.registration_paid && (
            <div>
              <label className="label">Monto pagado</label>
              <input type="number" className="input-field"
                value={teamForm.amount_paid || selected?.registration_fee || 0}
                onChange={e => setTeamForm(p => ({ ...p, amount_paid: Number(e.target.value) }))} />
            </div>
          )}
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={() => setShowTeamModal(false)} className="btn-secondary">Cancelar</button>
          <button onClick={saveTeam} disabled={saving} className="btn-primary">
            {saving ? 'Guardando...' : '✓ Agregar Equipo'}
          </button>
        </div>
      </Modal>

    </AppLayout>
  )
}
