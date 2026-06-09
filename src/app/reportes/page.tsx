'use client'
import { useEffect, useState } from 'react'
import AppLayout from '@/components/ui/AppLayout'
import { supabase } from '@/lib/supabase'
import { fmt, getLast30Days } from '@/lib/utils'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'

const COLORS = ['#f97316','#a78bfa','#60a5fa','#4ade80','#fb7185']

export default function ReportesPage() {
  const [from, setFrom] = useState(getLast30Days().start)
  const [to,   setTo]   = useState(getLast30Days().end)
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [from, to])

  async function load() {
    setLoading(true)
    const [salesRes, resRes, champsRes, teamsRes, prodRes] = await Promise.all([
      supabase.from('sales').select('*').gte('created_at', from + 'T00:00:00').lte('created_at', to + 'T23:59:59'),
      supabase.from('reservations').select('*').gte('date', from).lte('date', to),
      supabase.from('championships').select('*'),
      supabase.from('teams').select('*'),
      supabase.from('products').select('*').eq('is_active', true),
    ])

    const sales      = salesRes.data  || []
    const reservas   = resRes.data    || []
    const champs     = champsRes.data || []
    const teams      = teamsRes.data  || []
    const prods      = prodRes.data   || []

    const totalIncome = sales.reduce((s, x) => s + Number(x.total_amount), 0)

    // Por tipo
    const byType: Record<string,number> = {}
    sales.forEach(s => {
      byType[s.sale_type] = (byType[s.sale_type] || 0) + Number(s.total_amount)
    })

    const pieData = Object.entries(byType).map(([name, value]) => ({ name, value }))

    // Por día
    const days: Record<string,number> = {}
    const cur = new Date(from)
    const end = new Date(to)
    while (cur <= end) {
      days[cur.toISOString().split('T')[0]] = 0
      cur.setDate(cur.getDate() + 1)
    }
    sales.forEach(s => {
      const d = s.created_at.split('T')[0]
      if (d in days) days[d] += Number(s.total_amount)
    })
    const lineData = Object.entries(days).map(([date, total]) => ({
      dia: new Date(date + 'T00:00:00').toLocaleDateString('es-CO', { month:'short', day:'2-digit' }),
      total,
    }))

    // Método de pago
    const byMethod: Record<string,number> = {}
    sales.forEach(s => { byMethod[s.payment_method] = (byMethod[s.payment_method] || 0) + Number(s.total_amount) })

    // Reservas
    const resStats = {
      total: reservas.length,
      confirmadas: reservas.filter(r => r.status === 'confirmada').length,
      canceladas: reservas.filter(r => r.status === 'cancelada').length,
      income: sales.filter(s => s.sale_type === 'alquiler').reduce((s, x) => s + Number(x.total_amount), 0),
    }

    // Stock bajo
    const lowStock = prods.filter(p => p.stock <= p.min_stock)

    setData({ totalIncome, byType, pieData, lineData, byMethod, resStats, lowStock, sales, champs, teams })
    setLoading(false)
  }

  const TYPE_LABEL: Record<string,string> = {
    producto:'Productos', bebida:'Bebidas', alquiler:'Alquiler', campeonato:'Campeonatos', otro:'Otros',
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="ttitle">Reportes</h1>
          <p className="text-white/30 text-sm mt-1">Análisis financiero del período</p>
        </div>

        {/* Período */}
        <div className="flex gap-3 flex-wrap items-center">
          <div>
            <label className="label">Desde</label>
            <input type="date" className="input w-44" value={from} onChange={e => setFrom(e.target.value)} />
          </div>
          <div>
            <label className="label">Hasta</label>
            <input type="date" className="input w-44" value={to} onChange={e => setTo(e.target.value)} />
          </div>
          {[
            { label: 'Hoy', fn: () => { const t=new Date().toISOString().split('T')[0]; setFrom(t); setTo(t) } },
            { label: '7 días', fn: () => { const e=new Date(),s=new Date(); s.setDate(s.getDate()-6); setFrom(s.toISOString().split('T')[0]); setTo(e.toISOString().split('T')[0]) } },
            { label: '30 días', fn: () => { const {start,end}=getLast30Days(); setFrom(start); setTo(end) } },
          ].map(b => (
            <button key={b.label} onClick={b.fn} className="btn btn-secondary text-xs mt-5">{b.label}</button>
          ))}
        </div>

        {loading ? (
          <div className="text-white/20 text-sm py-16 text-center">Cargando datos...</div>
        ) : !data ? null : (
          <>
            {/* KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="kpi">
                <div className="text-white/35 text-xs uppercase tracking-wider mb-2">Ingresos totales</div>
                <div className="text-3xl font-bold text-orange-400" style={{ fontFamily:'Oswald,sans-serif' }}>{fmt(data.totalIncome)}</div>
              </div>
              <div className="kpi">
                <div className="text-white/35 text-xs uppercase tracking-wider mb-2">Transacciones</div>
                <div className="text-3xl font-bold text-white" style={{ fontFamily:'Oswald,sans-serif' }}>{data.sales.length}</div>
              </div>
              <div className="kpi">
                <div className="text-white/35 text-xs uppercase tracking-wider mb-2">Reservas</div>
                <div className="text-3xl font-bold text-purple-400" style={{ fontFamily:'Oswald,sans-serif' }}>{data.resStats.total}</div>
                <div className="text-white/25 text-xs">{data.resStats.canceladas} canceladas</div>
              </div>
              <div className="kpi">
                <div className="text-white/35 text-xs uppercase tracking-wider mb-2">Ingresos alquiler</div>
                <div className="text-3xl font-bold text-blue-400" style={{ fontFamily:'Oswald,sans-serif' }}>{fmt(data.resStats.income)}</div>
              </div>
            </div>

            {/* Por tipo */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {Object.entries(data.byType).map(([type, amount]: any) => (
                <div key={type} className="kpi">
                  <div className="text-white/35 text-xs">{TYPE_LABEL[type] || type}</div>
                  <div className="text-white font-bold text-lg mt-1" style={{ fontFamily:'Oswald,sans-serif' }}>{fmt(amount)}</div>
                  <div className="text-white/25 text-xs">{((amount / data.totalIncome) * 100).toFixed(1)}%</div>
                </div>
              ))}
            </div>

            {/* Gráficas */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="card">
                <h2 className="text-white/50 text-xs uppercase tracking-wider mb-4">Ingresos por día</h2>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={data.lineData} barSize={data.lineData.length > 20 ? 4 : 12}>
                    <XAxis dataKey="dia" tick={{ fill:'rgba(255,255,255,0.3)', fontSize:10 }} axisLine={false} tickLine={false}
                      interval={data.lineData.length > 15 ? Math.floor(data.lineData.length/8) : 0} />
                    <YAxis tick={{ fill:'rgba(255,255,255,0.2)', fontSize:9 }} axisLine={false} tickLine={false}
                      tickFormatter={v => fmt(v).replace(/\$|\s/g,'').slice(0,6)} width={50} />
                    <Tooltip formatter={(v:any) => [fmt(Number(v)),'Ingresos']}
                      contentStyle={{ background:'#1a0f12', border:'1px solid rgba(249,115,22,0.3)', borderRadius:12, color:'#fff', fontSize:12 }} />
                    <Bar dataKey="total" fill="#f97316" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="card">
                <h2 className="text-white/50 text-xs uppercase tracking-wider mb-4">Distribución por tipo</h2>
                {data.pieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={data.pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85}
                        paddingAngle={3} dataKey="value"
                        label={({ name, percent }) => `${TYPE_LABEL[name]||name} ${(percent*100).toFixed(0)}%`}
                        labelLine={false}>
                        {data.pieData.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v:any) => [fmt(Number(v))]}
                        contentStyle={{ background:'#1a0f12', border:'1px solid rgba(249,115,22,0.3)', borderRadius:12, color:'#fff', fontSize:12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-48 flex items-center justify-center text-white/20 text-sm">Sin datos</div>
                )}
              </div>
            </div>

            {/* Método de pago */}
            <div className="card">
              <h2 className="text-white/50 text-xs uppercase tracking-wider mb-4">Métodos de pago</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {Object.entries(data.byMethod).map(([method, amount]: any) => {
                  const icons: Record<string,string> = { efectivo:'💵', tarjeta:'💳', transferencia:'📱', otro:'❓' }
                  return (
                    <div key={method} className="kpi">
                      <div className="text-white/35 text-xs">{icons[method]} {method}</div>
                      <div className="text-white font-bold text-lg mt-1" style={{ fontFamily:'Oswald,sans-serif' }}>{fmt(amount)}</div>
                      <div className="text-white/25 text-xs">{((amount / data.totalIncome) * 100).toFixed(1)}%</div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Stock bajo */}
            {data.lowStock.length > 0 && (
              <div className="card">
                <h2 className="text-white/50 text-xs uppercase tracking-wider mb-4">⚠️ Productos con stock bajo</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {data.lowStock.map((p: any) => (
                    <div key={p.id} className="p-3 rounded-xl border border-red-500/20" style={{ background:'rgba(239,68,68,0.07)' }}>
                      <div className="text-white text-sm font-medium">{p.name}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-lg font-bold ${p.stock === 0 ? 'text-red-400' : 'text-yellow-400'}`}
                          style={{ fontFamily:'Oswald,sans-serif' }}>{p.stock}</span>
                        <span className="text-white/30 text-xs">/ mín {p.min_stock}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </AppLayout>
  )
}
