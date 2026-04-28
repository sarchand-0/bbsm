/**
 * Typed fetch wrapper.
 * - Attaches Bearer token from auth store automatically.
 * - On 401: attempts refresh once, then clears auth and redirects to /login.
 */

import { getAccessToken, getRefreshToken, useAuthStore } from './auth'

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost/api/v1'

// Returns new access token, null if refresh token is invalid (log out), or 'server-error' if backend is down (keep session)
async function attemptRefresh(): Promise<string | null | 'server-error'> {
  const refresh = getRefreshToken()
  if (!refresh) return null
  try {
    const res = await fetch(`${BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refresh }),
    })
    if (res.status === 401 || res.status === 403) return null  // genuinely invalid/expired
    if (!res.ok) return 'server-error'                          // Redis down, etc. — keep session
    const data = await res.json()
    useAuthStore.getState().setTokens(data.access_token, data.refresh_token)
    return data.access_token
  } catch {
    return 'server-error'  // network error — keep session
  }
}

type Opts = RequestInit & { skipAuth?: boolean }

export async function apiFetch<T = unknown>(path: string, opts: Opts = {}): Promise<T> {
  const { skipAuth = false, ...init } = opts

  const headers: Record<string, string> = {
    ...(init.body && !(init.body instanceof FormData)
      ? { 'Content-Type': 'application/json' }
      : {}),
    ...(init.headers as Record<string, string>),
  }

  if (!skipAuth) {
    const token = getAccessToken()
    if (token) headers.Authorization = `Bearer ${token}`
  }

  let res = await fetch(`${BASE}${path}`, { ...init, headers })

  if (res.status === 401 && !skipAuth) {
    const refreshResult = await attemptRefresh()
    if (typeof refreshResult === 'string' && refreshResult !== 'server-error') {
      headers.Authorization = `Bearer ${refreshResult}`
      res = await fetch(`${BASE}${path}`, { ...init, headers })
    } else if (refreshResult === null) {
      // Refresh token is genuinely expired — log out
      useAuthStore.getState().clearAuth()
      if (typeof window !== 'undefined') window.location.href = '/login'
      throw new Error('Unauthorized')
    }
    // refreshResult === 'server-error': backend temporarily down — keep session, let request fail naturally
  }

  if (res.status === 204) return undefined as T

  const data = await res.json()
  if (!res.ok) throw new Error(data?.detail ?? `HTTP ${res.status}`)
  return data as T
}

export const api = {
  get:    <T>(path: string, opts?: Opts) => apiFetch<T>(path, { method: 'GET', ...opts }),
  post:   <T>(path: string, body: unknown, opts?: Opts) =>
    apiFetch<T>(path, { method: 'POST', body: JSON.stringify(body), ...opts }),
  patch:  <T>(path: string, body: unknown, opts?: Opts) =>
    apiFetch<T>(path, { method: 'PATCH', body: JSON.stringify(body), ...opts }),
  delete: <T>(path: string, opts?: Opts) => apiFetch<T>(path, { method: 'DELETE', ...opts }),
  upload: <T>(path: string, formData: FormData, opts?: Opts) =>
    apiFetch<T>(path, { method: 'POST', body: formData, ...opts }),
}
