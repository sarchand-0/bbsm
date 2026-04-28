import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { UserOut, TokenOut } from '@/types'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost/api/v1'

function setCookie(name: string, value: string, maxAgeSeconds: number) {
  if (typeof document === 'undefined') return
  document.cookie = `${name}=${value}; path=/; max-age=${maxAgeSeconds}; SameSite=Lax`
}

function clearCookie(name: string) {
  if (typeof document === 'undefined') return
  document.cookie = `${name}=; path=/; max-age=0`
}

const ROLE_COOKIE_TTL = 7 * 24 * 60 * 60 // 7 days (matches refresh token)

interface AuthState {
  user: UserOut | null
  accessToken: string | null
  refreshToken: string | null

  login: (email: string, password: string) => Promise<void>
  register: (data: { email: string; password: string; full_name: string; phone?: string }) => Promise<void>
  logout: () => Promise<void>
  fetchMe: () => Promise<void>
  setTokens: (access: string, refresh: string, user?: UserOut) => void
  clearAuth: () => void
}

async function authPost<T>(path: string, body: unknown, token?: string): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`
  const res = await fetch(`${API}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data?.detail ?? 'Request failed')
  return data as T
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,

      setTokens(access, refresh, user) {
        set((s) => ({ accessToken: access, refreshToken: refresh, user: user ?? s.user }))
        setCookie('bbsm_access', access, 15 * 60)
        const role = user?.role ?? useAuthStore.getState().user?.role
        if (role) setCookie('bbsm_role', role, ROLE_COOKIE_TTL)
      },

      clearAuth() {
        set({ user: null, accessToken: null, refreshToken: null })
        clearCookie('bbsm_access')
        clearCookie('bbsm_role')
      },

      async login(email, password) {
        const data = await authPost<TokenOut>('/auth/login', { email, password })
        get().setTokens(data.access_token, data.refresh_token, data.user)
      },

      async register({ email, password, full_name, phone }) {
        const data = await authPost<TokenOut>('/auth/register', { email, password, full_name, phone })
        get().setTokens(data.access_token, data.refresh_token, data.user)
      },

      async logout() {
        const { refreshToken, clearAuth } = get()
        if (refreshToken) {
          await authPost('/auth/logout', { refresh_token: refreshToken }).catch(() => {})
        }
        clearAuth()
      },

      async fetchMe() {
        const { accessToken, refreshToken } = get()
        if (!accessToken) return

        let res = await fetch(`${API}/auth/me`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        })

        // On 401, try to refresh once before giving up
        if (res.status === 401 && refreshToken) {
          try {
            const rr = await fetch(`${API}/auth/refresh`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ refresh_token: refreshToken }),
            })
            if (rr.ok) {
              const data = await rr.json()
              get().setTokens(data.access_token, data.refresh_token)
              res = await fetch(`${API}/auth/me`, {
                headers: { Authorization: `Bearer ${data.access_token}` },
              })
            } else if (rr.status === 401 || rr.status === 403) {
              // Refresh token genuinely invalid
              get().clearAuth()
              return
            }
            // On 5xx from refresh — keep session, don't clear auth
          } catch {
            return // network error — keep session
          }
        }

        if (res.ok) {
          const user = await res.json()
          set({ user })
          setCookie('bbsm_role', user.role, ROLE_COOKIE_TTL)
        } else if (res.status === 401) {
          get().clearAuth()
        }
        // On 5xx — keep session, don't clear auth
      },
    }),
    {
      name: 'bbsm-auth',
      storage: createJSONStorage(() =>
        typeof window !== 'undefined'
          ? localStorage
          : { getItem: () => null, setItem: () => {}, removeItem: () => {} }
      ),
      partialize: (s) => ({ accessToken: s.accessToken, refreshToken: s.refreshToken, user: s.user }),
    }
  )
)

export const getAccessToken  = () => useAuthStore.getState().accessToken
export const getRefreshToken = () => useAuthStore.getState().refreshToken
