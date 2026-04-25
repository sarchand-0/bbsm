'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { ArrowRight, ShoppingCart, Store, Star, Truck, Shield, Clock, Smartphone, Package } from 'lucide-react'
import { Navbar } from '@/components/store/Navbar'
import { Footer } from '@/components/store/Footer'
import { CartDrawer } from '@/components/store/CartDrawer'
import { SectionHead } from '@/components/store/SectionHead'
import { ProductCard } from '@/components/store/ProductCard'
import { PromotionTile } from '@/components/store/PromotionTile'
import { ProductCardSkeleton } from '@/components/ui/Skeleton'
import { api } from '@/lib/api'
import type { ProductOut, PromotionOut, CategoryOut } from '@/types'

const DEPARTMENTS = [
  { slug: 'groceries',     label: 'Groceries',     icon: '🛒', color: '#FFF2EA' },
  { slug: 'fresh-produce', label: 'Fresh Produce',  icon: '🥦', color: '#E8F5E9' },
  { slug: 'dairy',         label: 'Dairy',          icon: '🧈', color: '#FFF8E1' },
  { slug: 'beverages',     label: 'Beverages',      icon: '🧃', color: '#E3F2FD' },
  { slug: 'snacks',        label: 'Snacks',         icon: '🍿', color: '#FCE4EC' },
  { slug: 'household',     label: 'Household',      icon: '🏠', color: '#F3E5F5' },
  { slug: 'personal-care', label: 'Personal Care',  icon: '🧴', color: '#E0F7FA' },
  { slug: 'baby',          label: 'Baby',           icon: '👶', color: '#FFF9C4' },
]

const WHY_ITEMS = [
  { icon: <Truck size={24} />, title: 'Fast Delivery', desc: 'Same-day delivery to Kathmandu Valley' },
  { icon: <Shield size={24} />, title: 'Quality Assured', desc: 'Every product meets our strict quality standards' },
  { icon: <Star size={24} />, title: 'Best Prices', desc: 'Price-matched across all 28 stores nationwide' },
  { icon: <Clock size={24} />, title: 'Open 7 Days', desc: 'Stores open 7am–9pm, online orders 24/7' },
]

export default function HomePage() {
  const [featured, setFeatured] = useState<ProductOut[]>([])
  const [deals, setDeals] = useState<ProductOut[]>([])
  const [promos, setPromos] = useState<PromotionOut[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.get<{ items: ProductOut[] }>('/products?is_featured=true&per_page=8'),
      api.get<{ items: ProductOut[] }>('/products?per_page=6&sort=newest'),
      api.get<PromotionOut[]>('/promotions'),
    ]).then(([f, d, p]) => {
      setFeatured(f.items)
      setDeals(d.items)
      setPromos(p)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  return (
    <>
      <Navbar />
      <CartDrawer />

      {/* Hero */}
      <section className="hero-gradient relative overflow-hidden min-h-[560px] flex items-center">
        {/* Orbs */}
        <div className="orb w-96 h-96 opacity-20 -top-20 -left-20" />
        <div className="orb w-72 h-72 opacity-15 bottom-10 right-20 animation-delay-300" />
        <div className="orb w-48 h-48 opacity-10 top-20 right-1/3" />

        <div className="max-w-7xl mx-auto px-5 py-20 relative z-10 grid md:grid-cols-2 gap-12 items-center">
          <div className="text-white">
            <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm px-4 py-2 rounded-full mb-6">
              <Store size={14} className="text-white/80" />
              <span className="text-sm font-semibold text-white/90">Nepal's #1 Supermarket</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold leading-tight mb-4 tracking-tight">
              Everything you need,<br />
              <span className="text-white/80">delivered to your door.</span>
            </h1>
            <p className="text-white/70 text-lg mb-8 leading-relaxed max-w-md">
              Shop from 10,000+ products across groceries, fresh produce, dairy, household essentials and more.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/products"
                className="inline-flex items-center gap-2 px-6 py-3.5 bg-white text-primary font-bold rounded-xl hover:bg-cream transition-all hover:-translate-y-0.5 shadow-glow"
              >
                <ShoppingCart size={18} />
                Shop Now
              </Link>
              <Link
                href="/stores"
                className="inline-flex items-center gap-2 px-6 py-3.5 bg-white/15 backdrop-blur-sm text-white font-semibold rounded-xl hover:bg-white/20 transition-all border border-white/20"
              >
                Find a Store <ArrowRight size={16} />
              </Link>
            </div>
          </div>

          {/* Building photo */}
          <div className="hidden md:flex items-center justify-center">
            <div className="relative w-full max-w-md aspect-[4/3] rounded-3xl overflow-hidden shadow-2xl border-4 border-white/20">
              <Image
                src="/bbsm-building.jpeg"
                alt="Bhat-Bhateni Super Store"
                fill
                className="object-cover"
                priority
              />
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white overflow-hidden">
                    <Image src="/logo-icon.jpg" alt="BBSM" width={40} height={40} className="object-contain" />
                  </div>
                  <div>
                    <p className="text-white font-bold text-sm">Bhat-Bhateni Super Store</p>
                    <p className="text-white/70 text-xs">Est. 1984 · 28 stores</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <div className="bg-navy text-white">
        <div className="max-w-7xl mx-auto px-5 py-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          {[
            { value: '10,000+', label: 'Products' },
            { value: '28',      label: 'Stores Nationwide' },
            { value: 'Same-day', label: 'Delivery in KTM' },
            { value: 'Since 1984', label: 'Serving Nepal' },
          ].map((s) => (
            <div key={s.label}>
              <p className="font-bold text-primary text-lg">{s.value}</p>
              <p className="text-xs text-white/50 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Departments */}
      <section className="max-w-7xl mx-auto px-5 py-14">
        <SectionHead label="Shop by Department" title="Browse Categories" href="/products" />
        <div className="grid grid-cols-4 md:grid-cols-8 gap-3 mt-6">
          {DEPARTMENTS.map((d) => (
            <Link
              key={d.slug}
              href={`/categories/${d.slug}`}
              className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-white shadow-card hover:shadow-card-hover hover:-translate-y-1 transition-all group"
              style={{ backgroundColor: d.color }}
            >
              <span className="text-3xl">{d.icon}</span>
              <span className="text-xs font-semibold text-navy text-center leading-tight group-hover:text-primary transition-colors">
                {d.label}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Weekly deals / Promotions */}
      {(loading || promos.length > 0) && (
        <section className="bg-cream py-14">
          <div className="max-w-7xl mx-auto px-5">
            <SectionHead label="Limited Time" title="Weekly Deals" href="/products?featured=true" />
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 mt-6">
              {loading
                ? Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="skeleton h-56 rounded-2xl" />
                  ))
                : promos.slice(0, 3).map((promo, i) => (
                    <PromotionTile key={promo.id} promo={promo} index={i} />
                  ))}
            </div>
          </div>
        </section>
      )}

      {/* Featured products */}
      <section className="max-w-7xl mx-auto px-5 py-14">
        <SectionHead label="Staff Picks" title="Featured Products" href="/products?is_featured=true" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mt-6">
          {loading
            ? Array.from({ length: 8 }).map((_, i) => <ProductCardSkeleton key={i} />)
            : featured.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      </section>

      {/* New arrivals */}
      <section className="bg-cream py-14">
        <div className="max-w-7xl mx-auto px-5">
          <SectionHead label="Just In" title="New Arrivals" href="/products?sort=newest" />
          <div className="grid grid-cols-2 md:grid-cols-3 gap-5 mt-6">
            {loading
              ? Array.from({ length: 6 }).map((_, i) => <ProductCardSkeleton key={i} />)
              : deals.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </div>
      </section>

      {/* Why BBSM */}
      <section className="max-w-7xl mx-auto px-5 py-14">
        <SectionHead label="Our Promise" title="Why Shop with BBSM?" />
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 mt-8">
          {WHY_ITEMS.map((item) => (
            <div key={item.title} className="flex flex-col items-center text-center gap-3 p-6 rounded-2xl bg-white shadow-card hover:shadow-card-hover transition-all">
              <div className="w-12 h-12 rounded-xl bg-primary-light flex items-center justify-center text-primary">
                {item.icon}
              </div>
              <p className="font-bold text-navy">{item.title}</p>
              <p className="text-sm text-gray-400 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* App banner */}
      <section className="hero-gradient py-16 relative overflow-hidden">
        <div className="orb w-64 h-64 opacity-20 -bottom-10 right-10" />
        <div className="max-w-7xl mx-auto px-5 relative z-10 flex flex-col md:flex-row items-center gap-8 justify-between">
          <div className="text-white">
            <p className="text-xs font-bold uppercase tracking-widest text-white/60 mb-2">Download the App</p>
            <h2 className="text-3xl font-bold mb-3">Shop on the go</h2>
            <p className="text-white/70 max-w-md">
              Get exclusive app-only deals, track orders in real-time, and manage your loyalty points.
            </p>
          </div>
          <div className="flex gap-3 shrink-0">
            <div className="flex items-center gap-3 bg-white/15 backdrop-blur-sm border border-white/20 px-5 py-3 rounded-xl text-white hover:bg-white/20 transition-colors cursor-pointer">
              <Smartphone size={20} />
              <div>
                <p className="text-[10px] text-white/60">Download on the</p>
                <p className="text-sm font-bold">App Store</p>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-white/15 backdrop-blur-sm border border-white/20 px-5 py-3 rounded-xl text-white hover:bg-white/20 transition-colors cursor-pointer">
              <Package size={20} />
              <div>
                <p className="text-[10px] text-white/60">Get it on</p>
                <p className="text-sm font-bold">Google Play</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </>
  )
}
