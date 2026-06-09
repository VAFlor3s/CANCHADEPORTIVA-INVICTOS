'use client'
import { useEffect, useState } from 'react'
import AppLayout from '@/components/ui/AppLayout'
import Modal from '@/components/ui/Modal'
import { supabase, Reservation, Field } from '@/lib/supabase'
import { fmt, fmtDate, fmtTime, STATUS_COLOR, STATUS_LABEL } from '@/lib/utils'
import { useAuth } from '@/lib/auth'

const EMPTY = {
  field_id: '', customer_name: '', customer_phone: '',
  date: '', start_time: '', end_time: '',
  total_amount: 0, amount_paid: 0,
  status: 'confirmada', payment_status: 'pendiente', notes: '',
}

export default function ReservasPage() {
  const { isAdmin } = useAuth()
  const [rows, setRows]       = useState<Reservation[]>([])
  const [fields, setFields]   = useState<Field[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen]       = useState(false)
  const [form, setForm]       = useState({ ...EMPTY })
  const [saving, setSaving]   = useState(false)
  const [deleting, setDeleting] = useState<string|null>(null)
  const [fDate, setFDate]     = useState('')
  const [fStatus, setFStatus] = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const [rRes, fRes] = await Promise.all([
      supabase.from('reservations')
        .select('*, fields(name, sport_type)')
        .order('date', { ascending: false })
        .order('start_time')
        .limit(200),
      supabase.from('fields').select('*').eq('is_active', true),
    ])
    setRows(rRes.data || [])
    setFields(fRes.data || [])
    setLoading(false)
  }

  function calcTotal() {
    if (!form.field_id || !form.start_time || !form.end_time) return 0
    const field = fields.find(f => f.id === form.field_id)
    if (!field) return 0
    const [sh, sm] = form.start_time.split(':').map(Number)
    const [eh, em] = form.end_time.split(':').map(Number)
    const hrs = ((eh * 60 + em) - (sh * 60 + sm)) / 60
    return hrs > 0 ? Math.round(hrs * field.price_per_hour) : 0
  }

  async function save() {
    if (!form.customer_name || !form.date || !form.start_time || !form.end_time) {
      alert('Completa los campos obligatorios'); return
    }
    setSaving(true)
    const total = calcTotal()
    const paid  = Number(form.amount_paid)
    const pStatus = paid <= 0 ? 'pendiente' : paid >= total ? 'pagado' : 'parcial'

    const { error } = await supabase.from('reservations').insert([{
      field_id:       form.field_id || null,
      customer_name:  form.customer_name,
      customer_phone: form.customer_phone || null,
      date:           form.date,
      start_time:     form.start_time,
      end_time:       form.end_time,
      total_amount:   total,
      amount_paid:    paid,
      status:         form.status,
      payment_status: pStatus,
      notes:          form.notes || null,
    }])

    if (error) { alert('Error: ' + error.message); setSaving(false); return }

    // Registrar pago en ventas si hay algo cobrado
    if (paid > 0) {
      await supabase.from('sales').insert([{
        sale_type:      'alquiler',
        customer_name:  form.customer_name,
        total_amount:   paid,
        payment_method: 'efectivo',
        notes:          `Reserva ${form.date} ${form.start_time}–${form.end_time}`,
      }])
    }

    setSaving(false)
    setOpen(false)
    setForm({ ...EMPTY })
    load()
  }

  async function del(id: string) {
    if (!confirm('¿Eliminar esta reserva?')) return
    setDeleting(id)
    await supabase.from('reservations').delete().eq('id', id)
    setDeleting(null)
    load()
  }

  const filtered = rows.filter(r => {
    if (fDate && r.date !== fDate) return false
    if (fStatus && r.status !== fStatus) return false
    return true
  })

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="ttitle">Alquiler de Cancha</h1>
            <p className="text-white/30 text-sm mt-1">{filtered.length} reservas</p>
          </div>
          <button onClick={() => setOpen(true)} className="btn btn-primary">+ Nueva Reserva</button>
        </div>

        {/* Filtros */}
        <div className="flex gap-3 flex-wrap">
          <input type="date" className="input w-44" value={fDate} onChange={e => setFDate(e.target.value)} />
          <select className="input w-44" value={fStatus} onChange={e => setFStatus(e.target.value)}>
            <option value="">Todos los estados</option>
            {['confirmada','completada','cancelada','pendiente'].map(s => (
              <option key={s} value={s}>{STATUS_LABEL[s]}</option>
            ))}
          </select>
          {(fDate || fStatus) && (
            <button onClick={() => { setFDate(''); setFStatus('') }} className="btn btn-ghost text-xs">✕ Limpiar</button>
          )}
        </div>

        {/* Tabla */}
        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead style={{ background: 'rgba(255,255,255,0.03)' }}>
                <tr className="text-white/30 text-xs uppercase tracking-wider">
                  <th className="text-left px-4 py-3">Cliente</th>
                  <th className="text-left px-4 py-3">Cancha</th>
                  <th className="text-left px-4 py-3">Fecha</th>
                  <th className="text-left px-4 py-3">Horario</th>
                  <th className="text-left px-4 py-3">Estado</th>
                  <th className="text-left px-4 py-3">Pago</th>
                  <th className="text-right px-4 py-3">Total</th>
                  <th className="text-right px-4 py-3">Cobrado</th>
                  {isAdmin && <th className="px-3 py-3" />}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={9} className="text-center text-white/20 py-16">Cargando...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={9} className="text-center text-white/20 py-16">Sin reservas</td></tr>
                ) : filtered.map(r => (
                  <tr key={r.id} className="trow">
                    <td className="px-4 py-3">
                      <div className="text-white font-medium">{r.customer_name}</div>
                      {r.customer_phone && <div className="text-white/30 text-xs">{r.customer_phone}</div>}
                    </td>
                    <td className="px-4 py-3 text-white/60">{(r as any).fields?.name || '—'}</td>
                    <td className="px-4 py-3 text-white/60">{fmtDate(r.date)}</td>
                    <td className="px-4 py-3 text-white/60">{fmtTime(r.start_time)}–{fmtTime(r.end_time)}</td>
                    <td className="px-4 py-3">
                      <span className={`badge ${STATUS_COLOR[r.status]}`}>{STATUS_LABEL[r.status]}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`badge ${STATUS_COLOR[r.payment_status]}`}>{STATUS_LABEL[r.payment_status]}</span>
                    </td>
                    <td className="px-4 py-3 text-right text-white/70">{fmt(Number(r.total_amount))}</td>
                    <td className="px-4 py-3 text-right font-bold text-orange-400">{fmt(Number(r.amount_paid))}</td>
                    {isAdmin && (
                      <td className="px-3 py-3 text-center">
                        <button onClick={() => del(r.id)} disabled={deleting === r.id}
                          className="btn btn-danger px-2 py-1 text-xs">
                          {deleting === r.id ? '...' : '🗑'}
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

      <Modal open={open} onClose={() => { setOpen(false); setForm({ ...EMPTY }) }} title="Nueva Reserva" size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 sm:col-span-1">
              <label className="label">Cliente *</label>
              <input className="input" value={form.customer_name} onChange={e => setForm(p => ({ ...p, customer_name: e.target.value }))} placeholder="Nombre del cliente" />
            </div>
            <div>
              <label className="label">Teléfono</label>
              <input className="input" value={form.customer_phone} onChange={e => setForm(p => ({ ...p, customer_phone: e.target.value }))} placeholder="Número de contacto" />
            </div>
            <div>
              <label className="label">Cancha</label>
              <select className="input" value={form.field_id} onChange={e => setForm(p => ({ ...p, field_id: e.target.value }))}>
                <option value="">Sin cancha</option>
                {fields.map(f => <option key={f.id} value={f.id}>{f.name} — {fmt(f.price_per_hour)}/h</option>)}
              </select>
            </div>
            <div>
              <label className="label">Fecha *</label>
              <input type="date" className="input" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} />
            </div>
            <div>
              <label className="label">Hora inicio *</label>
              <input type="time" className="input" value={form.start_time} onChange={e => setForm(p => ({ ...p, start_time: e.target.value }))} />
            </div>
            <div>
              <label className="label">Hora fin *</label>
              <input type="time" className="input" value={form.end_time} onChange={e => setForm(p => ({ ...p, end_time: e.target.value }))} />
            </div>
          </div>

          {calcTotal() > 0 && (
            <div className="px-4 py-3 rounded-xl" style={{ background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.2)' }}>
              <div className="flex justify-between text-sm">
                <span className="text-white/50">Total calculado</span>
                <span className="text-orange-400 font-bold">{fmt(calcTotal())}</span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Monto cobrado</label>
              <input type="number" className="input" value={form.amount_paid} onChange={e => setForm(p => ({ ...p, amount_paid: Number(e.target.value) }))} min="0" />
            </div>
            <div>
              <label className="label">Estado</label>
              <select className="input" value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value as any }))}>
                {['confirmada','completada','cancelada','pendiente'].map(s => (
                  <option key={s} value={s}>{STATUS_LABEL[s]}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="label">Notas</label>
            <input className="input" value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Observaciones..." />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={() => { setOpen(false); setForm({ ...EMPTY }) }} className="btn btn-secondary">Cancelar</button>
          <button onClick={save} disabled={saving} className="btn btn-primary">
            {saving ? 'Guardando...' : '✓ Guardar Reserva'}
          </button>
        </div>
      </Modal>
    </AppLayout>
  )
}
