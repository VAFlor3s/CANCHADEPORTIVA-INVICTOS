'use client'
import { useEffect, useState } from 'react'
import AppLayout from '@/components/ui/AppLayout'
import { supabase } from '@/lib/supabase'
import { fmt, getLast30Days } from '@/lib/utils'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

export default function DashboardPage() {
  const [stats, setStats]   = useState({ sales: 0, reservas: 0, stock: 0, products: 0 })
  const [chart, setChart]   = useState<any[]>([])
  const [recent, setRecent] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [])

  async function load() {
    const { start, end } = getLast30Days()

    const [salesRes, resRes, prodRes, recentRes] = await Promise.all([
      supabase.from('sales').select('total_amount, sale_type, created_at')
        .gte('created_at', start + 'T00:00:00')
        .lte('created_at', end + 'T23:59:59'),
      supabase.from('reservations').select('count', { count: 'exact' })
        .eq('status', 'confirmada')
        .gte('date', new Date().toISOString().split('T')[0]),
      supabase.from('products').select('stock, min_stock').eq('is_active', true),
      supabase.from('sales').select('*, sale_items(*)').order('created_at', { ascending: false }).limit(8),
    ])

    const salesData  = salesRes.data  || []
    const prodsData  = prodRes.data   || []

    const totalSales  = salesData.reduce((s, x) => s + Number(x.total_amount), 0)
    const lowStock    = prodsData.filter(p => p.stock <= p.min_stock).length

    // Chart — last 7 days
    const days: Record<string, number> = {}
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i)
      days[d.toISOString().split('T')[0]] = 0
    }
    salesData.forEach(s => {
      const d = s.created_at.split('T')[0]
      if (d in days) days[d] += Number(s.total_amount)
    })
    const chartData = Object.entries(days).map(([date, total]) => ({
      dia: new Date(date + 'T00:00:00').toLocaleDateString('es-CO', { weekday: 'short', day: '2-digit' }),
      total,
    }))

    setStats({ sales: totalSales, reservas: resRes.count || 0, stock: lowStock, products: prodsData.length })
    setChart(chartData)
    setRecent(recentRes.data || [])
    setLoading(false)
  }

  const TYPE_ICON: Record<string, string> = {
    producto:'📦', bebida:'🧃', alquiler:'🏟', campeonato:'🏆', otro:'📌',
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="ttitle">Dashboard</h1>
          <p className="text-white/30 text-sm mt-1">Últimos 30 días</p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Ingresos (30d)',   value: fmt(stats.sales),      icon: '💰', color: '#f97316' },
            { label: 'Reservas activas', value: stats.reservas,        icon: '🏟', color: '#a78bfa' },
            { label: 'Productos',        value: stats.products,        icon: '📦', color: '#60a5fa' },
            { label: 'Stock bajo',       value: stats.stock,           icon: '⚠️', color: stats.stock > 0 ? '#f87171' : '#4ade80' },
          ].map(k => (
            <div key={k.label} className="kpi flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-white/40 text-xs uppercase tracking-wider">{k.label}</span>
                <span className="text-xl">{k.icon}</span>
              </div>
              <div className="text-2xl font-bold" style={{ fontFamily: 'Oswald,sans-serif', color: k.color }}>
                {loading ? '—' : k.value}
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Chart */}
          <div className="card">
            <h2 className="text-white/60 text-xs uppercase tracking-wider mb-4">Ventas últimos 7 días</h2>
            {loading ? (
              <div className="h-44 flex items-center justify-center text-white/20 text-sm">Cargando...</div>
            ) : (
              <ResponsiveContainer width="100%" height={176}>
                <BarChart data={chart} barSize={24}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="dia" tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: 'rgba(255,255,255,0.25)', fontSize: 10 }} axisLine={false} tickLine={false}
                    tickFormatter={v => fmt(v).replace(/\$|\s/g,'').slice(0,6)} width={52} />
                  <Tooltip formatter={(v: any) => [fmt(Number(v)), 'Ventas']}
                    contentStyle={{ background:'#1a0f12', border:'1px solid rgba(249,115,22,0.3)', borderRadius:12, color:'#fff', fontSize:12 }} />
                  <Bar dataKey="total" fill="#f97316" radius={[6,6,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Recent sales */}
          <div className="card">
            <h2 className="text-white/60 text-xs uppercase tracking-wider mb-4">Últimas ventas</h2>
            {loading ? (
              <div className="text-white/20 text-sm">Cargando...</div>
            ) : recent.length === 0 ? (
              <div className="text-white/20 text-sm">Sin ventas registradas</div>
            ) : (
              <div className="space-y-2">
                {recent.map(s => (
                  <div key={s.id} className="flex items-center gap-3 py-2 border-b border-white/5">
                    <span className="text-xl">{TYPE_ICON[s.sale_type] || '📌'}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-white text-sm truncate">{s.customer_name || s.sale_type}</div>
                      <div className="text-white/30 text-xs">
                        {new Date(s.created_at).toLocaleDateString('es-CO')}
                      </div>
                    </div>
                    <div className="text-orange-400 font-bold text-sm">{fmt(Number(s.total_amount))}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
