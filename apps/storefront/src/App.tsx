import { Routes, Route } from 'react-router-dom'
import { useEffect } from 'react'
import Layout from './components/Layout'
import HomePage from './pages/HomePage'
import ShopPage from './pages/ShopPage'
import ProductPage from './pages/ProductPage'
import CartPage from './pages/CartPage'
import AuthPage from './pages/AuthPage'
import AccountPage from './pages/AccountPage'
import OrderSuccessPage from './pages/OrderSuccessPage'
import { useAuthStore } from './stores/authStore'
import { supabase } from '@chuya/shared/supabase'

export default function App() {
  const setUser = useAuthStore((s) => s.setUser)
  const setLoading = useAuthStore((s) => s.setLoading)

  useEffect(() => {
    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        // Fetch profile
        supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()
          .then(({ data: profile }) => {
            setUser({
              id: session.user.id,
              email: session.user.email || '',
              fullName: profile?.full_name || null,
              phone: profile?.phone || null,
              role: (profile?.role as 'customer' | 'owner') || 'customer',
            })
            setLoading(false)
          })
      } else {
        setUser(null)
        setLoading(false)
      }
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()
        setUser({
          id: session.user.id,
          email: session.user.email || '',
          fullName: profile?.full_name || null,
          phone: profile?.phone || null,
          role: (profile?.role as 'customer' | 'owner') || 'customer',
        })
      } else {
        setUser(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [setUser, setLoading])

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/shop" element={<ShopPage />} />
        <Route path="/product/:slug" element={<ProductPage />} />
        <Route path="/cart" element={<CartPage />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/account" element={<AccountPage />} />
        <Route path="/order-success/:orderId" element={<OrderSuccessPage />} />
      </Route>
    </Routes>
  )
}
