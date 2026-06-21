'use client'
import { useEffect, useState } from 'react'
import AppLayout from '@/components/ui/AppLayout'
import Modal from '@/components/ui/Modal'
import { supabase, Reservation, Field } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { formatCurrency, formatDate, formatTime, STATUS_COLORS, getStatusLabel } from '@/lib/utils'

const INITIAL_FORM = {
  field_id: '', customer_name: '', customer_phone: '', date: '',
  start_time: '', end_time: '', status: 'confirmada', payment_status: 'pendiente',
  amount_paid: 0, notes: '', total_amount: 0,
}

export default function ReservasPage() {
  const { isAdmin } = useAuth()
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [fields, setFields] = useState<Field[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ ...INITIAL_FORM })
  const [saving, setSaving] = useState(false)
  const [filterDate, setFilterDate] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [deleting, setDeleting] = useState<string | null>(null)

  useEffect(() => { fetch() }, [])

  async function fetch() {
    setLoading(true)
    const [res, fieldsRes] = await Promise.all([
      supabase.from('reservations').select('*, fields(name, sport_type)').order('date', { ascending: false }).order('start_time'),
      supabase.from('fields').select('*').eq('is_active', true),
    ])
    setReservations(res.data || [])
    setFields(fieldsRes.data || [])
    setLoading(false)
  }

  function calcTotal() {
    const field = fields.find(f => f.id === form.field_id)
    if (!field || !form.start_time || !form.end_time) return 0
    const [sh, sm] = form.start_time.split(':').map(Number)
    const [eh, em] = form.end_time.split(':').map(Number)
    const hours = ((eh * 60 + em) - (sh * 60 + sm)) / 60
    return hours > 0 ? Math.round(hours * field.price_per_hour) : 0
  }

  function handleFieldChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newForm = { ...form, field_id: e.target.value }
    setForm(newForm)
    // recalc after state update
    setTimeout(() => {
      setForm(prev => ({ ...prev, total_amount: calcTotal() }))
    }, 0)
  }

  function handleTimeChange(field: 'start_time' | 'end_time', val: string) {
    setForm(prev => {
      const updated = { ...prev, [field]: val }
      const f = fields.find(fi => fi.id === updated.field_id)
      if (f && updated.start_time && updated.end_time) {
        const [sh, sm] = updated.start_time.split(':').map(Number)
        const [eh, em] = updated.end_time.split(':').map(Number)
        const hours = ((eh * 60 + em) - (sh * 60 + sm)) / 60
        updated.total_amount = hours > 0 ? Math.round(hours * f.price_per_hour) : 0
      }
      return updated
    })
  }

  async function handleSave() {
    if (!form.field_id || !form.customer_name || !form.date || !form.start_time || !form.end_time) {
      alert('Completa todos los campos obligatorios'); return
    }
    setSaving(true)
    const { error } = await supabase.from('reservations').insert([{
      field_id: form.field_id,
      customer_name: form.customer_name,
      customer_phone: form.customer_phone || null,
      date: form.date,
      start_time: form.start_time,
      end_time: form.end_time,
      total_amount: form.total_amount || calcTotal(),
      status: form.status,
      payment_status: form.payment_status,
      amount_paid: Number(form.amount_paid),
      notes: form.notes || null,
    }])
    setSaving(false)
    if (error) { alert('Error al guardar: ' + error.message); return }

    // Registrar venta si pagado
    if (form.payment_status === 'pagado' || Number(form.amount_paid) > 0) {
      await supabase.from('sales').insert([{
        sale_type: 'alquiler',
        customer_name: form.customer_name,
        total_amount: form.payment_status === 'pagado' ? form.total_amount : form.amount_paid,
        payment_method: 'efectivo',
        notes: `Reserva cancha ${form.date} ${form.start_time}-${form.end_time}`,
      }])
    }

    setShowModal(false)
    setForm({ ...INITIAL_FORM })
    fetch()
  }

  async function deleteReservation(id: string) {
    if (!confirm('¿Eliminar esta reserva? Esta accion no se puede deshacer.')) return
    setDeleting(id)
    await supabase.from('reservations').delete().eq('id', id)
    setDeleting(null)
    fetch()
  }

  const filtered = reservations.filter(r => {
    if (filterDate && r.date !== filterDate) return false
    if (filterStatus && r.status !== filterStatus) return false
    return true
  })

  return (
    <AppLayout>
      <div className="space-y-5 animate-in pt-2 md:pt-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="section-title text-white">Alquiler de Cancha</h1>
            <p className="text-white/40 text-sm mt-1">{reservations.length} reservas registradas</p>
          </div>
          <button onClick={() => setShowModal(true)} className="btn-primary">
            + Nueva Reserva
          </button>
        </div>

        {/* Filters */}
        <div className="flex gap-3 flex-wrap">
          <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)}
            className="input-field w-44" placeholder="Filtrar fecha" />
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="input-field w-44">
            <option value="">Todos los estados</option>
            <option value="confirmada">Confirmada</option>
            <option value="pendiente">Pendiente</option>
            <option value="completada">Completada</option>
            <option value="cancelada">Cancelada</option>
          </select>
          {(filterDate || filterStatus) && (
            <button onClick={() => { setFilterDate(''); setFilterStatus('') }} className="btn-secondary text-xs">
              ✕ Limpiar
            </button>
          )}
        </div>

        {/* Table */}
        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto -mx-4 md:mx-0"><table className="w-full text-sm min-w-[600px]">
            <thead style={{ background: 'rgba(255,255,255,0.03)' }}>
              <tr className="text-white/30 text-xs uppercase tracking-wider">
                <th className="text-left px-4 py-3">Fecha</th>
                <th className="text-left px-4 py-3">Horario</th>
                <th className="text-left px-4 py-3">Cancha</th>
                <th className="text-left px-4 py-3">Cliente</th>
                <th className="text-left px-4 py-3">Estado</th>
                <th className="text-left px-4 py-3">Pago</th>
                <th className="text-right px-4 py-3">Total</th>
                {isAdmin && <th className="px-4 py-3" />}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="text-center text-white/20 py-12">Cargando...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="text-center text-white/20 py-12">Sin reservas</td></tr>
              ) : filtered.map((r) => (
                <tr key={r.id} className="table-row">
                  <td className="px-4 py-3 text-white/80">{formatDate(r.date)}</td>
                  <td className="px-4 py-3 text-white/60">{formatTime(r.start_time)} - {formatTime(r.end_time)}</td>
                  <td className="px-4 py-3 text-white/60">{(r as any).fields?.name || '--'}</td>
                  <td className="px-4 py-3">
                    <div className="text-white/80">{r.customer_name}</div>
                    {r.customer_phone && <div className="text-white/30 text-xs">{r.customer_phone}</div>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`badge ${STATUS_COLORS[r.status]}`}>{getStatusLabel(r.status)}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`badge ${STATUS_COLORS[r.payment_status]}`}>{getStatusLabel(r.payment_status)}</span>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-orange-400">{formatCurrency(r.total_amount)}</td>
                  {isAdmin && (
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => deleteReservation(r.id)}
                        disabled={deleting === r.id}
                        className="text-red-400/50 hover:text-red-400 transition-colors text-xs px-2 py-1 rounded hover:bg-red-500/10"
                        title="Eliminar reserva">
                        {deleting === r.id ? '...' : '🗑'}
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table></div>
        </div>
      </div>

      <Modal isOpen={showModal} onClose={() => { setShowModal(false); setForm({ ...INITIAL_FORM }) }} title="Nueva Reserva" size="lg">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="label">Cancha *</label>
            <select className="input-field" value={form.field_id} onChange={handleFieldChange}>
              <option value="">Seleccionar cancha...</option>
              {fields.map(f => <option key={f.id} value={f.id}>{f.name} -- {formatCurrency(f.price_per_hour)}/hr</option>)}
            </select>
          </div>
          <div>
            <label className="label">Cliente *</label>
            <input className="input-field" value={form.customer_name} onChange={e => setForm(p => ({ ...p, customer_name: e.target.value }))} placeholder="Nombre del cliente" />
          </div>
          <div>
            <label className="label">Telefono</label>
            <input className="input-field" value={form.customer_phone} onChange={e => setForm(p => ({ ...p, customer_phone: e.target.value }))} placeholder="3001234567" />
          </div>
          <div>
            <label className="label">Fecha *</label>
            <input type="date" className="input-field" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} />
          </div>
          <div>
            <label className="label">Hora Inicio *</label>
            <input type="time" className="input-field" value={form.start_time} onChange={e => handleTimeChange('start_time', e.target.value)} />
          </div>
          <div>
            <label className="label">Hora Fin *</label>
            <input type="time" className="input-field" value={form.end_time} onChange={e => handleTimeChange('end_time', e.target.value)} />
          </div>
          <div>
            <label className="label">Total estimado</label>
            <div className="input-field font-semibold text-orange-400">{formatCurrency(form.total_amount)}</div>
          </div>
          <div>
            <label className="label">Estado</label>
            <select className="input-field" value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value as any }))}>
              <option value="confirmada">Confirmada</option>
              <option value="pendiente">Pendiente</option>
              <option value="cancelada">Cancelada</option>
            </select>
          </div>
          <div>
            <label className="label">Estado de Pago</label>
            <select className="input-field" value={form.payment_status} onChange={e => setForm(p => ({ ...p, payment_status: e.target.value as any }))}>
              <option value="pendiente">Pendiente</option>
              <option value="parcial">Parcial</option>
              <option value="pagado">Pagado</option>
            </select>
          </div>
          <div>
            <label className="label">Monto Pagado</label>
            <input type="number" className="input-field" value={form.amount_paid} onChange={e => setForm(p => ({ ...p, amount_paid: Number(e.target.value) }))} />
          </div>
          <div className="col-span-2">
            <label className="label">Notas</label>
            <textarea className="input-field h-20 resize-none" value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Observaciones..." />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={() => setShowModal(false)} className="btn-secondary">Cancelar</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary">
            {saving ? 'Guardando...' : '✓ Guardar Reserva'}
          </button>
        </div>
      </Modal>
    </AppLayout>
  )
}
