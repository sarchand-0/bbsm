import type { Metadata } from 'next'
import './globals.css'
import { Providers } from '@/components/providers'

export const metadata: Metadata = {
  title: { default: 'BBSM', template: '%s | BBSM' },
  description: 'Bhat-Bhateni Super Market — Nepal\'s favourite supermarket, now online.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
