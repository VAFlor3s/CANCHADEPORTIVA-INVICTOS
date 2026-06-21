'use client'
import { useEffect, useState } from 'react'
import AppLayout from '@/components/ui/AppLayout'
import Modal from '@/components/ui/Modal'
import { supabase, Sale, Product } from '@/lib/supabase'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import { useAuth } from '@/lib/auth'

const TYPE_LABELS: Record<string, string> = {
  producto: '📦 Producto', bebida: '🧃 Bebida',
  alquiler: '🏟 Alquiler', campeonato: '🏆 Campeonato', otro: '📌 Otro',
}

const PAYMENT_ICONS: Record<string, string> = {
  efectivo: '💵', tarjeta: '💳', transferencia: '📱', otro: '❓',
}

const INITIAL_FORM = {
  sale_type: 'producto', customer_name: '', payment_method: 'efectivo',
  notes: '', total_amount: 0,
}

export default function VentasPage() {
  const { isAdmin } = useAuth()
  const [sales, setSales] = useState<Sale[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ ...INITIAL_FORM })
  const [saleItems, setSaleItems] = useState<{ product_id: string; qty: number; price: number; name: string; stock: number }[]>([])
  const [saving, setSaving] = useState(false)
  const [filterType, setFilterType] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [deleting, setDeleting] = useState<string | null>(null)

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    const [salesRes, prodRes] = await Promise.all([
      supabase.from('sales').select('*, sale_items(*)').order('created_at', { ascending: false }).limit(100),
      supabase.from('products').select('*').eq('is_active', true).order('name'),
    ])
    setSales(salesRes.data || [])
    setProducts(prodRes.data || [])
    setLoading(false)
  }

  function addItem(productId: string) {
    const p = products.find(x => x.id === productId)!
    setSaleItems(prev => {
      const ex = prev.find(i => i.product_id === productId)
      if (ex) return prev.map(i => i.product_id === productId ? { ...i, qty: i.qty + 1 } : i)
      return [...prev, { product_id: productId, qty: 1, price: p.price, name: p.name, stock: p.stock }]
    })
  }

  const itemsTotal = saleItems.reduce((s, i) => s + i.qty * i.price, 0)

  async function saveSale() {
    const total = form.sale_type === 'producto' || form.sale_type === 'bebida'
      ? itemsTotal
      : Number(form.total_amount)

    if (total <= 0) { alert('El total debe ser mayor a 0'); return }
    setSaving(true)

    const { data: sale, error } = await supabase.from('sales').insert([{
      sale_type: form.sale_type,
      customer_name: form.customer_name || null,
      total_amount: total,
      payment_method: form.payment_method,
      notes: form.notes || null,
    }]).select().single()

    if (error || !sale) { alert('Error: ' + error?.message); setSaving(false); return }

    if (saleItems.length > 0) {
      await supabase.from('sale_items').insert(
        saleItems.map(i => ({ sale_id: sale.id, product_id: i.product_id, product_name: i.name, quantity: i.qty, unit_price: i.price }))
      )
      // Descontar stock
      await Promise.all(
        saleItems.map(async (item) => {
          const prod = products.find(p => p.id === item.product_id)
          if (prod) {
            await supabase.from('products').update({ stock: Math.max(0, prod.stock - item.qty) }).eq('id', item.product_id)
          }
        })
      )
    }

    setSaving(false)
    setShowModal(false)
    setForm({ ...INITIAL_FORM })
    setSaleItems([])
    fetchAll()
  }

  async function deleteSale(id: string) {
    if (!confirm('¿Eliminar esta venta? Esta acción no se puede deshacer.')) return
    setDeleting(id)
    await supabase.from('sale_items').delete().eq('sale_id', id)
    await supabase.from('sales').delete().eq('id', id)
    setDeleting(null)
    fetchAll()
  }

  const filtered = sales.filter(s => {
    if (filterType && s.sale_type !== filterType) return false
    const saleDate = s.created_at.split('T')[0]
    if (dateFrom && saleDate < dateFrom) return false
    if (dateTo && saleDate > dateTo) return false
    return true
  })

  const totalFiltered = filtered.reduce((s, x) => s + Number(x.total_amount), 0)

  return (
    <AppLayout>
      <div className="space-y-5 animate-in pt-2 md:pt-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="section-title text-white">Ventas / Caja</h1>
            <p className="text-white/40 text-sm mt-1">{filtered.length} transacciones — Total: {formatCurrency(totalFiltered)}</p>
          </div>
          <button onClick={() => setShowModal(true)} className="btn-primary">+ Registrar Venta</button>
        </div>

        {/* Filtros */}
        <div className="flex gap-3 flex-wrap">
          <select className="input-field w-44" value={filterType} onChange={e => setFilterType(e.target.value)}>
            <option value="">Todos los tipos</option>
            {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <input type="date" className="input-field w-44" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
          <input type="date" className="input-field w-44" value={dateTo} onChange={e => setDateTo(e.target.value)} />
          {(filterType || dateFrom || dateTo) && (
            <button onClick={() => { setFilterType(''); setDateFrom(''); setDateTo('') }} className="btn-secondary text-xs">✕ Limpiar</button>
          )}
        </div>

        {/* Resumen rápido */}
        <div className="grid grid-cols-2 sm:grid-cols-2 sm:grid-cols-4 gap-3">
          {['alquiler', 'campeonato', 'producto', 'bebida'].map(type => {
            const typeSales = filtered.filter(s => s.sale_type === type)
            return (
              <div key={type} className="stat-card">
                <div className="text-white/40 text-xs">{TYPE_LABELS[type]}</div>
                <div className="text-lg font-bold text-white" style={{ fontFamily: 'Oswald, sans-serif' }}>
                  {formatCurrency(typeSales.reduce((s, x) => s + Number(x.total_amount), 0))}
                </div>
                <div className="text-white/30 text-xs">{typeSales.length} transacciones</div>
              </div>
            )
          })}
        </div>

        {/* Tabla */}
        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto -mx-4 md:mx-0"><table className="w-full text-sm min-w-[600px]">
            <thead style={{ background: 'rgba(255,255,255,0.03)' }}>
              <tr className="text-white/30 text-xs uppercase tracking-wider">
                <th className="text-left px-4 py-3">Fecha</th>
                <th className="text-left px-4 py-3">Tipo</th>
                <th className="text-left px-4 py-3">Cliente</th>
                <th className="text-left px-4 py-3">Método</th>
                <th className="text-left px-4 py-3">Notas</th>
                <th className="text-right px-4 py-3">Total</th>
                {isAdmin && <th className="px-4 py-3" />}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={isAdmin ? 7 : 6} className="text-center text-white/20 py-12">Cargando...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={isAdmin ? 7 : 6} className="text-center text-white/20 py-12">Sin ventas en el período seleccionado</td></tr>
              ) : filtered.map(sale => (
                <tr key={sale.id} className="table-row">
                  <td className="px-4 py-3 text-white/50 text-xs">{formatDateTime(sale.created_at)}</td>
                  <td className="px-4 py-3">{TYPE_LABELS[sale.sale_type]}</td>
                  <td className="px-4 py-3 text-white/60">{sale.customer_name || '—'}</td>
                  <td className="px-4 py-3 text-white/50">{PAYMENT_ICONS[sale.payment_method]} {sale.payment_method}</td>
                  <td className="px-4 py-3 text-white/30 text-xs truncate max-w-32">{sale.notes || '—'}</td>
                  <td className="px-4 py-3 text-right font-bold text-orange-400">{formatCurrency(Number(sale.total_amount))}</td>
                  {isAdmin && (
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => deleteSale(sale.id)}
                        disabled={deleting === sale.id}
                        className="text-red-400/50 hover:text-red-400 transition-colors text-xs px-2 py-1 rounded hover:bg-red-500/10"
                        title="Eliminar venta">
                        {deleting === sale.id ? '...' : '🗑'}
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
            {filtered.length > 0 && (
              <tfoot style={{ background: 'rgba(255,255,255,0.03)' }}>
                <tr>
                  <td colSpan={isAdmin ? 6 : 5} className="px-4 py-3 text-white/50 text-sm font-medium">Total período</td>
                  <td className="px-4 py-3 text-right font-bold text-orange-400 text-lg">{formatCurrency(totalFiltered)}</td>
                </tr>
              </tfoot>
            )}
          </table></div>
        </div>
      </div>

      {/* Modal nueva venta */}
      <Modal isOpen={showModal} onClose={() => { setShowModal(false); setForm({ ...INITIAL_FORM }); setSaleItems([]) }} title="Registrar Venta" size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Tipo de venta</label>
              <select className="input-field" value={form.sale_type} onChange={e => setForm(p => ({ ...p, sale_type: e.target.value as any }))}>
                {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Cliente</label>
              <input className="input-field" value={form.customer_name} onChange={e => setForm(p => ({ ...p, customer_name: e.target.value }))} placeholder="Nombre del cliente" />
            </div>
          </div>

          {(form.sale_type === 'producto' || form.sale_type === 'bebida') ? (
            <div>
              <label className="label">Agregar productos</label>
              <select className="input-field mb-3" onChange={e => { if (e.target.value) { addItem(e.target.value); e.target.value = '' } }}>
                <option value="">Seleccionar producto...</option>
                {products.filter(p => form.sale_type === 'bebida' ? p.is_beverage : !p.is_beverage).map(p => (
                  <option key={p.id} value={p.id}>{p.name} — {formatCurrency(p.price)} (stock: {p.stock})</option>
                ))}
              </select>
              {saleItems.length > 0 && (
                <div className="space-y-2">
                  {saleItems.map(item => (
                    <div key={item.product_id} className="flex items-center gap-3 py-2 border-b border-white/5">
                      <span className="flex-1 text-white text-sm">{item.name}</span>
                      <div className="flex items-center gap-2">
                        <button onClick={() => setSaleItems(prev => prev.map(i => i.product_id === item.product_id ? { ...i, qty: Math.max(1, i.qty - 1) } : i))} className="w-6 h-6 rounded bg-white/10 text-white text-xs">−</button>
                        <span className="text-white text-sm w-6 text-center">{item.qty}</span>
                        <button onClick={() => setSaleItems(prev => prev.map(i => i.product_id === item.product_id ? { ...i, qty: i.qty + 1 } : i))} className="w-6 h-6 rounded bg-white/10 text-white text-xs">+</button>
                      </div>
                      <span className="text-orange-400 text-sm font-medium w-24 text-right">{formatCurrency(item.qty * item.price)}</span>
                      <button onClick={() => setSaleItems(prev => prev.filter(i => i.product_id !== item.product_id))} className="text-red-400 text-xs">✕</button>
                    </div>
                  ))}
                  <div className="flex justify-between pt-2">
                    <span className="text-white/70 font-medium">Total</span>
                    <span className="text-orange-400 font-bold">{formatCurrency(itemsTotal)}</span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div>
              <label className="label">Total de la venta</label>
              <input type="number" step="0.01" min="0" className="input-field" value={form.total_amount} onChange={e => setForm(p => ({ ...p, total_amount: Number(e.target.value) }))} />
            </div>
          )}

          <div>
            <label className="label">Método de pago</label>
            <div className="flex gap-2">
              {['efectivo', 'tarjeta', 'transferencia', 'otro'].map(m => (
                <button key={m} onClick={() => setForm(p => ({ ...p, payment_method: m }))}
                  className={`flex-1 py-2 rounded-xl text-xs capitalize ${form.payment_method === m ? 'bg-orange-500 text-white' : 'bg-white/5 text-white/50 hover:bg-white/10'}`}>
                  {PAYMENT_ICONS[m]} {m}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="label">Notas</label>
            <input className="input-field" value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Observaciones..." />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={() => { setShowModal(false); setSaleItems([]) }} className="btn-secondary">Cancelar</button>
          <button onClick={saveSale} disabled={saving} className="btn-primary">
            {saving ? 'Guardando...' : '✓ Registrar Venta'}
          </button>
        </div>
      </Modal>
    </AppLayout>
  )
}
