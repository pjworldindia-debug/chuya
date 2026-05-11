import { create } from 'zustand'
import type { AuthUser } from '@chuya/shared/types'

interface AuthState {
  user: AuthUser | null
  loading: boolean
  setUser: (user: AuthUser | null) => void
  setLoading: (loading: boolean) => void
  isAuthenticated: () => boolean
  isOwner: () => boolean
}

export const useAuthStore = create<AuthState>()((set, get) => ({
  user: null,
  loading: true,

  setUser: (user: AuthUser | null) => set({ user }),

  setLoading: (loading: boolean) => set({ loading }),

  isAuthenticated: () => get().user !== null,

  isOwner: () => get().user?.role === 'owner',
}))
