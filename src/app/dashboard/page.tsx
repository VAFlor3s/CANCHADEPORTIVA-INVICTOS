'use client'
import { useEffect, useState } from 'react'
import AppLayout from '@/components/ui/AppLayout'
import { supabase } from '@/lib/supabase'
import { formatCurrency } from '@/lib/utils'

const TYPE_LABELS: Record<string, string> = {
  producto: '📦 Producto', bebida: '🧃 Bebida',
  alquiler: '🏟 Alquiler', campeonato: '🏆 Campeonato', otro: '📌 Otro',
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true)
  const [kpis, setKpis] = useState({ revenueMonth: 0, revenueToday: 0, activeReservations: 0, activeChampionships: 0, lowStock: 0, totalTransactions: 0 })
  const [revenueByType, setRevenueByType] = useState<{ name: string; value: number }[]>([])
  const [recentSales, setRecentSales] = useState<any[]>([])

  useEffect(() => { fetchDashboard() }, [])

  async function fetchDashboard() {
    setLoading(true)
    const today = new Date().toISOString().split('T')[0]
    const monthStart = today.slice(0, 7) + '-01'
    const [salesRes, reservRes, champRes, stockRes] = await Promise.all([
      supabase.from('sales').select('*').gte('created_at', monthStart + 'T00:00:00'),
      supabase.from('reservations').select('count', { count: 'exact' }).eq('status', 'confirmada').gte('date', today),
      supabase.from('championships').select('count', { count: 'exact' }).eq('status', 'en_curso'),
      supabase.from('products').select('count', { count: 'exact' }).lte('stock', 5).eq('is_active', true),
    ])
    const sales = salesRes.data || []
    const todaySales = sales.filter((s: any) => s.created_at.startsWith(today))
    const byType: Record<string, number> = {}
    sales.forEach((s: any) => { byType[s.sale_type] = (byType[s.sale_type] || 0) + Number(s.total_amount) })
    setKpis({
      revenueMonth: sales.reduce((s: number, x: any) => s + Number(x.total_amount), 0),
      revenueToday: todaySales.reduce((s: number, x: any) => s + Number(x.total_amount), 0),
      activeReservations: reservRes.count || 0,
      activeChampionships: champRes.count || 0,
      lowStock: stockRes.count || 0,
      totalTransactions: sales.length,
    })
    setRevenueByType(Object.entries(byType).map(([k, v]) => ({ name: TYPE_LABELS[k] || k, value: v as number })).sort((a, b) => b.value - a.value))
    const { data: recent } = await supabase.from('sales').select('*').order('created_at', { ascending: false }).limit(8)
    setRecentSales(recent || [])
    setLoading(false)
  }

  const KPIS = [
    { label: 'Ingresos del mes', value: formatCurrency(kpis.revenueMonth), icon: '💰', color: '#f97316' },
    { label: 'Ingresos hoy', value: formatCurrency(kpis.revenueToday), icon: '📅', color: '#a78bfa' },
    { label: 'Reservas activas', value: String(kpis.activeReservations), icon: '🏟', color: '#22c55e' },
    { label: 'Campeonatos activos', value: String(kpis.activeChampionships), icon: '🏆', color: '#f59e0b' },
    { label: 'Bajo stock', value: String(kpis.lowStock), icon: '⚠️', color: '#ef4444' },
    { label: 'Transacciones mes', value: String(kpis.totalTransactions), icon: '🧾', color: '#38bdf8' },
  ]

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-white/40 text-sm">Cargando dashboard...</div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="space-y-5 animate-in pt-2 md:pt-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="section-title text-white">Dashboard</h1>
            <p className="text-white/40 text-sm mt-1">Cancha Sintetica Invictos · Resumen del mes</p>
          </div>
          <button onClick={fetchDashboard} className="btn-secondary text-xs">↻ Actualizar</button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {KPIS.map(k => (
            <div key={k.label} className="stat-card">
              <div className="flex items-center justify-between mb-1">
                <span className="text-white/40 text-xs">{k.label}</span>
                <span className="text-lg">{k.icon}</span>
              </div>
              <div className="text-xl md:text-2xl font-bold" style={{ fontFamily: 'Oswald, sans-serif', color: k.color }}>
                {k.value}
              </div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="card lg:col-span-1">
            <h3 className="text-white/70 text-sm font-medium mb-4">Ingresos por tipo</h3>
            {revenueByType.length === 0 ? (
              <div className="text-white/20 text-sm text-center py-8">Sin datos este mes</div>
            ) : (
              <div className="space-y-3">
                {revenueByType.map(item => {
                  const max = revenueByType[0]?.value || 1
                  const pct = Math.round((item.value / max) * 100)
                  return (
                    <div key={item.name}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-white/60">{item.name}</span>
                        <span className="text-orange-400 font-medium">{formatCurrency(item.value)}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-white/5">
                        <div className="h-full rounded-full bg-orange-500 transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
          <div className="card lg:col-span-2">
            <h3 className="text-white/70 text-sm font-medium mb-4">Ventas recientes</h3>
            <div className="overflow-x-auto -mx-4 md:mx-0">
              <table className="w-full text-sm min-w-[400px]">
                <thead>
                  <tr className="text-white/30 text-xs uppercase tracking-wider">
                    <th className="text-left pb-3 px-4 md:px-0">Tipo</th>
                    <th className="text-left pb-3 px-2">Cliente</th>
                    <th className="text-left pb-3 px-2">Metodo</th>
                    <th className="text-right pb-3 px-4 md:px-0">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {recentSales.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center text-white/20 py-8">Sin ventas registradas</td>
                    </tr>
                  ) : recentSales.map(sale => (
                    <tr key={sale.id} className="table-row">
                      <td className="py-2.5 px-4 md:px-0">{TYPE_LABELS[sale.sale_type] || sale.sale_type}</td>
                      <td className="py-2.5 px-2 text-white/60">{sale.customer_name || '--'}</td>
                      <td className="py-2.5 px-2 text-white/40 capitalize">{sale.payment_method}</td>
                      <td className="py-2.5 px-4 md:px-0 text-right font-medium text-orange-400">{formatCurrency(Number(sale.total_amount))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
      </div>
    </AppLayout>
  )
}
