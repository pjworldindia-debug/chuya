import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface WishlistState {
  items: string[]
  toggleItem: (productId: string) => void
  hasItem: (productId: string) => boolean
  clearWishlist: () => void
}

export const useWishlistStore = create<WishlistState>()(
  persist(
    (set, get) => ({
      items: [],
      toggleItem: (productId) => {
        set((state) => {
          const exists = state.items.includes(productId)
          if (exists) {
            return { items: state.items.filter((id) => id !== productId) }
          }
          return { items: [...state.items, productId] }
        })
      },
      hasItem: (productId) => get().items.includes(productId),
      clearWishlist: () => set({ items: [] }),
    }),
    {
      name: 'chuya-wishlist',
    }
  )
)
