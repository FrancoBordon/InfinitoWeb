import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Product, CartItem } from '@/lib/types'
import { getEffectivePrice } from '@/lib/pricing'

interface CartStore {
  items: CartItem[]
  addItem: (product: Product) => void
  removeItem: (productId: string) => void
  updateQuantity: (productId: string, quantity: number) => void
  clearCart: () => void
  getTotal: () => number
  getItemCount: () => number
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (product: Product) => {
        const items = get().items
        const existing = items.find((i) => i.product.id === product.id)

        if (existing) {
          const newQuantity = Math.min(existing.quantity + 1, product.stock)
          set({
            items: items.map((i) =>
              i.product.id === product.id
                ? { ...i, quantity: newQuantity }
                : i
            ),
          })
        } else {
          set({
            items: [...items, { product, quantity: 1 }],
          })
        }
      },

      removeItem: (productId: string) => {
        set({ items: get().items.filter((i) => i.product.id !== productId) })
      },

      updateQuantity: (productId: string, quantity: number) => {
        if (quantity <= 0) {
          set({ items: get().items.filter((i) => i.product.id !== productId) })
        } else {
          set({
            items: get().items.map((i) => {
              if (i.product.id === productId) {
                const clampedQuantity = Math.min(quantity, i.product.stock)
                return { ...i, quantity: clampedQuantity }
              }
              return i
            }),
          })
        }
      },

      clearCart: () => set({ items: [] }),

      getTotal: () =>
        get().items.reduce((sum, item) => {
          const price = getEffectivePrice(item.product.price, item.product.promoPrice)
          return sum + price * item.quantity
        }, 0),

      getItemCount: () =>
        get().items.reduce((sum, item) => sum + item.quantity, 0),
    }),
    {
      name: 'infinito-cart',
    }
  )
)
