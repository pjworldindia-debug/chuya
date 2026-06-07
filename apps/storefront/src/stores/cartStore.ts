import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CartItemLocal } from '@chuya/shared/types'
import { supabase } from '@chuya/shared/supabase'
import { useAuthStore } from './authStore'

interface CartState {
  items: CartItemLocal[]
  addItem: (item: CartItemLocal) => void
  removeItem: (productId: string) => void
  updateQuantity: (productId: string, quantity: number) => void
  clearCart: () => void
  getItemCount: () => number
  getSubtotal: () => number
  setItems: (items: CartItemLocal[]) => void
  syncWithBackend: () => Promise<void>
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (item: CartItemLocal) => {
        set((state) => {
          const existing = state.items.find((i) => i.productId === item.productId)
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.productId === item.productId
                  ? { ...i, quantity: Math.min(i.quantity + item.quantity, i.stock) }
                  : i
              ),
            }
          }
          return { items: [...state.items, item] }
        })

        const userId = useAuthStore.getState().user?.id
        if (userId) {
          const finalItem = get().items.find(i => i.productId === item.productId)
          if (finalItem) {
            supabase.from('cart_items').upsert({ user_id: userId, product_id: item.productId, quantity: finalItem.quantity }, { onConflict: 'user_id, product_id' }).then()
          }
        }
      },

      removeItem: (productId: string) => {
        set((state) => ({
          items: state.items.filter((i) => i.productId !== productId),
        }))

        const userId = useAuthStore.getState().user?.id
        if (userId) {
          supabase.from('cart_items').delete().match({ user_id: userId, product_id: productId }).then()
        }
      },

      updateQuantity: (productId: string, quantity: number) => {
        set((state) => ({
          items: state.items.map((i) =>
            i.productId === productId
              ? { ...i, quantity: Math.max(1, Math.min(quantity, i.stock)) }
              : i
          ),
        }))

        const userId = useAuthStore.getState().user?.id
        if (userId) {
          const finalItem = get().items.find(i => i.productId === productId)
          if (finalItem) {
            supabase.from('cart_items').update({ quantity: finalItem.quantity }).match({ user_id: userId, product_id: productId }).then()
          }
        }
      },

      clearCart: () => {
        set({ items: [] })
        const userId = useAuthStore.getState().user?.id
        if (userId) {
          supabase.from('cart_items').delete().eq('user_id', userId).then()
        }
      },

      getItemCount: () => {
        return get().items.reduce((sum, item) => sum + item.quantity, 0)
      },

      getSubtotal: () => {
        return get().items.reduce((sum, item) => sum + item.price * item.quantity, 0)
      },

      setItems: (items: CartItemLocal[]) => set({ items }),

      syncWithBackend: async () => {
        const userId = useAuthStore.getState().user?.id
        if (!userId) return

        const { data: dbItems } = await supabase
          .from('cart_items')
          .select('product_id, quantity, products(name, slug, price, compare_at_price, images, stock)')
          .eq('user_id', userId)

        const localItems = get().items
        const mergedItemsMap = new Map<string, CartItemLocal>()

        if (dbItems) {
          dbItems.forEach((dbItem: any) => {
            const product = dbItem.products
            if (product) {
              mergedItemsMap.set(dbItem.product_id, {
                productId: dbItem.product_id,
                name: product.name,
                slug: product.slug,
                price: product.price,
                compareAtPrice: product.compare_at_price,
                image: product.images?.[0] || '',
                quantity: Math.min(dbItem.quantity, product.stock),
                stock: product.stock
              })
            }
          })
        }

        localItems.forEach(localItem => {
          const existing = mergedItemsMap.get(localItem.productId)
          if (existing) {
            existing.quantity = Math.min(existing.quantity + localItem.quantity, existing.stock)
          } else {
            mergedItemsMap.set(localItem.productId, localItem)
          }
        })

        const finalItems = Array.from(mergedItemsMap.values())
        set({ items: finalItems })

        const payload = finalItems.map(item => ({
          user_id: userId,
          product_id: item.productId,
          quantity: item.quantity
        }))

        await supabase.from('cart_items').delete().eq('user_id', userId)
        if (payload.length > 0) {
          await supabase.from('cart_items').insert(payload)
        }
      }
    }),
    {
      name: 'chuya-cart',
    }
  )
)
