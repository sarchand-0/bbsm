import Image from 'next/image'
import Link from 'next/link'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen grid md:grid-cols-2">
      {/* Left — brand panel */}
      <div className="relative overflow-hidden flex flex-col justify-between p-10 hidden md:flex">
        {/* Building photo as background */}
        <Image
          src="/bbsm-building.jpeg"
          alt="Bhat-Bhateni Super Store"
          fill
          className="object-cover"
          priority
        />
        {/* Overlay */}
        <div className="absolute inset-0 bg-navy/70" />
        {/* Orbs */}
        <div className="orb w-80 h-80 opacity-10 -top-16 -left-16" />
        <div className="orb w-56 h-56 opacity-10 bottom-20 right-10" />

        <Link href="/" className="relative z-10 flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-white overflow-hidden flex items-center justify-center">
            <Image src="/logo-icon.jpg" alt="BBSM" width={48} height={48} className="object-contain" />
          </div>
          <div>
            <p className="text-white font-bold text-lg leading-none">BBSM</p>
            <p className="text-white/60 text-xs mt-0.5">Bhat-Bhateni Super Store</p>
          </div>
        </Link>

        <div className="relative z-10 text-white">
          <h2 className="text-4xl font-bold leading-tight mb-4">
            Nepal's largest<br />supermarket, online.
          </h2>
          <p className="text-white/70 text-lg max-w-sm">
            Shop 10,000+ products from the comfort of your home. Same-day delivery across Kathmandu Valley.
          </p>

          <div className="mt-10 grid grid-cols-2 gap-4">
            {[
              { value: '10K+', label: 'Products' },
              { value: '28',   label: 'Stores' },
              { value: '1984', label: 'Est. Year' },
              { value: '5M+',  label: 'Customers' },
            ].map((s) => (
              <div key={s.label} className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                <p className="font-bold text-2xl">{s.value}</p>
                <p className="text-white/60 text-xs mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="text-white/30 text-xs relative z-10">© {new Date().getFullYear()} Bhat-Bhateni Super Market</p>
      </div>

      {/* Right — form panel */}
      <div className="flex items-center justify-center p-6 bg-appbg">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <Link href="/" className="flex items-center gap-3 mb-8 md:hidden">
            <div className="w-9 h-9 rounded-xl overflow-hidden bg-white">
              <Image src="/logo-icon.jpg" alt="BBSM" width={36} height={36} className="object-contain" />
            </div>
            <span className="font-bold text-navy text-base">BBSM</span>
          </Link>
          {children}
        </div>
      </div>
    </div>
  )
}
