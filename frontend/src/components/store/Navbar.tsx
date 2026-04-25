'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ShoppingCart, Menu, X, MapPin, Tag, Smartphone, User, LogOut, Bell, Package } from 'lucide-react'
import { useCartStore } from '@/lib/cart'
import { useAuthStore } from '@/lib/auth'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'

interface Notification {
  id: string
  title: string
  body: string
  read: boolean
  created_at: string
}

export function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const notifRef = useRef<HTMLDivElement>(null)
  const pathname = usePathname()
  const { itemCount, openDrawer } = useCartStore()
  const { user, logout } = useAuthStore()

  useEffect(() => {
    if (!user) return
    api.get<{ count: number }>('/notifications/unread-count')
      .then(d => setUnreadCount(d.count))
      .catch(() => {})
    const iv = setInterval(() => {
      api.get<{ count: number }>('/notifications/unread-count')
        .then(d => setUnreadCount(d.count)).catch(() => {})
    }, 60000)
    return () => clearInterval(iv)
  }, [user])

  const openNotifications = async () => {
    if (notifOpen) { setNotifOpen(false); return }
    setNotifOpen(true)
    try {
      const data = await api.get<Notification[]>('/notifications?limit=8')
      setNotifications(data)
      setUnreadCount(0)
      await api.post('/notifications/read-all', {})
    } catch {}
  }

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 8)
    window.addEventListener('scroll', fn, { passive: true })
    return () => window.removeEventListener('scroll', fn)
  }, [])

  const links = [
    { href: '/products',  label: 'Products' },
    { href: '/stores',    label: 'Stores' },
  ]

  return (
    <header className="sticky top-0 z-50">
      {/* Utility bar */}
      <div className="bg-navy text-white">
        <div className="max-w-7xl mx-auto px-5 h-9 flex items-center">
          <p className="text-xs text-white/50 hidden sm:block">
            Nepal's Largest Supermarket — 28 Stores Nationwide
          </p>
          <div className="flex items-center gap-5 ml-auto">
            <Link href="/stores" className="flex items-center gap-1.5 text-xs text-white/60 hover:text-white transition-colors">
              <MapPin size={11} /> Find a Store
            </Link>
            <Link href="/products?featured=true" className="flex items-center gap-1.5 text-xs text-white/60 hover:text-white transition-colors">
              <Tag size={11} /> Deals
            </Link>
            <a href="#" className="flex items-center gap-1.5 text-xs text-white/60 hover:text-white transition-colors hidden sm:flex">
              <Smartphone size={11} /> Get the App
            </a>
          </div>
        </div>
      </div>

      {/* Main bar */}
      <div className={cn(
        'border-b border-black/[0.08] transition-all duration-300',
        scrolled ? 'bg-white/90 backdrop-blur-xl shadow-nav' : 'bg-white'
      )}>
        <div className="max-w-7xl mx-auto px-5 h-16 flex items-center gap-4">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 shrink-0 group" onClick={() => setMenuOpen(false)}>
            <div className="w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center bg-white">
              <Image src="/logo-icon.jpg" alt="BBSM" width={40} height={40} className="object-contain" />
            </div>
            <div className="leading-none hidden sm:block">
              <Image src="/logo.png" alt="Bhat-Bhateni Super Store" width={120} height={32} className="object-contain h-8 w-auto" />
            </div>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1 flex-1">
            {links.map(({ href, label }) => {
              const active = pathname.startsWith(href)
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    'relative px-4 py-2 text-sm font-semibold rounded-lg transition-colors nav-link-underline',
                    active ? 'text-primary bg-primary-light active' : 'text-navy hover:text-primary hover:bg-primary-light/50'
                  )}
                >
                  {label}
                </Link>
              )
            })}
          </nav>

          {/* Right actions */}
          <div className="flex items-center gap-2 ml-auto shrink-0">
            {/* Cart */}
            <button
              onClick={openDrawer}
              className="relative p-2.5 rounded-xl hover:bg-cream transition-colors"
              aria-label="Open cart"
            >
              <ShoppingCart size={20} className="text-navy" />
              {itemCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-primary text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                  {itemCount > 99 ? '99+' : itemCount}
                </span>
              )}
            </button>

            {/* Notification bell */}
            {user && (
              <div className="relative" ref={notifRef}>
                <button
                  onClick={openNotifications}
                  className="relative p-2.5 rounded-xl hover:bg-cream transition-colors"
                  aria-label="Notifications"
                >
                  <Bell size={20} className="text-navy" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>

                {notifOpen && (
                  <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-card-hover border border-gray-100 z-50 overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-100">
                      <p className="font-bold text-navy text-sm">Notifications</p>
                    </div>
                    {notifications.length === 0 ? (
                      <p className="text-center py-8 text-gray-400 text-sm">No notifications yet</p>
                    ) : (
                      <div className="max-h-80 overflow-y-auto">
                        {notifications.map((n) => (
                          <div key={n.id} className={`px-4 py-3 border-b border-gray-50 ${!n.read ? 'bg-primary-light/30' : ''}`}>
                            <p className="text-sm font-semibold text-navy">{n.title}</p>
                            <p className="text-xs text-gray-500 mt-0.5">{n.body}</p>
                            <p className="text-[10px] text-gray-300 mt-1">{new Date(n.created_at).toLocaleString()}</p>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="px-4 py-2 border-t border-gray-100">
                      <Link href="/account" onClick={() => setNotifOpen(false)} className="text-xs text-primary font-medium hover:underline">
                        View account
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Auth */}
            {user ? (
              <div className="hidden md:flex items-center gap-2">
                <Link href="/account/orders" className="flex items-center gap-2 px-3 py-2 text-sm font-semibold text-navy hover:text-primary rounded-xl hover:bg-cream transition-colors">
                  <Package size={15} />
                  My Orders
                </Link>
                <Link href="/account" className="flex items-center gap-2 px-3 py-2 text-sm font-semibold text-navy hover:text-primary rounded-xl hover:bg-cream transition-colors">
                  <User size={15} />
                  {user.full_name.split(' ')[0]}
                </Link>
                <button
                  onClick={() => logout()}
                  className="p-2.5 text-gray-400 hover:text-red hover:bg-red-light rounded-xl transition-colors"
                  aria-label="Log out"
                >
                  <LogOut size={16} />
                </button>
              </div>
            ) : (
              <div className="hidden md:flex items-center gap-2">
                <Link href="/login" className="px-4 py-2 text-sm font-semibold text-navy hover:text-primary transition-colors">
                  Sign in
                </Link>
                <Link href="/register" className="px-4 py-2 bg-primary text-white text-sm font-bold rounded-xl hover:bg-primary-dark hover:-translate-y-0.5 transition-all shadow-sm">
                  Register
                </Link>
              </div>
            )}

            {/* Mobile toggle */}
            <button
              className="md:hidden p-2 rounded-lg hover:bg-cream transition-colors"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="Toggle menu"
            >
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <div className={cn(
        'md:hidden overflow-hidden transition-all duration-300 bg-white border-b border-black/[0.08]',
        menuOpen ? 'max-h-80' : 'max-h-0'
      )}>
        <div className="px-5 py-3 flex flex-col gap-1">
          {links.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setMenuOpen(false)}
              className={cn(
                'px-4 py-3 rounded-xl text-sm font-semibold transition-colors',
                pathname.startsWith(href) ? 'text-primary bg-primary-light' : 'text-navy hover:bg-cream'
              )}
            >
              {label}
            </Link>
          ))}
          <div className="flex gap-2 mt-2">
            {user ? (
              <>
                <Link href="/account/orders" onClick={() => setMenuOpen(false)} className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border border-gray-200 text-navy text-sm font-semibold rounded-xl">
                  <Package size={15} /> My Orders
                </Link>
                <Link href="/account" onClick={() => setMenuOpen(false)} className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border border-gray-200 text-navy text-sm font-semibold rounded-xl">
                  <User size={15} /> Account
                </Link>
              </>
            ) : (
              <>
                <Link href="/login" onClick={() => setMenuOpen(false)} className="flex-1 text-center px-4 py-3 border border-gray-200 text-navy text-sm font-semibold rounded-xl">Sign in</Link>
                <Link href="/register" onClick={() => setMenuOpen(false)} className="flex-1 text-center px-4 py-3 bg-primary text-white text-sm font-bold rounded-xl">Register</Link>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
