import { Navbar } from '@/components/store/Navbar'
import { Footer } from '@/components/store/Footer'
import { CartDrawer } from '@/components/store/CartDrawer'

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      <CartDrawer />
      <main className="min-h-screen bg-appbg">{children}</main>
      <Footer />
    </>
  )
}
