import { Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from '@chuya/shared/supabase'
import AdminLayout from './components/AdminLayout'
import DashboardPage from './pages/DashboardPage'
import ProductsPage from './pages/ProductsPage'
import CategoriesPage from './pages/CategoriesPage'
import BannersPage from './pages/BannersPage'
import OrdersPage from './pages/OrdersPage'
import LoginPage from './pages/LoginPage'

type AuthState = 'loading' | 'authorized' | 'unauthorized' | 'unauthenticated'

export default function App() {
  const [authState, setAuthState] = useState<AuthState>('loading')

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) { setAuthState('unauthenticated'); return }

        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single<{ role: string }>()

        if (profile?.role === 'owner') {
          setAuthState('authorized')
        } else {
          setAuthState('unauthorized')
        }
      } catch {
        setAuthState('unauthenticated')
      }
    }
    checkAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => { checkAuth() })
    return () => subscription.unsubscribe()
  }, [])

  if (authState === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-chuya border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-gray-500">Loading...</p>
        </div>
      </div>
    )
  }

  // Handle users who are not logged in at all
  if (authState === 'unauthenticated') {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    )
  }

  // Handle users who are logged in but don't have the owner role
  if (authState === 'unauthorized') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md">
          <h1 className="text-4xl font-bold text-red-500 mb-4">403</h1>
          <h2 className="text-xl font-medium mb-2">Access Denied</h2>
          <p className="text-gray-500 mb-6">
            You don't have permission to access the admin panel.
            Only accounts with the "owner" role can access this area.
          </p>
          <button
            onClick={() => supabase.auth.signOut().then(() => window.location.reload())}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-chuya hover:bg-chuya/90 transition-colors"
          >
            Sign Out & Try Again
          </button>
        </div>
      </div>
    )
  }

  // Authorized users
  return (
    <Routes>
      <Route element={<AdminLayout />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/products" element={<ProductsPage />} />
        <Route path="/categories" element={<CategoriesPage />} />
        <Route path="/banners" element={<BannersPage />} />
        <Route path="/orders" element={<OrdersPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
