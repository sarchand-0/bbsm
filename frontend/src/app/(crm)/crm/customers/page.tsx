'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Search, ExternalLink } from 'lucide-react'
import { Badge, ErrorBanner } from '@/components/ui'
import { Skeleton } from '@/components/ui'
import { api } from '@/lib/api'
import { formatPrice } from '@/lib/utils'

interface AdminUser {
  id: string; full_name: string; email: string; phone: string | null
  role: string; status: string; order_count: number; lifetime_value: number; created_at: string
}

type RoleTab = 'all' | 'customer' | 'rider' | 'staff' | 'admin'

const ROLE_VARIANTS: Record<string, any> = {
  customer: 'default', rider: 'info', staff: 'warning', admin: 'danger',
}

const ALL_ROLES: { value: string; label: string }[] = [
  { value: 'customer', label: 'Customer' },
  { value: 'rider',    label: 'Rider' },
  { value: 'staff',    label: 'Staff' },
  { value: 'admin',    label: 'Admin' },
]

export default function CRMCustomersPage() {
  const [users, setUsers]         = useState<AdminUser[]>([])
  const [loading, setLoading]     = useState(true)
  const [loadError, setLoadError] = useState('')
  const [search, setSearch]       = useState('')
  const [roleTab, setRoleTab]     = useState<RoleTab>('all')
  const [changingRole, setChangingRole] = useState<string | null>(null)
  const [actionError, setActionError]   = useState('')

  const load = () => {
    setLoading(true); setLoadError('')
    const q = new URLSearchParams()
    if (search) q.set('search', search)
    api.get<AdminUser[]>(`/admin/users?${q.toString()}`)
      .then(setUsers).catch(() => setLoadError('Failed to load users')).finally(() => setLoading(false))
  }
  useEffect(load, [search])

  const changeRole = async (userId: string, newRole: string) => {
    setChangingRole(userId); setActionError('')
    try {
      await api.patch(`/admin/users/${userId}/role`, { role: newRole })
      load()
    } catch (e: any) {
      setActionError(e?.message ?? 'Failed to change role')
    } finally { setChangingRole(null) }
  }

  const toggleStatus = async (u: AdminUser) => {
    setActionError('')
    try {
      await api.patch(`/admin/users/${u.id}/status`, { status: u.status === 'active' ? 'suspended' : 'active' })
      load()
    } catch (e: any) { setActionError(e?.message ?? 'Failed') }
  }

  const filtered = roleTab === 'all' ? users : users.filter(u => u.role === roleTab)

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-navy mb-4">Users</h1>
      {loadError  && <ErrorBanner message={loadError}  onDismiss={() => setLoadError('')}  className="mb-4" />}
      {actionError && <ErrorBanner message={actionError} onDismiss={() => setActionError('')} className="mb-4" />}

      {/* Role tabs */}
      <div className="flex gap-1 mb-4 bg-gray-100 rounded-xl p-1 w-fit">
        {(['all', 'customer', 'rider', 'staff', 'admin'] as RoleTab[]).map(t => {
          const count = t === 'all' ? users.length : users.filter(u => u.role === t).length
          return (
            <button key={t} onClick={() => setRoleTab(t)}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors capitalize flex items-center gap-1 ${
                roleTab === t ? 'bg-white text-navy shadow-sm' : 'text-gray-400 hover:text-navy'
              }`}
            >
              {t}
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                roleTab === t ? 'bg-primary/10 text-primary' : 'bg-gray-200 text-gray-500'
              }`}>{count}</span>
            </button>
          )
        })}
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input placeholder="Search by name or email…" value={search} onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
      </div>

      <div className="bg-white rounded-2xl shadow-card overflow-hidden">
        <table className="w-full">
          <thead><tr className="border-b border-gray-100">
            {['User', 'Role', 'Orders', 'Lifetime Value', 'Status', 'Joined', 'Actions'].map(h => (
              <th key={h} className="text-left text-xs font-bold uppercase tracking-wide text-gray-400 px-5 py-4">{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {loading ? Array.from({ length: 5 }).map((_, i) => (
              <tr key={i}>{Array.from({ length: 7 }).map((_, j) => (
                <td key={j} className="px-5 py-4"><Skeleton className="h-4 rounded" /></td>
              ))}</tr>
            )) : filtered.map(u => (
              <tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary-light flex items-center justify-center text-sm font-bold text-primary">{u.full_name[0]}</div>
                    <div>
                      <p className="font-semibold text-navy text-sm">{u.full_name}</p>
                      <p className="text-xs text-gray-400">{u.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-4">
                  <select
                    value={u.role}
                    disabled={changingRole === u.id}
                    onChange={e => changeRole(u.id, e.target.value)}
                    className="border border-gray-200 rounded-lg px-2 py-1 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50 cursor-pointer"
                  >
                    {ALL_ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                </td>
                <td className="px-5 py-4 text-sm font-semibold text-navy">{u.order_count}</td>
                <td className="px-5 py-4 text-sm font-bold text-navy">{formatPrice(u.lifetime_value)}</td>
                <td className="px-5 py-4">
                  <button onClick={() => toggleStatus(u)}>
                    <Badge variant={u.status === 'active' ? 'success' : 'danger'} className="cursor-pointer hover:opacity-80">
                      {u.status}
                    </Badge>
                  </button>
                </td>
                <td className="px-5 py-4 text-xs text-gray-400">{new Date(u.created_at).toLocaleDateString()}</td>
                <td className="px-5 py-4">
                  <Link href={`/crm/customers/${u.id}`} className="flex items-center gap-1 text-xs text-primary font-medium hover:underline">
                    View <ExternalLink size={10} />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && filtered.length === 0 && <p className="text-center py-12 text-gray-400 text-sm">No users found</p>}
      </div>
    </div>
  )
}
