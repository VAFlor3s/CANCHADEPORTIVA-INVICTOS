'use client'
import { useEffect, useState } from 'react'
import AppLayout from '@/components/ui/AppLayout'
import { supabase } from '@/lib/supabase'
import { formatCurrency, getLast30Days } from '@/lib/utils'
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts'

export default function Dashboard() {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalRevenue: 0,
    revenueAlquiler: 0,
    revenueCampeonato: 0,
    revenueProductos: 0,
    totalReservations: 0,
    activeChampionships: 0,
    lowStockCount: 0,
    totalCustomers: 0,
  })
  const [salesChart, setSalesChart] = useState<any[]>([])
  const [pieData, setPieData] = useState<any[]>([])
  const [recentSales, setRecentSales] = useState<any[]>([])

  useEffect(() => {
    fetchDashboard()
  }, [])

  async function fetchDashboard() {
    setLoading(true)
    const { start, end } = getLast30Days()

    const [salesRes, reservRes, champRes, stockRes, customersRes] = await Promise.all([
      supabase.from('sales').select('*').gte('created_at', start + 'T00:00:00').lte('created_at', end + 'T23:59:59'),
      supabase.from('reservations').select('count', { count: 'exact' }).eq('status', 'confirmada').gte('date', new Date().toISOString().split('T')[0]),
      supabase.from('championships').select('count', { count: 'exact' }).eq('status', 'en_curso'),
      supabase.from('products').select('count', { count: 'exact' }).lte('stock', 5).eq('is_active', true),
      supabase.from('customers').select('count', { count: 'exact' }),
    ])

    const sales = salesRes.data || []
    const totalRevenue = sales.reduce((s, x) => s + Number(x.total_amount), 0)
    const revenueAlquiler = sales.filter(x => x.sale_type === 'alquiler').reduce((s, x) => s + Number(x.total_amount), 0)
    const revenueCampeonato = sales.filter(x => x.sale_type === 'campeonato').reduce((s, x) => s + Number(x.total_amount), 0)
    const revenueProductos = sales.filter(x => ['producto', 'bebida'].includes(x.sale_type)).reduce((s, x) => s + Number(x.total_amount), 0)

    setStats({
      totalRevenue,
      revenueAlquiler,
      revenueCampeonato,
      revenueProductos,
      totalReservations: reservRes.count || 0,
      activeChampionships: champRes.count || 0,
      lowStockCount: stockRes.count || 0,
      totalCustomers: customersRes.count || 0,
    })

    // Gráfica de ventas últimos 7 días
    const last7 = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(); d.setDate(d.getDate() - (6 - i))
      const key = d.toISOString().split('T')[0]
      const label = d.toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric' })
      const daySales = sales.filter(s => s.created_at.startsWith(key))
      return {
        label,
        Alquiler: daySales.filter(s => s.sale_type === 'alquiler').reduce((a, b) => a + Number(b.total_amount), 0),
        Productos: daySales.filter(s => ['producto', 'bebida'].includes(s.sale_type)).reduce((a, b) => a + Number(b.total_amount), 0),
        Campeonato: daySales.filter(s => s.sale_type === 'campeonato').reduce((a, b) => a + Number(b.total_amount), 0),
      }
    })
    setSalesChart(last7)

    // Pie data
    setPieData([
      { name: 'Alquiler', value: revenueAlquiler, color: '#f97316' },
      { name: 'Campeonatos', value: revenueCampeonato, color: '#0ea5e9' },
      { name: 'Productos', value: revenueProductos, color: '#f59e0b' },
    ].filter(x => x.value > 0))

    // Recientes
    const { data: recent } = await supabase.from('sales').select('*').order('created_at', { ascending: false }).limit(5)
    setRecentSales(recent || [])

    setLoading(false)
  }

  const KPI_CARDS = [
    { label: 'Ingresos (30 días)', value: formatCurrency(stats.totalRevenue), sub: 'Total facturado', color: '#f97316', icon: '💵' },
    { label: 'Alquiler Cancha', value: formatCurrency(stats.revenueAlquiler), sub: 'Últimos 30 días', color: '#0ea5e9', icon: '🏟' },
    { label: 'Campeonatos', value: formatCurrency(stats.revenueCampeonato), sub: 'Inscripciones cobradas', color: '#a855f7', icon: '🏆' },
    { label: 'Reservas Activas', value: stats.totalReservations, sub: 'Confirmadas', color: '#f59e0b', icon: '📅' },
    { label: 'Campeonatos en Curso', value: stats.activeChampionships, sub: 'En desarrollo', color: '#ef4444', icon: '⚽' },
    { label: 'Stock Bajo', value: stats.lowStockCount, sub: 'Productos bajo mínimo', color: '#f97316', icon: '⚠️' },
  ]

  const TYPE_LABELS: Record<string, string> = {
    producto: '📦 Producto',
    bebida: '🧃 Bebida',
    alquiler: '🏟 Alquiler',
    campeonato: '🏆 Campeonato',
    otro: '📌 Otro',
  }

  if (loading) return (
    <AppLayout>
      <div className="flex items-center justify-center h-64">
        <div className="text-white/40 text-sm">Cargando dashboard...</div>
      </div>
    </AppLayout>
  )

  return (
    <AppLayout>
      <div className="space-y-5 animate-in pt-2 md:pt-0">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="section-title text-white">Dashboard</h1>
            <p className="text-white/40 text-sm mt-1">Cancha Sintética Invictos · Resumen 30 días</p>
          </div>
          <button onClick={fetchDashboard} className="btn-secondary text-xs">
            ↻ Actualizar
          </button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
          {KPI_CARDS.map((kpi) => (
            <div key={kpi.label} className="stat-card">
              <div className="flex items-start justify-between">
                <span className="text-white/40 text-xs uppercase tracking-wider">{kpi.label}</span>
                <span className="text-2xl">{kpi.icon}</span>
              </div>
              <div className="text-2xl font-bold mt-1" style={{ color: kpi.color, fontFamily: 'Oswald, sans-serif' }}>
                {kpi.value}
              </div>
              <div className="text-white/30 text-xs">{kpi.sub}</div>
            </div>
          ))}
        </div>

        {/* Charts row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Bar chart */}
          <div className="card lg:col-span-2">
            <h3 className="text-white/70 text-sm font-medium mb-4">Ingresos últimos 7 días</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={salesChart} barSize={20}>
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.3)' }} />
                <YAxis tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.3)' }} tickFormatter={v => `${(v/1000).toFixed(0)}K`} />
                <Tooltip
                  contentStyle={{ background: '#1a1000', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 11 }}
                  labelStyle={{ color: 'rgba(255,255,255,0.7)' }}
                  formatter={(v: any) => [formatCurrency(Number(v)), ""]}
                />
                <Bar dataKey="Alquiler" fill="#f97316" radius={[4,4,0,0]} />
                <Bar dataKey="Productos" fill="#f59e0b" radius={[4,4,0,0]} />
                <Bar dataKey="Campeonato" fill="#a855f7" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Pie chart */}
          <div className="card">
            <h3 className="text-white/70 text-sm font-medium mb-4">Distribución ingresos</h3>
            {pieData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} dataKey="value" strokeWidth={0}>
                      {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: '#1a1000', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 11 }}
                      formatter={(v: any) => [formatCurrency(Number(v)), ""]}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-1.5 mt-2">
                  {pieData.map((d) => (
                    <div key={d.name} className="flex items-center gap-2 text-xs">
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: d.color }} />
                      <span className="text-white/50 flex-1">{d.name}</span>
                      <span className="text-white/80 font-medium">{formatCurrency(d.value)}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-40 text-white/20 text-sm">Sin datos</div>
            )}
          </div>
        </div>

        {/* Ventas recientes */}
        <div className="card">
          <h3 className="text-white/70 text-sm font-medium mb-4">Ventas recientes</h3>
          <div className="table-wrap">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-white/30 text-xs uppercase tracking-wider">
                <th className="text-left pb-3">Tipo</th>
                <th className="text-left pb-3">Cliente</th>
                <th className="text-left pb-3">Método</th>
                <th className="text-right pb-3">Total</th>
              </tr>
            </thead>
            <tbody>
              {recentSales.length === 0 ? (
                <tr><td colSpan={4} className="text-center text-white/20 py-8">Sin ventas registradas</td></tr>
              ) : recentSales.map((sale) => (
                <tr key={sale.id} className="table-row">
                  <td className="py-2.5">{TYPE_LABELS[sale.sale_type] || sale.sale_type}</td>
                  <td className="py-2.5 text-white/60">{sale.customer_name || '—'}</td>
                  <td className="py-2.5 text-white/40 capitalize">{sale.payment_method}</td>
                  <td className="py-2.5 text-right font-medium text-orange-400">{formatCurrency(Number(sale.total_amount))}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
