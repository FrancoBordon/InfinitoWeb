import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface CartItem {
  productId: string
  name: string
  price: number
  quantity: number
  talle?: string
  imageUrl?: string
  category?: string
}

interface CartStore {
  items: CartItem[]
  isOpen: boolean
  addItem: (item: CartItem) => void
  removeItem: (productId: string) => void
  updateQuantity: (productId: string, quantity: number) => void
  clearCart: () => void
  toggleCart: () => void
  setCartOpen: (open: boolean) => void
  getTotal: () => number
  getTotalItems: () => number
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,
      addItem: (item) => {
        const items = get().items
        const existing = items.find(i => i.productId === item.productId)
        if (existing) {
          set({
            items: items.map(i =>
              i.productId === item.productId
                ? { ...i, quantity: i.quantity + item.quantity }
                : i
            ),
          })
        } else {
          set({ items: [...items, item] })
        }
      },
      removeItem: (productId) => {
        set({ items: get().items.filter(i => i.productId !== productId) })
      },
      updateQuantity: (productId, quantity) => {
        if (quantity <= 0) {
          set({ items: get().items.filter(i => i.productId !== productId) })
        } else {
          set({
            items: get().items.map(i =>
              i.productId === productId ? { ...i, quantity } : i
            ),
          })
        }
      },
      clearCart: () => set({ items: [] }),
      toggleCart: () => set({ isOpen: !get().isOpen }),
      setCartOpen: (open) => set({ isOpen: open }),
      getTotal: () => get().items.reduce((sum, i) => sum + i.price * i.quantity, 0),
      getTotalItems: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
    }),
    {
      name: 'infinito-cart',
    }
  )
)

// Admin auth store
interface AdminStore {
  isAdmin: boolean
  adminEmail: string
  setAdmin: (email: string) => void
  logout: () => void
}

export const useAdminStore = create<AdminStore>()(
  persist(
    (set) => ({
      isAdmin: false,
      adminEmail: '',
      setAdmin: (email) => set({ isAdmin: true, adminEmail: email }),
      logout: () => set({ isAdmin: false, adminEmail: '' }),
    }),
    {
      name: 'infinito-admin',
    }
  )
)

// Active section store
interface SectionStore {
  section: string
  setSection: (section: string) => void
}

export const useSectionStore = create<SectionStore>()((set) => ({
  section: 'catalogo',
  setSection: (section) => set({ section }),
}))
