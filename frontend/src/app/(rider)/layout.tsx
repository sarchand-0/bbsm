'use client'

import { useEffect } from 'react'
import Image from 'next/image'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { LayoutDashboard, Package, MapPin, LogOut, Bike, History, Settings } from 'lucide-react'
import { useAuthStore } from '@/lib/auth'
import { cn } from '@/lib/utils'

const NAV = [
  { href: '/rider',         label: 'Dashboard', icon: LayoutDashboard },
  { href: '/rider/orders',  label: 'My Orders',  icon: Package },
  { href: '/rider/history',  label: 'History',    icon: History },
  { href: '/rider/settings', label: 'Settings',   icon: Settings },
]

export default function RiderLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuthStore()
  const router   = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!user) { router.push('/login?from=/rider'); return }
    if (!['rider', 'staff', 'admin'].includes(user.role)) {
      router.push('/')
    }
  }, [user])

  if (!user) return null

  return (
    <div className="flex min-h-screen bg-appbg">
      {/* Sidebar */}
      <aside className="w-60 bg-navy text-white flex flex-col shrink-0">
        <div className="px-5 py-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white overflow-hidden flex items-center justify-center">
              <Image src="/logo-icon.jpg" alt="BBSM" width={36} height={36} className="object-contain" />
            </div>
            <div>
              <p className="font-bold text-sm">Rider Portal</p>
              <p className="text-xs text-white/50">BBSM Delivery</p>
            </div>
          </div>
        </div>

        <div className="px-3 py-4 flex-1">
          <p className="text-xs font-bold uppercase tracking-widest text-white/30 px-3 mb-3">Menu</p>
          <nav className="space-y-1">
            {NAV.map(({ href, label, icon: Icon }) => {
              const active = pathname === href || (href !== '/rider' && pathname.startsWith(href))
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
                    active
                      ? 'bg-primary text-white'
                      : 'text-white/60 hover:text-white hover:bg-white/10'
                  )}
                >
                  <Icon size={16} />
                  {label}
                </Link>
              )
            })}
          </nav>
        </div>

        {/* User card */}
        <div className="px-4 py-4 border-t border-white/10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold text-white">
              {user.full_name[0]}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-white truncate">{user.full_name}</p>
              <p className="text-[10px] text-white/40 capitalize">{user.role}</p>
            </div>
          </div>
          <button
            onClick={() => logout().then(() => router.push('/login'))}
            className="w-full flex items-center gap-2 text-xs text-white/40 hover:text-white transition-colors px-2 py-1.5 rounded-lg hover:bg-white/10"
          >
            <LogOut size={12} /> Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  )
}
