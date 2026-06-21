'use client'
import { useEffect, useState } from 'react'
import AppLayout from '@/components/ui/AppLayout'
import { supabase } from '@/lib/supabase'
import { formatCurrency, formatDate, getLast30Days } from '@/lib/utils'
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  AreaChart, Area, PieChart, Pie, Cell, Legend
} from 'recharts'

export default function ReportesPage() {
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState('30d')
  const [data, setData] = useState<any>({
    totalRevenue: 0, totalTransactions: 0, avgTicket: 0,
    revenueByType: [], dailyRevenue: [], topProducts: [],
    reservationStats: { total: 0, confirmed: 0, cancelled: 0, revenue: 0 },
    championshipStats: { total: 0, active: 0, teams: 0, revenue: 0 },
    stockAlerts: [],
  })

  useEffect(() => { fetchReports() }, [period])

  function getDateRange() {
    const end = new Date()
    const start = new Date()
    if (period === '7d') start.setDate(start.getDate() - 6)
    else if (period === '30d') start.setDate(start.getDate() - 29)
    else if (period === '90d') start.setDate(start.getDate() - 89)
    else start.setFullYear(start.getFullYear(), 0, 1)
    return { start: start.toISOString().split('T')[0], end: end.toISOString().split('T')[0] }
  }

  async function fetchReports() {
    setLoading(true)
    const { start, end } = getDateRange()

    const [salesRes, reservRes, champRes, teamsRes, stockRes, saleItemsRes] = await Promise.all([
      supabase.from('sales').select('*').gte('created_at', start).lte('created_at', end + 'T23:59:59'),
      supabase.from('reservations').select('*').gte('created_at', start).lte('created_at', end + 'T23:59:59'),
      supabase.from('championships').select('*'),
      supabase.from('teams').select('*'),
      supabase.from('products').select('*').lte('stock', 10).eq('is_active', true),
      supabase.from('sale_items').select('*, products(name)').gte('created_at', start).lte('created_at', end + 'T23:59:59'),
    ])

    const sales = salesRes.data || []
    const reservations = reservRes.data || []
    const championships = champRes.data || []
    const teams = teamsRes.data || []
    const stockAlerts = stockRes.data || []
    const items = saleItemsRes.data || []

    const totalRevenue = sales.reduce((s, x) => s + Number(x.total_amount), 0)
    const totalTransactions = sales.length

    // Revenue by type
    const types = ['alquiler', 'campeonato', 'producto', 'bebida', 'otro']
    const typeColors = ['#f97316', '#a855f7', '#f59e0b', '#0ea5e9', '#6b7280']
    const revenueByType = types.map((t, i) => ({
      name: t.charAt(0).toUpperCase() + t.slice(1),
      value: sales.filter(s => s.sale_type === t).reduce((a, b) => a + Number(b.total_amount), 0),
      color: typeColors[i],
    })).filter(x => x.value > 0)

    // Daily revenue (last N days)
    const days = period === '7d' ? 7 : period === '30d' ? 30 : period === '90d' ? 90 : 365
    const dailyRevenue = Array.from({ length: Math.min(days, 60) }, (_, i) => {
      const d = new Date(end); d.setDate(d.getDate() - (Math.min(days, 60) - 1 - i))
      const key = d.toISOString().split('T')[0]
      const label = d.toLocaleDateString('es-CO', days <= 30 ? { day: 'numeric', month: 'short' } : { month: 'short' })
      return {
        label,
        Ingresos: sales.filter(s => s.created_at.startsWith(key)).reduce((a, b) => a + Number(b.total_amount), 0),
      }
    })

    // Top products
    const productMap: Record<string, { name: string; qty: number; revenue: number }> = {}
    items.forEach(item => {
      const name = (item as any).products?.name || item.product_name
      if (!productMap[name]) productMap[name] = { name, qty: 0, revenue: 0 }
      productMap[name].qty += item.quantity
      productMap[name].revenue += Number(item.subtotal || item.quantity * item.unit_price)
    })
    const topProducts = Object.values(productMap).sort((a, b) => b.revenue - a.revenue).slice(0, 8)

    setData({
      totalRevenue, totalTransactions,
      avgTicket: totalTransactions > 0 ? totalRevenue / totalTransactions : 0,
      revenueByType, dailyRevenue, topProducts,
      reservationStats: {
        total: reservations.length,
        confirmed: reservations.filter(r => r.status === 'confirmada').length,
        cancelled: reservations.filter(r => r.status === 'cancelada').length,
        revenue: sales.filter(s => s.sale_type === 'alquiler').reduce((s, r) => s + Number(r.total_amount), 0),
      },
      championshipStats: {
        total: championships.length,
        active: championships.filter(c => c.status === 'en_curso').length,
        teams: teams.length,
        revenue: sales.filter(s => s.sale_type === 'campeonato').reduce((s, t) => s + Number(t.total_amount), 0),
      },
      stockAlerts,
    })
    setLoading(false)
  }

  function exportCSV() {
    const rows = [
      ['Reporte Cancha Sintetica Invictos'],
      ['Periodo', period],
      [''],
      ['RESUMEN'],
      ['Ingresos totales', data.totalRevenue],
      ['Transacciones', data.totalTransactions],
      ['Ticket promedio', data.avgTicket.toFixed(0)],
      [''],
      ['INGRESOS POR TIPO'],
      ...data.revenueByType.map((r: any) => [r.name, r.value]),
      [''],
      ['RESERVAS'],
      ['Total', data.reservationStats.total],
      ['Confirmadas', data.reservationStats.confirmed],
      ['Canceladas', data.reservationStats.cancelled],
      [''],
      ['TOP PRODUCTOS'],
      ['Producto', 'Cantidad', 'Ingresos'],
      ...data.topProducts.map((p: any) => [p.name, p.qty, p.revenue]),
    ]
    const csv = rows.map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `reporte-sports-${period}.csv`; a.click()
  }

  return (
    <AppLayout>
      <div className="space-y-5 animate-in pt-2 md:pt-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="section-title text-white">Reportes</h1>
            <p className="text-white/40 text-sm mt-1">Analisis de rendimiento del negocio</p>
          </div>
          <div className="flex gap-3">
            <div className="flex rounded-xl overflow-hidden border border-white/10">
              {[['7d','7 dias'],['30d','30 dias'],['90d','90 dias'],['year','Este ano']].map(([v, l]) => (
                <button key={v} onClick={() => setPeriod(v)}
                  className={`px-3 py-2 text-xs transition-all ${period === v ? 'bg-orange-500 text-white' : 'text-white/40 hover:text-white/70 hover:bg-white/5'}`}>
                  {l}
                </button>
              ))}
            </div>
            <button onClick={exportCSV} className="btn-secondary text-xs">📥 Exportar CSV</button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20 text-white/20">Generando reporte...</div>
        ) : (
          <>
            {/* KPIs principales */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Ingresos totales', value: formatCurrency(data.totalRevenue), icon: '💵', color: '#f97316' },
                { label: 'Transacciones', value: data.totalTransactions, icon: '🧾', color: '#0ea5e9' },
                { label: 'Ticket promedio', value: formatCurrency(data.avgTicket), icon: '📊', color: '#f59e0b' },
                { label: 'Productos en alerta', value: data.stockAlerts.length, icon: '⚠️', color: '#ef4444' },
              ].map(k => (
                <div key={k.label} className="stat-card">
                  <div className="flex items-center justify-between">
                    <span className="text-white/40 text-xs">{k.label}</span>
                    <span className="text-xl">{k.icon}</span>
                  </div>
                  <div className="text-2xl font-bold mt-1" style={{ color: k.color, fontFamily: 'Oswald, sans-serif' }}>{k.value}</div>
                </div>
              ))}
            </div>

            {/* Modulos */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="card">
                <h3 className="text-white/60 text-xs uppercase tracking-wider mb-1">🏟 Alquiler de Cancha</h3>
                <div className="grid grid-cols-2 gap-3 mt-3">
                  {[['Total reservas', data.reservationStats.total], ['Confirmadas', data.reservationStats.confirmed], ['Canceladas', data.reservationStats.cancelled], ['Ingresos', formatCurrency(data.reservationStats.revenue)]].map(([l, v]) => (
                    <div key={l as string} className="stat-card">
                      <div className="text-white/40 text-xs">{l}</div>
                      <div className="text-lg font-bold text-white" style={{ fontFamily: 'Oswald, sans-serif' }}>{v}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="card">
                <h3 className="text-white/60 text-xs uppercase tracking-wider mb-1">🏆 Campeonatos</h3>
                <div className="grid grid-cols-2 gap-3 mt-3">
                  {[['Total campeonatos', data.championshipStats.total], ['En curso', data.championshipStats.active], ['Equipos inscritos', data.championshipStats.teams], ['Ingresos inscrip.', formatCurrency(data.championshipStats.revenue)]].map(([l, v]) => (
                    <div key={l as string} className="stat-card">
                      <div className="text-white/40 text-xs">{l}</div>
                      <div className="text-lg font-bold text-white" style={{ fontFamily: 'Oswald, sans-serif' }}>{v}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Graficas */}
            <div className="card">
              <h3 className="text-white/70 text-sm font-medium mb-4">Ingresos diarios</h3>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={data.dailyRevenue}>
                  <defs>
                    <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.3)' }} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.3)' }} tickFormatter={v => `${(v/1000).toFixed(0)}K`} />
                  <Tooltip contentStyle={{ background: '#1a1000', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 11 }} formatter={(v: any) => [formatCurrency(Number(v)), 'Ingresos']} />
                  <Area type="monotone" dataKey="Ingresos" stroke="#f97316" fill="url(#grad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Pie por tipo */}
              <div className="card">
                <h3 className="text-white/70 text-sm font-medium mb-4">Distribucion por tipo</h3>
                {data.revenueByType.length > 0 ? (
                  <>
                    <ResponsiveContainer width="100%" height={180}>
                      <PieChart>
                        <Pie data={data.revenueByType} cx="50%" cy="50%" outerRadius={75} dataKey="value" strokeWidth={0}>
                          {data.revenueByType.map((e: any, i: number) => <Cell key={i} fill={e.color} />)}
                        </Pie>
                        <Tooltip contentStyle={{ background: '#1a1000', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 11 }} formatter={(v: any) => [formatCurrency(Number(v)), ""]} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="space-y-1.5">
                      {data.revenueByType.map((d: any) => (
                        <div key={d.name} className="flex items-center gap-2 text-xs">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} />
                          <span className="text-white/50 flex-1">{d.name}</span>
                          <span className="text-white/80">{formatCurrency(d.value)}</span>
                          <span className="text-white/30">({data.totalRevenue > 0 ? Math.round(d.value / data.totalRevenue * 100) : 0}%)</span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : <div className="flex items-center justify-center h-48 text-white/20 text-sm">Sin datos</div>}
              </div>

              {/* Top productos */}
              <div className="card">
                <h3 className="text-white/70 text-sm font-medium mb-4">Productos mas vendidos</h3>
                {data.topProducts.length === 0 ? (
                  <div className="flex items-center justify-center h-48 text-white/20 text-sm">Sin ventas de productos</div>
                ) : (
                  <div className="space-y-2">
                    {data.topProducts.map((p: any, i: number) => {
                      const maxRevenue = data.topProducts[0]?.revenue || 1
                      return (
                        <div key={p.name} className="flex items-center gap-3">
                          <span className="text-white/20 text-xs w-4">{i + 1}</span>
                          <div className="flex-1 min-w-0">
                            <div className="text-white/80 text-xs truncate">{p.name}</div>
                            <div className="mt-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
                              <div className="h-full rounded-full bg-orange-500" style={{ width: `${(p.revenue / maxRevenue) * 100}%` }} />
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <div className="text-white/70 text-xs">{formatCurrency(p.revenue)}</div>
                            <div className="text-white/30 text-xs">{p.qty} uds</div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Alertas de stock */}
            {data.stockAlerts.length > 0 && (
              <div className="card border-orange-500/20">
                <h3 className="text-orange-400 text-sm font-medium mb-4">⚠ Productos con bajo stock</h3>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  {data.stockAlerts.map((p: any) => (
                    <div key={p.id} className="p-3 rounded-xl bg-orange-500/5 border border-orange-500/15">
                      <div className="text-white/80 text-sm font-medium">{p.name}</div>
                      <div className="text-orange-400 text-lg font-bold mt-1" style={{ fontFamily: 'Oswald, sans-serif' }}>{p.stock} <span className="text-xs font-normal text-white/30">{p.unit}</span></div>
                      <div className="text-white/30 text-xs">Minimo: {p.min_stock}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
      </div>
      </div>
    </AppLayout>
  )
}
