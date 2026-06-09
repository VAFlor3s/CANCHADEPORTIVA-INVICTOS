'use client'
import { useEffect, useState } from 'react'
import AppLayout from '@/components/ui/AppLayout'
import Modal from '@/components/ui/Modal'
import { supabase, Sale, Product } from '@/lib/supabase'
import { fmt, fmtDateTime } from '@/lib/utils'
import { useAuth } from '@/lib/auth'

const TYPE_LABEL: Record<string,string> = {
  producto:'📦 Producto', bebida:'🧃 Bebida', alquiler:'🏟 Alquiler', campeonato:'🏆 Campeonato', otro:'📌 Otro',
}
const PAY_ICON: Record<string,string> = {
  efectivo:'💵', tarjeta:'💳', transferencia:'📱', otro:'❓',
}

const EMPTY = { sale_type: 'producto', customer_name: '', payment_method: 'efectivo', notes: '', total_amount: 0 }

export default function VentasPage() {
  const { isAdmin } = useAuth()
  const [sales, setSales]       = useState<Sale[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading]   = useState(true)
  const [open, setOpen]         = useState(false)
  const [form, setForm]         = useState({ ...EMPTY })
  const [items, setItems]       = useState<{product_id:string;name:string;price:number;qty:number;stock:number}[]>([])
  const [saving, setSaving]     = useState(false)
  const [deleting, setDeleting] = useState<string|null>(null)
  const [fType, setFType]       = useState('')
  const [fFrom, setFFrom]       = useState('')
  const [fTo, setFTo]           = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const [sRes, pRes] = await Promise.all([
      supabase.from('sales').select('*, sale_items(*)').order('created_at', { ascending: false }).limit(200),
      supabase.from('products').select('*').eq('is_active', true).order('name'),
    ])
    setSales(sRes.data || [])
    setProducts(pRes.data || [])
    setLoading(false)
  }

  function addItem(pid: string) {
    const p = products.find(x => x.id === pid)!
    setItems(prev => {
      const ex = prev.find(i => i.product_id === pid)
      if (ex) return prev.map(i => i.product_id === pid ? { ...i, qty: i.qty + 1 } : i)
      return [...prev, { product_id: pid, name: p.name, price: p.price, qty: 1, stock: p.stock }]
    })
  }

  const itemsTotal = items.reduce((s, i) => s + i.qty * i.price, 0)

  async function save() {
    const useItems = form.sale_type === 'producto' || form.sale_type === 'bebida'
    const total = useItems ? itemsTotal : Number(form.total_amount)
    if (total <= 0) { alert('El total debe ser mayor a 0'); return }
    if (useItems && items.length === 0) { alert('Agrega al menos un producto'); return }
    setSaving(true)

    const { data: sale, error } = await supabase.from('sales').insert([{
      sale_type:      form.sale_type,
      customer_name:  form.customer_name || null,
      total_amount:   total,
      payment_method: form.payment_method,
      notes:          form.notes || null,
    }]).select().single()

    if (error || !sale) { alert('Error: ' + error?.message); setSaving(false); return }

    if (useItems && items.length > 0) {
      await supabase.from('sale_items').insert(
        items.map(i => ({
          sale_id: sale.id, product_id: i.product_id,
          product_name: i.name, quantity: i.qty, unit_price: i.price,
        }))
      )
      // Descontar stock
      await Promise.all(items.map(async item => {
        const prod = products.find(p => p.id === item.product_id)
        if (prod) {
          await supabase.from('products')
            .update({ stock: Math.max(0, prod.stock - item.qty), updated_at: new Date().toISOString() })
            .eq('id', item.product_id)
        }
      }))
    }

    setSaving(false)
    setOpen(false)
    setForm({ ...EMPTY })
    setItems([])
    load()
  }

  async function del(id: string) {
    if (!confirm('¿Eliminar esta venta? No se puede deshacer.')) return
    setDeleting(id)
    await supabase.from('sale_items').delete().eq('sale_id', id)
    await supabase.from('sales').delete().eq('id', id)
    setDeleting(null)
    load()
  }

  const filtered = sales.filter(s => {
    if (fType && s.sale_type !== fType) return false
    const d = s.created_at.split('T')[0]
    if (fFrom && d < fFrom) return false
    if (fTo   && d > fTo)   return false
    return true
  })

  const totalFiltered = filtered.reduce((s, x) => s + Number(x.total_amount), 0)

  const useItems = form.sale_type === 'producto' || form.sale_type === 'bebida'
  const filteredProds = products.filter(p =>
    form.sale_type === 'bebida' ? p.category === 'bebida' : p.category === 'producto'
  )

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="ttitle">Ventas / Caja</h1>
            <p className="text-white/30 text-sm mt-1">{filtered.length} transacciones · Total: {fmt(totalFiltered)}</p>
          </div>
          <button onClick={() => setOpen(true)} className="btn btn-primary">+ Registrar Venta</button>
        </div>

        {/* Filtros */}
        <div className="flex gap-3 flex-wrap">
          <select className="input w-44" value={fType} onChange={e => setFType(e.target.value)}>
            <option value="">Todos los tipos</option>
            {Object.entries(TYPE_LABEL).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <input type="date" className="input w-44" value={fFrom} onChange={e => setFFrom(e.target.value)} />
          <input type="date" className="input w-44" value={fTo} onChange={e => setFTo(e.target.value)} />
          {(fType||fFrom||fTo) && (
            <button onClick={() => { setFType(''); setFFrom(''); setFTo('') }} className="btn btn-ghost text-xs">✕ Limpiar</button>
          )}
        </div>

        {/* Resumen */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {['alquiler','campeonato','producto','bebida'].map(t => {
            const sub = filtered.filter(s => s.sale_type === t)
            return (
              <div key={t} className="kpi">
                <div className="text-white/35 text-xs mb-1">{TYPE_LABEL[t]}</div>
                <div className="text-white font-bold text-lg" style={{ fontFamily:'Oswald,sans-serif' }}>
                  {fmt(sub.reduce((s,x) => s + Number(x.total_amount), 0))}
                </div>
                <div className="text-white/25 text-xs">{sub.length} transacciones</div>
              </div>
            )
          })}
        </div>

        {/* Tabla */}
        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead style={{ background: 'rgba(255,255,255,0.03)' }}>
                <tr className="text-white/30 text-xs uppercase tracking-wider">
                  <th className="text-left px-4 py-3">Fecha</th>
                  <th className="text-left px-4 py-3">Tipo</th>
                  <th className="text-left px-4 py-3">Cliente</th>
                  <th className="text-left px-4 py-3">Método</th>
                  <th className="text-left px-4 py-3">Notas</th>
                  <th className="text-right px-4 py-3">Total</th>
                  {isAdmin && <th className="px-3 py-3"/>}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} className="text-center text-white/20 py-16">Cargando...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={7} className="text-center text-white/20 py-16">Sin ventas en el período</td></tr>
                ) : filtered.map(s => (
                  <tr key={s.id} className="trow">
                    <td className="px-4 py-3 text-white/40 text-xs">{fmtDateTime(s.created_at)}</td>
                    <td className="px-4 py-3">{TYPE_LABEL[s.sale_type]}</td>
                    <td className="px-4 py-3 text-white/60">{s.customer_name || '—'}</td>
                    <td className="px-4 py-3 text-white/50">{PAY_ICON[s.payment_method]} {s.payment_method}</td>
                    <td className="px-4 py-3 text-white/30 text-xs max-w-xs truncate">{s.notes || '—'}</td>
                    <td className="px-4 py-3 text-right font-bold text-orange-400">{fmt(Number(s.total_amount))}</td>
                    {isAdmin && (
                      <td className="px-3 py-3 text-center">
                        <button onClick={() => del(s.id)} disabled={deleting === s.id}
                          className="btn btn-danger px-2 py-1 text-xs">
                          {deleting === s.id ? '...' : '🗑'}
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
              {filtered.length > 0 && (
                <tfoot style={{ background: 'rgba(255,255,255,0.03)' }}>
                  <tr>
                    <td colSpan={isAdmin ? 6 : 5} className="px-4 py-3 text-white/40 text-sm">Total período</td>
                    <td className="px-4 py-3 text-right font-bold text-orange-400 text-lg">{fmt(totalFiltered)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      </div>

      <Modal open={open} onClose={() => { setOpen(false); setForm({...EMPTY}); setItems([]) }} title="Registrar Venta" size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Tipo de venta</label>
              <select className="input" value={form.sale_type} onChange={e => { setForm(p => ({ ...p, sale_type: e.target.value })); setItems([]) }}>
                {Object.entries(TYPE_LABEL).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Cliente</label>
              <input className="input" value={form.customer_name} onChange={e => setForm(p => ({ ...p, customer_name: e.target.value }))} placeholder="Nombre (opcional)" />
            </div>
          </div>

          {useItems ? (
            <div>
              <label className="label">Agregar {form.sale_type === 'bebida' ? 'bebidas' : 'productos'}</label>
              <select className="input mb-3" onChange={e => { if (e.target.value) { addItem(e.target.value); e.target.value='' } }}>
                <option value="">Seleccionar...</option>
                {filteredProds.map(p => (
                  <option key={p.id} value={p.id} disabled={p.stock === 0}>
                    {p.name} — {fmt(p.price)} {p.stock === 0 ? '(sin stock)' : `(stock: ${p.stock})`}
                  </option>
                ))}
              </select>
              {items.length > 0 && (
                <div className="space-y-2 border border-white/10 rounded-xl p-3">
                  {items.map(item => (
                    <div key={item.product_id} className="flex items-center gap-3">
                      <span className="flex-1 text-white text-sm">{item.name}</span>
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => setItems(p => p.map(i => i.product_id === item.product_id ? { ...i, qty: Math.max(1, i.qty-1) } : i))}
                          className="w-7 h-7 rounded-lg bg-white/10 text-white text-sm flex items-center justify-center">−</button>
                        <span className="w-8 text-center text-white text-sm">{item.qty}</span>
                        <button onClick={() => setItems(p => p.map(i => i.product_id === item.product_id ? { ...i, qty: i.qty+1 } : i))}
                          className="w-7 h-7 rounded-lg bg-white/10 text-white text-sm flex items-center justify-center">+</button>
                      </div>
                      <span className="text-orange-400 font-medium text-sm w-24 text-right">{fmt(item.qty * item.price)}</span>
                      <button onClick={() => setItems(p => p.filter(i => i.product_id !== item.product_id))} className="text-red-400 text-xs">✕</button>
                    </div>
                  ))}
                  <div className="flex justify-between pt-2 border-t border-white/10">
                    <span className="text-white/50 text-sm font-medium">Total</span>
                    <span className="text-orange-400 font-bold">{fmt(itemsTotal)}</span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div>
              <label className="label">Total de la venta</label>
              <input type="number" className="input" value={form.total_amount} onChange={e => setForm(p => ({ ...p, total_amount: Number(e.target.value) }))} min="0" step="100" />
            </div>
          )}

          <div>
            <label className="label">Método de pago</label>
            <div className="grid grid-cols-4 gap-2">
              {['efectivo','tarjeta','transferencia','otro'].map(m => (
                <button key={m} onClick={() => setForm(p => ({ ...p, payment_method: m }))}
                  className="py-2.5 rounded-xl text-xs capitalize transition-colors"
                  style={{
                    background: form.payment_method === m ? '#f97316' : 'rgba(255,255,255,0.05)',
                    color: form.payment_method === m ? '#fff' : 'rgba(255,255,255,0.4)',
                    border: `1px solid ${form.payment_method === m ? '#f97316' : 'rgba(255,255,255,0.08)'}`,
                  }}>
                  {PAY_ICON[m]} {m}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="label">Notas</label>
            <input className="input" value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Observaciones (opcional)" />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={() => { setOpen(false); setItems([]) }} className="btn btn-secondary">Cancelar</button>
          <button onClick={save} disabled={saving} className="btn btn-primary">
            {saving ? 'Guardando...' : '✓ Registrar Venta'}
          </button>
        </div>
      </Modal>
    </AppLayout>
  )
}
