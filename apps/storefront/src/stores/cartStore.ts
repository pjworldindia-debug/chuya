import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CartItemLocal } from '@chuya/shared/types'
import { supabase } from '@chuya/shared/supabase'
import { useAuthStore } from './authStore'

const syncToDb = async (items: CartItemLocal[]) => {
  const user = useAuthStore.getState().user
  if (!user) return

  try {
    if (items.length > 0) {
      const payload = items.map(item => ({
        user_id: user.id,
        product_id: item.productId,
        quantity: item.quantity
      }))
      // Upsert the current items
      await supabase.from('cart_items').upsert(payload, { onConflict: 'user_id,product_id' })
      // Delete any items not in the current payload
      await supabase.from('cart_items')
        .delete()
        .eq('user_id', user.id)
        .not('product_id', 'in', `(${items.map(i => i.productId).join(',')})`)
    } else {
      // Cart is empty, delete all items for this user
      await supabase.from('cart_items').delete().eq('user_id', user.id)
    }
  } catch (err) {
    console.error('Failed to sync cart mutations to DB:', err)
  }
}

interface CartState {
  items: CartItemLocal[]
  addItem: (item: CartItemLocal) => void
  removeItem: (productId: string) => void
  updateQuantity: (productId: string, quantity: number) => void
  clearCart: () => void
  clearLocalCart: () => void
  getItemCount: () => number
  getSubtotal: () => number
  setItems: (items: CartItemLocal[]) => void
  syncAndMergeCart: (userId: string) => Promise<void>
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
        syncToDb(get().items)
      },

      removeItem: (productId: string) => {
        set((state) => ({
          items: state.items.filter((i) => i.productId !== productId),
        }))
        syncToDb(get().items)
      },

      updateQuantity: (productId: string, quantity: number) => {
        set((state) => ({
          items: state.items.map((i) =>
            i.productId === productId
              ? { ...i, quantity: Math.max(1, Math.min(quantity, i.stock)) }
              : i
          ),
        }))
        syncToDb(get().items)
      },

      clearCart: () => {
        set({ items: [] })
        syncToDb([])
      },

      clearLocalCart: () => set({ items: [] }),

      getItemCount: () => {
        return get().items.reduce((sum, item) => sum + item.quantity, 0)
      },

      getSubtotal: () => {
        return get().items.reduce((sum, item) => sum + item.price * item.quantity, 0)
      },

      setItems: (items: CartItemLocal[]) => {
        set({ items })
        syncToDb(items)
      },

      syncAndMergeCart: async (userId: string) => {
        try {
          const { data: dbItems } = await supabase
            .from('cart_items')
            .select('quantity, product_id, products(name, price, images, stock)')
            .eq('user_id', userId)

          const localItems = get().items
          const mergedMap = new Map<string, CartItemLocal>()

          if (dbItems) {
            dbItems.forEach((dbItem: any) => {
              if (dbItem.products) {
                mergedMap.set(dbItem.product_id, {
                  productId: dbItem.product_id,
                  name: dbItem.products.name,
                  price: dbItem.products.price,
                  image: dbItem.products.images?.[0] || '',
                  quantity: dbItem.quantity,
                  stock: dbItem.products.stock || 99
                })
              }
            })
          }

          localItems.forEach(localItem => {
            const existing = mergedMap.get(localItem.productId)
            if (existing) {
              mergedMap.set(localItem.productId, {
                ...existing,
                quantity: Math.min(existing.quantity + localItem.quantity, existing.stock)
              })
            } else {
              mergedMap.set(localItem.productId, localItem)
            }
          })

          const mergedItems = Array.from(mergedMap.values())
          set({ items: mergedItems })

          // Push merged back to DB
          if (mergedItems.length > 0) {
            const payload = mergedItems.map(item => ({
              user_id: userId,
              product_id: item.productId,
              quantity: item.quantity
            }))
            await supabase.from('cart_items').upsert(payload, { onConflict: 'user_id,product_id' })
          } else {
            await supabase.from('cart_items').delete().eq('user_id', userId)
          }
        } catch (error) {
          console.error('Failed to sync cart:', error)
        }
      },
    }),
    {
      name: 'chuya-cart',
    }
  )
)
