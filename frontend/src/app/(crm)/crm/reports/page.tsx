'use client'

import { useEffect, useState } from 'react'
import { Download, TrendingUp, Package, Users, Calendar } from 'lucide-react'
import { Button, Badge } from '@/components/ui'
import { Skeleton } from '@/components/ui'
import { api } from '@/lib/api'
import { formatPrice } from '@/lib/utils'

interface SalesSummary {
  total_orders: number
  total_revenue: number
  net_revenue: number
  total_discount: number
  data: RevenuePoint[]
}

interface TopProduct {
  id: string
  name: string
  sku: string | null
  units_sold: number
  revenue: number
}

interface TopCustomer {
  id: string
  full_name: string
  email: string
  order_count: number
  lifetime_value: number
}

interface RevenuePoint {
  date: string
  revenue: number
  orders: number
}

export default function CRMReportsPage() {
  const [from, setFrom] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 29)
    return d.toISOString().slice(0, 10)
  })
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10))
  const [summary, setSummary]         = useState<SalesSummary | null>(null)
  const [topProducts, setTopProducts] = useState<TopProduct[]>([])
  const [topCustomers, setTopCustomers] = useState<TopCustomer[]>([])
  const [chartData, setChartData]     = useState<RevenuePoint[]>([])
  const [loading, setLoading]         = useState(false)
  const [downloading, setDownloading] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const q = `from=${from}&to=${to}`
      const [s, products, customers] = await Promise.all([
        api.get<SalesSummary>(`/admin/reports/sales?${q}&format=json`),
        api.get<TopProduct[]>(`/admin/reports/top-products?${q}`),
        api.get<TopCustomer[]>(`/admin/reports/top-customers?${q}`),
      ])
      setSummary(s)
      setTopProducts(products)
      setTopCustomers(customers)
      setChartData(s.data ?? [])
    } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const downloadCSV = async () => {
    setDownloading(true)
    try {
      const url = `${process.env.NEXT_PUBLIC_API_URL ?? ''}/api/v1/admin/reports/sales?from=${from}&to=${to}&format=csv`
      const res = await fetch(url, { credentials: 'include' })
      const blob = await res.blob()
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = `bbsm-sales-${from}-to-${to}.csv`
      link.click()
    } finally { setDownloading(false) }
  }

  const maxRevenue = Math.max(...chartData.map(d => d.revenue), 1)

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-navy">Reports</h1>
        <Button variant="ghost" size="sm" onClick={downloadCSV} loading={downloading}>
          <Download size={14} /> Download CSV
        </Button>
      </div>

      {/* Date range */}
      <div className="bg-white rounded-2xl shadow-card p-4 mb-6 flex flex-wrap items-end gap-4">
        <div>
          <label className="text-xs font-semibold text-gray-600 block mb-1.5">From</label>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-600 block mb-1.5">To</label>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </div>
        <Button variant="primary" size="sm" onClick={load} loading={loading}>Apply</Button>

        <div className="flex gap-2 ml-auto">
          {[
            { label: '7d', days: 7 }, { label: '30d', days: 30 }, { label: '90d', days: 90 },
          ].map(({ label, days }) => (
            <button
              key={label}
              onClick={() => {
                const d = new Date(); const f = new Date(); f.setDate(f.getDate() - days + 1)
                setTo(d.toISOString().slice(0, 10)); setFrom(f.toISOString().slice(0, 10))
              }}
              className="px-3 py-1.5 text-xs font-bold rounded-lg border border-gray-200 text-gray-600 hover:border-primary hover:text-primary transition-colors"
            >{label}</button>
          ))}
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {loading || !summary ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl p-5 shadow-card"><Skeleton className="h-8 w-24 rounded mb-2" /><Skeleton className="h-3 w-20 rounded" /></div>
          ))
        ) : [
          { icon: TrendingUp, label: 'Total Revenue', value: formatPrice(summary.total_revenue), color: 'text-primary' },
          { icon: Package, label: 'Orders', value: summary.total_orders.toString(), color: 'text-navy' },
          { icon: Calendar, label: 'Net Revenue', value: formatPrice(summary.net_revenue), color: 'text-steel' },
          { icon: Users, label: 'Discounts Given', value: formatPrice(summary.total_discount), color: 'text-accent' },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="bg-white rounded-2xl p-5 shadow-card">
            <Icon size={18} className={`${color} mb-3`} />
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            <p className="text-xs text-gray-400 mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Revenue bar chart */}
      {chartData.length > 0 && (
        <div className="bg-white rounded-2xl shadow-card p-5 mb-6">
          <h2 className="font-bold text-navy mb-4">Revenue Trend</h2>
          <div className="flex items-end gap-1 h-32">
            {chartData.map((d) => (
              <div key={d.date} className="flex-1 flex flex-col items-center gap-1 group">
                <div
                  className="w-full bg-primary rounded-t-sm transition-all group-hover:bg-primary-dark"
                  style={{ height: `${(d.revenue / maxRevenue) * 100}%`, minHeight: d.revenue > 0 ? '2px' : '0' }}
                />
                <span className="text-[9px] text-gray-400 rotate-45 origin-left whitespace-nowrap hidden group-hover:block absolute -mt-5 bg-navy text-white px-1.5 py-0.5 rounded text-[10px] font-medium z-10">
                  {formatPrice(d.revenue)}
                </span>
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2 text-[10px] text-gray-400">
            <span>{chartData[0]?.date ? new Date(chartData[0].date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : ''}</span>
            <span>{chartData[chartData.length - 1]?.date ? new Date(chartData[chartData.length - 1].date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : ''}</span>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Top products */}
        <div className="bg-white rounded-2xl shadow-card overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-bold text-navy">Top Products</h2>
          </div>
          {loading ? (
            <div className="p-5 space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-8 rounded" />)}</div>
          ) : topProducts.length === 0 ? (
            <p className="text-center py-8 text-gray-400 text-sm">No sales data for this period</p>
          ) : (
            <table className="w-full">
              <thead><tr className="border-b border-gray-50">
                <th className="text-left text-xs text-gray-400 font-bold uppercase px-5 py-3">Product</th>
                <th className="text-right text-xs text-gray-400 font-bold uppercase px-5 py-3">Units</th>
                <th className="text-right text-xs text-gray-400 font-bold uppercase px-5 py-3">Revenue</th>
              </tr></thead>
              <tbody>
                {topProducts.map((p, i) => (
                  <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-bold text-gray-300 w-4">{i + 1}</span>
                        <div>
                          <p className="text-sm font-medium text-navy">{p.name}</p>
                          {p.sku && <p className="text-xs text-gray-400 font-mono">{p.sku}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-right text-sm font-semibold text-navy">{p.units_sold}</td>
                    <td className="px-5 py-3 text-right text-sm font-bold text-primary">{formatPrice(p.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Top customers */}
        <div className="bg-white rounded-2xl shadow-card overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-bold text-navy">Top Customers</h2>
          </div>
          {loading ? (
            <div className="p-5 space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-8 rounded" />)}</div>
          ) : topCustomers.length === 0 ? (
            <p className="text-center py-8 text-gray-400 text-sm">No customer data for this period</p>
          ) : (
            <table className="w-full">
              <thead><tr className="border-b border-gray-50">
                <th className="text-left text-xs text-gray-400 font-bold uppercase px-5 py-3">Customer</th>
                <th className="text-right text-xs text-gray-400 font-bold uppercase px-5 py-3">Orders</th>
                <th className="text-right text-xs text-gray-400 font-bold uppercase px-5 py-3">Spent</th>
              </tr></thead>
              <tbody>
                {topCustomers.map((c, i) => (
                  <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-bold text-gray-300 w-4">{i + 1}</span>
                        <div className="w-7 h-7 rounded-full bg-primary-light flex items-center justify-center text-xs font-bold text-primary">
                          {c.full_name[0]}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-navy">{c.full_name}</p>
                          <p className="text-xs text-gray-400">{c.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-right text-sm font-semibold text-navy">{c.order_count}</td>
                    <td className="px-5 py-3 text-right text-sm font-bold text-primary">{formatPrice(c.lifetime_value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
