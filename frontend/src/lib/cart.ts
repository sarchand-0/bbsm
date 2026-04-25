import { create } from 'zustand'
import { api } from './api'
import type { CartOut } from '@/types'

interface CartState {
  items: CartOut['items']
  total: number
  itemCount: number
  loading: boolean
  drawerOpen: boolean

  openDrawer:  () => void
  closeDrawer: () => void
  fetchCart:   () => Promise<void>
  addItem:     (productId: string, quantity?: number) => Promise<void>
  updateItem:  (itemId: string, quantity: number) => Promise<void>
  removeItem:  (itemId: string) => Promise<void>
  clearCart:   () => Promise<void>
  reset:       () => void
}

const empty = { items: [], total: 0, itemCount: 0 }

export const useCartStore = create<CartState>()((set) => ({
  ...empty,
  loading: false,
  drawerOpen: false,

  openDrawer:  () => set({ drawerOpen: true }),
  closeDrawer: () => set({ drawerOpen: false }),
  reset: () => set(empty),

  async fetchCart() {
    set({ loading: true })
    try {
      const cart = await api.get<CartOut>('/cart')
      set({ items: cart.items, total: cart.total, itemCount: cart.item_count, loading: false })
    } catch {
      set({ loading: false })
    }
  },

  async addItem(productId, quantity = 1) {
    set({ loading: true })
    try {
      const cart = await api.post<CartOut>('/cart/items', { product_id: productId, quantity })
      set({ items: cart.items, total: cart.total, itemCount: cart.item_count, loading: false })
    } catch {
      set({ loading: false })
      throw new Error('Could not add item to cart')
    }
  },

  async updateItem(itemId, quantity) {
    set({ loading: true })
    try {
      const cart = await api.patch<CartOut>(`/cart/items/${itemId}`, { quantity })
      set({ items: cart.items, total: cart.total, itemCount: cart.item_count, loading: false })
    } catch {
      set({ loading: false })
    }
  },

  async removeItem(itemId) {
    set({ loading: true })
    try {
      const cart = await api.delete<CartOut>(`/cart/items/${itemId}`)
      set({ items: cart.items, total: cart.total, itemCount: cart.item_count, loading: false })
    } catch {
      set({ loading: false })
    }
  },

  async clearCart() {
    set({ loading: true })
    try {
      await api.delete('/cart')
      set({ ...empty, loading: false })
    } catch {
      set({ loading: false })
    }
  },
}))
