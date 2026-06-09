'use client'
import { useEffect, useState } from 'react'
import AppLayout from '@/components/ui/AppLayout'
import Modal from '@/components/ui/Modal'
import { supabase, Product } from '@/lib/supabase'
import { fmt } from '@/lib/utils'
import { useAuth } from '@/lib/auth'

const EMPTY = { name: '', category: 'producto' as 'producto'|'bebida', price: 0, cost: 0, stock: 0, min_stock: 5, unit: 'unidad' }

export default function InventarioPage() {
  const { isAdmin } = useAuth()
  const [rows, setRows]         = useState<Product[]>([])
  const [loading, setLoading]   = useState(true)
  const [open, setOpen]         = useState(false)
  const [editRow, setEditRow]   = useState<Product|null>(null)
  const [form, setForm]         = useState({ ...EMPTY })
  const [saving, setSaving]     = useState(false)
  const [deleting, setDeleting] = useState<string|null>(null)
  const [tab, setTab]           = useState<'todos'|'producto'|'bebida'>('todos')
  const [search, setSearch]     = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('products').select('*').eq('is_active', true).order('category').order('name')
    setRows(data || [])
    setLoading(false)
  }

  function openNew() {
    if (!isAdmin) return
    setEditRow(null)
    setForm({ ...EMPTY })
    setOpen(true)
  }

  function openEdit(p: Product) {
    if (!isAdmin) return
    setEditRow(p)
    setForm({ name: p.name, category: p.category, price: p.price, cost: p.cost, stock: p.stock, min_stock: p.min_stock, unit: p.unit })
    setOpen(true)
  }

  async function save() {
    if (!form.name) { alert('El nombre es obligatorio'); return }
    setSaving(true)
    if (editRow) {
      await supabase.from('products').update({ ...form, updated_at: new Date().toISOString() }).eq('id', editRow.id)
    } else {
      await supabase.from('products').insert([{ ...form }])
    }
    setSaving(false)
    setOpen(false)
    load()
  }

  async function del(id: string) {
    if (!confirm('¿Desactivar este producto?')) return
    setDeleting(id)
    await supabase.from('products').update({ is_active: false }).eq('id', id)
    setDeleting(null)
    load()
  }

  async function adjustStock(id: string, delta: number) {
    if (!isAdmin) return
    const prod = rows.find(p => p.id === id)
    if (!prod) return
    const newStock = Math.max(0, prod.stock + delta)
    await supabase.from('products').update({ stock: newStock, updated_at: new Date().toISOString() }).eq('id', id)
    setRows(prev => prev.map(p => p.id === id ? { ...p, stock: newStock } : p))
  }

  const filtered = rows.filter(r => {
    if (tab !== 'todos' && r.category !== tab) return false
    if (search && !r.name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="ttitle">Inventario</h1>
            <p className="text-white/30 text-sm mt-1">{filtered.length} items</p>
          </div>
          {isAdmin && <button onClick={openNew} className="btn btn-primary">+ Agregar Item</button>}
        </div>

        {/* Filtros */}
        <div className="flex gap-3 flex-wrap items-center">
          <div className="flex rounded-xl overflow-hidden border border-white/10">
            {(['todos','producto','bebida'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className="px-4 py-2 text-sm capitalize transition-colors"
                style={{
                  background: tab === t ? '#f97316' : 'rgba(255,255,255,0.04)',
                  color: tab === t ? '#fff' : 'rgba(255,255,255,0.4)',
                }}>
                {t === 'todos' ? 'Todos' : t === 'producto' ? '📦 Productos' : '🧃 Bebidas'}
              </button>
            ))}
          </div>
          <input className="input w-52" placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {/* Alertas stock bajo */}
        {rows.filter(r => r.stock <= r.min_stock).length > 0 && (
          <div className="px-4 py-3 rounded-xl border border-red-500/30" style={{ background: 'rgba(239,68,68,0.08)' }}>
            <p className="text-red-400 text-sm font-medium">
              ⚠️ {rows.filter(r => r.stock <= r.min_stock).length} producto(s) con stock bajo o agotado
            </p>
          </div>
        )}

        {/* Grid de productos */}
        {loading ? (
          <div className="text-white/20 text-sm py-12 text-center">Cargando...</div>
        ) : filtered.length === 0 ? (
          <div className="text-white/20 text-sm py-12 text-center">Sin productos</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map(p => (
              <div key={p.id} className="card flex flex-col gap-3"
                style={{ borderColor: p.stock <= p.min_stock ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.1)' }}>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-xs text-white/30 mb-0.5">{p.category === 'bebida' ? '🧃' : '📦'} {p.category}</div>
                    <div className="text-white font-medium text-sm leading-tight">{p.name}</div>
                  </div>
                  {isAdmin && (
                    <button onClick={() => openEdit(p)}
                      className="text-white/20 hover:text-orange-400 transition-colors text-xs">✏️</button>
                  )}
                </div>

                <div className="flex items-end justify-between">
                  <div>
                    <div className="text-orange-400 font-bold" style={{ fontFamily: 'Oswald,sans-serif' }}>
                      {fmt(p.price)}
                    </div>
                    {p.cost > 0 && <div className="text-white/25 text-xs">Costo: {fmt(p.cost)}</div>}
                  </div>
                  <div className="text-right">
                    <div className={`text-lg font-bold ${p.stock === 0 ? 'text-red-400' : p.stock <= p.min_stock ? 'text-yellow-400' : 'text-green-400'}`}
                      style={{ fontFamily: 'Oswald,sans-serif' }}>
                      {p.stock}
                    </div>
                    <div className="text-white/25 text-xs">{p.unit}</div>
                  </div>
                </div>

                {isAdmin && (
                  <div className="flex items-center gap-2 pt-1 border-t border-white/5">
                    <button onClick={() => adjustStock(p.id, -1)} className="btn btn-secondary px-3 py-1 text-xs">−</button>
                    <span className="flex-1 text-center text-white/40 text-xs">Stock</span>
                    <button onClick={() => adjustStock(p.id, +1)} className="btn btn-secondary px-3 py-1 text-xs">+</button>
                    <button onClick={() => del(p.id)} disabled={deleting === p.id}
                      className="btn btn-danger px-2 py-1 text-xs ml-1">🗑</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {isAdmin && (
        <Modal open={open} onClose={() => setOpen(false)} title={editRow ? 'Editar Item' : 'Nuevo Item'}>
          <div className="space-y-4">
            <div>
              <label className="label">Nombre *</label>
              <input className="input" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Nombre del producto" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Categoría</label>
                <select className="input" value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value as any }))}>
                  <option value="producto">📦 Producto</option>
                  <option value="bebida">🧃 Bebida</option>
                </select>
              </div>
              <div>
                <label className="label">Unidad</label>
                <input className="input" value={form.unit} onChange={e => setForm(p => ({ ...p, unit: e.target.value }))} placeholder="unidad, litro, kg..." />
              </div>
              <div>
                <label className="label">Precio de venta</label>
                <input type="number" className="input" value={form.price} onChange={e => setForm(p => ({ ...p, price: Number(e.target.value) }))} min="0" />
              </div>
              <div>
                <label className="label">Costo</label>
                <input type="number" className="input" value={form.cost} onChange={e => setForm(p => ({ ...p, cost: Number(e.target.value) }))} min="0" />
              </div>
              <div>
                <label className="label">Stock actual</label>
                <input type="number" className="input" value={form.stock} onChange={e => setForm(p => ({ ...p, stock: Number(e.target.value) }))} min="0" />
              </div>
              <div>
                <label className="label">Stock mínimo</label>
                <input type="number" className="input" value={form.min_stock} onChange={e => setForm(p => ({ ...p, min_stock: Number(e.target.value) }))} min="0" />
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <button onClick={() => setOpen(false)} className="btn btn-secondary">Cancelar</button>
            <button onClick={save} disabled={saving} className="btn btn-primary">
              {saving ? 'Guardando...' : '✓ Guardar'}
            </button>
          </div>
        </Modal>
      )}
    </AppLayout>
  )
}
