'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import {
  LayoutDashboard, Package, ShoppingBag, Users, BarChart3,
  Truck, Bike, LogOut, Percent, Megaphone, FolderOpen,
  ExternalLink, ChevronRight, ShieldCheck, Settings,
} from 'lucide-react'
import { useAuthStore } from '@/lib/auth'
import { cn } from '@/lib/utils'

// ── Navigation sections with role gating ────────────────────────────────────

interface NavItem {
  href: string
  label: string
  icon: React.ElementType
  exact?: boolean
}

interface NavSection {
  label: string
  adminOnly?: boolean
  items: NavItem[]
}

const NAV_SECTIONS: NavSection[] = [
  {
    label: 'Overview',
    items: [
      { href: '/crm', label: 'Dashboard', icon: LayoutDashboard, exact: true },
    ],
  },
  {
    label: 'Operations',
    items: [
      { href: '/crm/orders',     label: 'Orders',     icon: ShoppingBag },
      { href: '/crm/deliveries', label: 'Deliveries', icon: Truck },
      { href: '/crm/riders',     label: 'Riders',     icon: Bike },
    ],
  },
  {
    label: 'Catalog',
    items: [
      { href: '/crm/products',            label: 'Products',   icon: Package },
      { href: '/crm/products/categories', label: 'Categories', icon: FolderOpen },
      { href: '/crm/promotions',          label: 'Promotions', icon: Megaphone },
      { href: '/crm/discounts',           label: 'Discounts',  icon: Percent },
    ],
  },
  {
    label: 'CRM',
    items: [
      { href: '/crm/customers', label: 'Customers', icon: Users },
    ],
  },
  {
    label: 'Analytics',
    adminOnly: true,
    items: [
      { href: '/crm/reports', label: 'Reports', icon: BarChart3 },
    ],
  },
]

// ── Role styling ─────────────────────────────────────────────────────────────

const ROLE_BADGE: Record<string, string> = {
  admin: 'bg-violet-500/15 text-violet-300 border-violet-500/25',
  staff: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
}

const ROLE_DOT: Record<string, string> = {
  admin: 'bg-violet-400',
  staff: 'bg-amber-400',
}

// ── Layout ───────────────────────────────────────────────────────────────────

export default function CRMLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuthStore()
  const router   = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!user) { router.push('/login?from=/crm'); return }
    if (!['staff', 'admin'].includes(user.role)) router.push('/')
  }, [user])

  if (!user) return null

  const isAdmin = user.role === 'admin'

  // breadcrumb label from pathname
  const crumb = pathname === '/crm'
    ? 'Dashboard'
    : pathname.split('/').pop()?.replace(/-/g, ' ') ?? ''

  return (
    <div className="flex min-h-screen bg-[#0D0F18]">

      {/* ── Sidebar ──────────────────────────────────────────────────────── */}
      <aside className="w-[220px] shrink-0 bg-[#13151F] border-r border-white/[0.06] flex flex-col">

        {/* Logo */}
        <div className="px-4 h-14 flex items-center gap-3 border-b border-white/[0.06]">
          <div className="w-8 h-8 rounded-lg overflow-hidden bg-white/10 flex items-center justify-center shrink-0">
            <Image src="/logo-icon.jpg" alt="BBSM" width={32} height={32} className="object-contain" />
          </div>
          <div>
            <p className="font-bold text-[13px] text-white leading-none">BBSM</p>
            <p className="text-[10px] text-white/30 mt-0.5">Admin Console</p>
          </div>
        </div>

        {/* Nav sections */}
        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
          {NAV_SECTIONS
            .filter(s => !s.adminOnly || isAdmin)
            .map((section) => (
              <div key={section.label}>
                <p className="text-[10px] font-bold uppercase tracking-widest text-white/20 px-3 mb-2">
                  {section.label}
                </p>
                <nav className="space-y-0.5">
                  {section.items.map(({ href, label, icon: Icon, exact }) => {
                    const active = exact
                      ? pathname === href
                      : pathname === href || pathname.startsWith(href + '/')
                    return (
                      <Link
                        key={href}
                        href={href}
                        className={cn(
                          'group flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all',
                          active
                            ? 'bg-steel/[0.15] text-white'
                            : 'text-white/35 hover:text-white/80 hover:bg-white/[0.04]'
                        )}
                      >
                        <Icon
                          size={14}
                          className={active ? 'text-steel' : 'text-white/30 group-hover:text-white/60'}
                        />
                        {label}
                        {active && (
                          <div className="ml-auto w-1 h-1 rounded-full bg-steel" />
                        )}
                      </Link>
                    )
                  })}
                </nav>
              </div>
            ))}
        </div>

        {/* Footer */}
        <div className="px-3 pb-4 pt-3 border-t border-white/[0.06] space-y-2">
          <Link
            href="/products"
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-[12px] text-white/25 hover:text-white/60 hover:bg-white/[0.04] transition-colors"
          >
            <ExternalLink size={12} />
            View Storefront
          </Link>
          <div className="flex items-center gap-2.5 px-3 py-2">
            <div className="w-6 h-6 rounded-full bg-steel/20 border border-steel/30 flex items-center justify-center text-[11px] font-bold text-steel shrink-0">
              {user.full_name[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-semibold text-white/80 truncate leading-none">{user.full_name}</p>
              <p className="text-[10px] text-white/25 truncate mt-0.5">{user.email}</p>
            </div>
            <button
              onClick={() => logout().then(() => router.push('/login'))}
              className="text-white/20 hover:text-red/80 transition-colors p-1 shrink-0"
              title="Sign out"
            >
              <LogOut size={13} />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main area ────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Top bar */}
        <header className="h-14 bg-[#13151F] border-b border-white/[0.06] flex items-center px-6 gap-4 shrink-0">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-[12px] flex-1 min-w-0">
            <span className="text-white/30">Admin</span>
            <ChevronRight size={11} className="text-white/15 shrink-0" />
            <span className="text-white/70 capitalize font-medium truncate">{crumb}</span>
          </div>

          {/* Role badge */}
          <div className={cn(
            'text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border',
            ROLE_BADGE[user.role] ?? 'bg-white/10 text-white/50 border-white/10'
          )}>
            <span className={cn('inline-block w-1.5 h-1.5 rounded-full mr-1.5 align-middle', ROLE_DOT[user.role] ?? 'bg-white/40')} />
            {user.role}
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto bg-[#0D0F18]">
          {children}
        </main>
      </div>
    </div>
  )
}
