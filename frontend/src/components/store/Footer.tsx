import Link from 'next/link'
import { MapPin, Phone, Mail } from 'lucide-react'

export function Footer() {
  return (
    <footer className="bg-navy text-white">
      <div className="max-w-7xl mx-auto px-5 py-14 grid grid-cols-1 md:grid-cols-4 gap-10">
        {/* Brand */}
        <div className="md:col-span-2">
          <p className="font-bold text-2xl text-white tracking-wide">BBSM</p>
          <p className="text-xs text-white/40 mt-0.5">Bhat-Bhateni Super Market</p>
          <p className="text-sm text-white/50 mt-4 leading-relaxed max-w-xs">
            Nepal's favourite supermarket since 1984. Quality products, great prices, 28 stores nationwide.
          </p>
          <div className="flex flex-col gap-2 mt-5">
            <a href="tel:+97714xxx" className="flex items-center gap-2 text-xs text-white/40 hover:text-white transition-colors">
              <Phone size={12} /> +977-1-4XXXXXX
            </a>
            <a href="mailto:info@bbsm.np" className="flex items-center gap-2 text-xs text-white/40 hover:text-white transition-colors">
              <Mail size={12} /> info@bbsm.np
            </a>
            <Link href="/stores" className="flex items-center gap-2 text-xs text-white/40 hover:text-white transition-colors">
              <MapPin size={12} /> Find a store near you
            </Link>
          </div>
        </div>

        {/* Shop */}
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-white/40 mb-4">Shop</p>
          <ul className="space-y-2.5">
            {[
              { href: '/products', label: 'All Products' },
              { href: '/products?featured=true', label: 'Featured' },
              { href: '/categories/groceries', label: 'Groceries' },
              { href: '/categories/fresh-produce', label: 'Fresh Produce' },
              { href: '/categories/dairy', label: 'Dairy' },
            ].map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="text-sm text-white/50 hover:text-white transition-colors">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Account */}
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-white/40 mb-4">Account</p>
          <ul className="space-y-2.5">
            {[
              { href: '/account', label: 'My Account' },
              { href: '/account', label: 'Orders' },
              { href: '/cart', label: 'Cart' },
              { href: '/login', label: 'Sign In' },
              { href: '/register', label: 'Register' },
            ].map((l) => (
              <li key={l.label}>
                <Link href={l.href} className="text-sm text-white/50 hover:text-white transition-colors">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-t border-white/[0.08]">
        <div className="max-w-7xl mx-auto px-5 h-12 flex items-center justify-between">
          <p className="text-xs text-white/30">© {new Date().getFullYear()} Bhat-Bhateni Super Market. All rights reserved.</p>
          <p className="text-xs text-white/20 hidden sm:block">Made in Nepal 🇳🇵</p>
        </div>
      </div>
    </footer>
  )
}
