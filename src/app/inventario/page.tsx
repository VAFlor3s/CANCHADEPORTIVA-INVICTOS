'use client'
import { useEffect, useState } from 'react'
import AppLayout from '@/components/ui/AppLayout'
import Modal from '@/components/ui/Modal'
import { supabase, Product, ProductCategory } from '@/lib/supabase'
import { formatCurrency } from '@/lib/utils'
import { useAuth } from '@/lib/auth'

type Tab = 'productos' | 'bebidas'

const UNITS = ['unidad', 'par', 'caja', 'paquete', 'kg', 'g', 'litro', 'ml', 'docena']

const INITIAL_FORM = {
  name: '', description: '', category_id: '',
  price: '', cost: '',
  stock: 0, min_stock: 5, unit: 'unidad', is_active: true,
}

export default function InventarioPage() {
  const { isAdmin } = useAuth()
  const [tab, setTab] = useState<Tab>('productos')
  const [products, setProducts] = useState<Product[]>([])
  const [bebidas, setBebidas] = useState<Product[]>([])
  const [categories, setCategories] = useState<ProductCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showStockModal, setShowStockModal] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)
  const [form, setForm] = useState({ ...INITIAL_FORM })
  const [stockForm, setStockForm] = useState({ product_id: '', qty: 0, reason: '', type: 'entrada' })
  const [saving, setSaving] = useState(false)
  const [filter, setFilter] = useState('')

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    const [prodRes, bevRes, catRes] = await Promise.all([
      supabase.from('products').select('*, product_categories(name, color)').eq('is_beverage', false).eq('is_active', true).order('name'),
      supabase.from('products').select('*, product_categories(name, color)').eq('is_beverage', true).eq('is_active', true).order('name'),
      supabase.from('product_categories').select('*').order('name'),
    ])
    setProducts(prodRes.data || [])
    setBebidas(bevRes.data || [])
    setCategories(catRes.data || [])
    setLoading(false)
  }

  const isBeverage = tab === 'bebidas'
  const list = (isBeverage ? bebidas : products).filter(p =>
    !filter || p.name.toLowerCase().includes(filter.toLowerCase())
  )
  const allItems = [...products, ...bebidas]

  function openNew() {
    setEditing(null)
    setForm({ ...INITIAL_FORM })
    setShowModal(true)
  }

  function openEdit(p: Product) {
    setEditing(p)
    setForm({
      name: p.name, description: p.description || '',
      category_id: p.category_id || '',
      price: String(p.price), cost: String(p.cost),
      stock: p.stock, min_stock: p.min_stock,
      unit: p.unit, is_active: p.is_active,
    })
    setShowModal(true)
  }

  async function handleSave() {
    const priceVal = parseFloat(String(form.price).replace(',', '.'))
    const costVal = parseFloat(String(form.cost).replace(',', '.')) || 0
    if (!form.name) { alert('El nombre es obligatorio'); return }
    if (isNaN(priceVal) || priceVal < 0) { alert('Ingresa un precio válido'); return }
    setSaving(true)
    const payload = {
      name: form.name,
      description: form.description || null,
      category_id: form.category_id || null,
      price: priceVal, cost: costVal,
      stock: Number(form.stock), min_stock: Number(form.min_stock),
      unit: form.unit, is_beverage: isBeverage, is_active: form.is_active,
      updated_at: new Date().toISOString(),
    }
    const { error } = editing
      ? await supabase.from('products').update(payload).eq('id', editing.id)
      : await supabase.from('products').insert([payload])
    setSaving(false)
    if (error) { alert('Error: ' + error.message); return }
    setShowModal(false)
    fetchAll()
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Desactivar este item?')) return
    await supabase.from('products').update({ is_active: false }).eq('id', id)
    fetchAll()
  }

  async function handleStockAdjust() {
    if (!stockForm.product_id || !stockForm.qty) return
    setSaving(true)
    const qty = stockForm.type === 'salida' ? -Math.abs(Number(stockForm.qty)) : Math.abs(Number(stockForm.qty))
    const product = allItems.find(p => p.id === stockForm.product_id)
    if (!product) { setSaving(false); return }
    await Promise.all([
      supabase.from('stock_movements').insert([{
        product_id: stockForm.product_id,
        movement_type: stockForm.type,
        quantity: Math.abs(Number(stockForm.qty)),
        reason: stockForm.reason || null,
      }]),
      supabase.from('products').update({ stock: Math.max(0, product.stock + qty) }).eq('id', stockForm.product_id),
    ])
    setSaving(false)
    setShowStockModal(false)
    setStockForm({ product_id: '', qty: 0, reason: '', type: 'entrada' })
    fetchAll()
  }

  const priceNum = parseFloat(String(form.price).replace(',', '.')) || 0
  const costNum = parseFloat(String(form.cost).replace(',', '.')) || 0
  const lowStockCount = allItems.filter(p => p.stock <= p.min_stock).length

  return (
    <AppLayout>
      <div className="space-y-5 animate-in pt-2 md:pt-0">

        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="section-title text-white">Inventario</h1>
            <p className="text-white/40 text-sm mt-1">
              {products.length} productos · {bebidas.length} bebidas
              {lowStockCount > 0 && <span className="text-orange-400 ml-2">· ⚠ {lowStockCount} bajo stock</span>}
            </p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            {isAdmin && (
              <button onClick={() => setShowStockModal(true)} className="btn-secondary text-xs md:text-sm">
                📦 <span className="hidden sm:inline">Ajustar </span>Stock
              </button>
            )}
            {isAdmin && (
              <button onClick={openNew} className="btn-primary text-xs md:text-sm">
                + <span className="hidden sm:inline">Nuevo </span>{isBeverage ? 'Bebida' : 'Producto'}
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)', width: 'fit-content' }}>
          {(['productos', 'bebidas'] as Tab[]).map(t => (
            <button key={t} onClick={() => { setTab(t); setFilter('') }}
              className="px-4 py-2 rounded-lg text-sm font-medium capitalize transition-all"
              style={tab === t
                ? { background: 'linear-gradient(90deg, rgba(249,115,22,0.25), rgba(124,58,237,0.15))', color: '#f97316', border: '1px solid rgba(249,115,22,0.3)' }
                : { color: 'rgba(255,255,255,0.4)' }
              }>
              {t === 'productos' ? '📦 Productos' : '🧃 Bebidas'}
            </button>
          ))}
        </div>

        {/* Buscador */}
        <input
          className="input-field max-w-xs"
          placeholder={`🔍 Buscar ${isBeverage ? 'bebida' : 'producto'}...`}
          value={filter}
          onChange={e => setFilter(e.target.value)}
        />

        {/* Grid */}
        {loading ? (
          <div className="text-center text-white/20 py-16">Cargando...</div>
        ) : list.length === 0 ? (
          <div className="card text-center py-16">
            <div className="text-4xl mb-3">{isBeverage ? '🧃' : '📦'}</div>
            <div className="text-white/40 text-sm">
              No hay {isBeverage ? 'bebidas' : 'productos'}.{isAdmin ? ' Crea el primero.' : ''}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {list.map(p => {
              const lowStock = p.stock <= p.min_stock
              return (
                <div key={p.id} className={`card relative flex flex-col gap-2 ${lowStock ? 'border-orange-500/40' : ''}`}>
                  {lowStock && (
                    <div className="absolute top-2.5 right-2.5">
                      <span className="text-orange-400 text-xs">⚠</span>
                    </div>
                  )}
                  <div className="pr-5">
                    <div className="text-white font-medium text-sm leading-snug line-clamp-2">{p.name}</div>
                    {(p as any).product_categories && (
                      <span className="text-xs mt-0.5 inline-block opacity-70"
                        style={{ color: (p as any).product_categories?.color }}>
                        {(p as any).product_categories?.name}
                      </span>
                    )}
                  </div>
                  <div className="flex items-end justify-between mt-auto gap-1">
                    <div>
                      <div className="text-orange-400 font-bold text-base" style={{ fontFamily: 'Oswald, sans-serif' }}>
                        {formatCurrency(p.price)}
                      </div>
                      <div className={`text-xs ${lowStock ? 'text-orange-400' : 'text-white/30'}`}>
                        Stock: {p.stock} {p.unit}
                      </div>
                    </div>
                    {isAdmin && (
                      <div className="flex gap-1">
                        <button onClick={() => openEdit(p)}
                          className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 hover:text-white text-xs flex items-center justify-center transition-all">
                          ✏
                        </button>
                        <button onClick={() => handleDelete(p.id)}
                          className="w-7 h-7 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs flex items-center justify-center transition-all">
                          ×
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Modal Crear/Editar */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)}
        title={editing ? `Editar ${isBeverage ? 'Bebida' : 'Producto'}` : `Nuevo ${isBeverage ? 'Bebida' : 'Producto'}`}
        size="lg">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="label">Nombre *</label>
            <input className="input-field" value={form.name}
              onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              placeholder={`Nombre del ${isBeverage ? 'bebida' : 'producto'}`} />
          </div>
          <div className="md:col-span-2">
            <label className="label">Descripción</label>
            <textarea className="input-field h-14 resize-none" value={form.description}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              placeholder="Descripción opcional..." />
          </div>
          <div>
            <label className="label">Categoría</label>
            <select className="input-field" value={form.category_id}
              onChange={e => setForm(p => ({ ...p, category_id: e.target.value }))}>
              <option value="">Sin categoría</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Unidad</label>
            <select className="input-field" value={form.unit}
              onChange={e => setForm(p => ({ ...p, unit: e.target.value }))}>
              {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Precio de venta *</label>
            <input type="text" inputMode="decimal" className="input-field"
              value={form.price}
              onChange={e => {
                const v = e.target.value.replace(',', '.')
                if (v === '' || /^\d*\.?\d{0,2}$/.test(v)) setForm(p => ({ ...p, price: v }))
              }}
              placeholder="0.00" />
          </div>
          <div>
            <label className="label">Costo</label>
            <input type="text" inputMode="decimal" className="input-field"
              value={form.cost}
              onChange={e => {
                const v = e.target.value.replace(',', '.')
                if (v === '' || /^\d*\.?\d{0,2}$/.test(v)) setForm(p => ({ ...p, cost: v }))
              }}
              placeholder="0.00" />
          </div>
          <div>
            <label className="label">Stock actual</label>
            <input type="number" className="input-field" value={form.stock}
              onChange={e => setForm(p => ({ ...p, stock: Number(e.target.value) }))} />
          </div>
          <div>
            <label className="label">Stock mínimo</label>
            <input type="number" className="input-field" value={form.min_stock}
              onChange={e => setForm(p => ({ ...p, min_stock: Number(e.target.value) }))} />
          </div>
          {priceNum > 0 && costNum > 0 && (
            <div className="md:col-span-2 p-3 rounded-xl bg-orange-500/10 border border-orange-500/20">
              <div className="text-orange-400 text-xs">
                Margen: {formatCurrency(priceNum - costNum)} ({Math.round(((priceNum - costNum) / priceNum) * 100)}%)
              </div>
            </div>
          )}
        </div>
        <div className="flex justify-end gap-3 mt-5">
          <button onClick={() => setShowModal(false)} className="btn-secondary">Cancelar</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary">
            {saving ? 'Guardando...' : `✓ ${editing ? 'Actualizar' : 'Crear'}`}
          </button>
        </div>
      </Modal>

      {/* Modal Ajuste Stock */}
      <Modal isOpen={showStockModal} onClose={() => setShowStockModal(false)} title="Ajustar Stock" size="sm">
        <div className="space-y-4">
          <div>
            <label className="label">Producto / Bebida</label>
            <select className="input-field" value={stockForm.product_id}
              onChange={e => setStockForm(p => ({ ...p, product_id: e.target.value }))}>
              <option value="">Seleccionar...</option>
              <optgroup label="📦 Productos">
                {products.map(p => <option key={p.id} value={p.id}>{p.name} (stock: {p.stock})</option>)}
              </optgroup>
              <optgroup label="🧃 Bebidas">
                {bebidas.map(p => <option key={p.id} value={p.id}>{p.name} (stock: {p.stock})</option>)}
              </optgroup>
            </select>
          </div>
          <div>
            <label className="label">Tipo</label>
            <div className="flex gap-2">
              {['entrada', 'salida', 'ajuste'].map(t => (
                <button key={t} onClick={() => setStockForm(p => ({ ...p, type: t }))}
                  className={`flex-1 py-2 rounded-xl text-sm capitalize transition-all ${stockForm.type === t ? 'bg-orange-500 text-white' : 'bg-white/5 text-white/50 hover:bg-white/10'}`}>
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="label">Cantidad</label>
            <input type="number" className="input-field" value={stockForm.qty}
              onChange={e => setStockForm(p => ({ ...p, qty: Number(e.target.value) }))} />
          </div>
          <div>
            <label className="label">Motivo</label>
            <input className="input-field" value={stockForm.reason}
              onChange={e => setStockForm(p => ({ ...p, reason: e.target.value }))}
              placeholder="Compra, pérdida, inventario..." />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-5">
          <button onClick={() => setShowStockModal(false)} className="btn-secondary">Cancelar</button>
          <button onClick={handleStockAdjust} disabled={saving} className="btn-primary">
            {saving ? 'Guardando...' : '✓ Confirmar'}
          </button>
        </div>
      </Modal>
    </AppLayout>
  )
}
