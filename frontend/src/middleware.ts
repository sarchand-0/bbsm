import { NextRequest, NextResponse } from 'next/server'

const ADMIN_ROLES  = new Set(['admin', 'staff'])
const RIDER_ROLES  = new Set(['rider', 'admin', 'staff'])
const ANY_USER     = new Set(['customer', 'rider', 'admin', 'staff'])

export function middleware(request: NextRequest) {
  const token    = request.cookies.get('bbsm_access')?.value
  const role     = request.cookies.get('bbsm_role')?.value ?? ''
  const { pathname } = request.nextUrl

  const unauth = (dest: string) => NextResponse.redirect(new URL(dest, request.url))
  const denied = () => {
    const url = new URL('/unauthorized', request.url)
    url.searchParams.set('from', pathname)
    return NextResponse.redirect(url)
  }

  // ── Not logged in ────────────────────────────────────────────────────────────
  if (!token) {
    if (
      pathname.startsWith('/crm')      ||
      pathname.startsWith('/rider')    ||
      pathname.startsWith('/account')  ||
      pathname.startsWith('/checkout') ||
      pathname === '/cart'
    ) {
      const url = new URL('/login', request.url)
      url.searchParams.set('from', pathname)
      return NextResponse.redirect(url)
    }
    return NextResponse.next()
  }

  // ── CRM: staff / admin only ──────────────────────────────────────────────────
  if (pathname.startsWith('/crm')) {
    if (!ADMIN_ROLES.has(role)) return denied()
    return NextResponse.next()
  }

  // ── Rider portal: rider / staff / admin ─────────────────────────────────────
  if (pathname.startsWith('/rider')) {
    if (!RIDER_ROLES.has(role)) return denied()
    return NextResponse.next()
  }

  // ── Account / checkout / cart: any logged-in user ───────────────────────────
  if (
    pathname.startsWith('/account')  ||
    pathname.startsWith('/checkout') ||
    pathname === '/cart'
  ) {
    if (!ANY_USER.has(role)) return unauth('/login')
    return NextResponse.next()
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/crm/:path*',
    '/rider/:path*',
    '/account/:path*',
    '/checkout/:path*',
    '/cart',
    '/unauthorized',
  ],
}
