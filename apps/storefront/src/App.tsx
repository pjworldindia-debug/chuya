import { Routes, Route } from 'react-router-dom'
import { useEffect, lazy, Suspense } from 'react'
import Layout from './components/Layout'
import ScrollToTop from './components/ScrollToTop'
import ErrorBoundary from './components/ErrorBoundary'

const HomePage = lazy(() => import('./pages/HomePage'))
const ShopPage = lazy(() => import('./pages/ShopPage'))
const ProductPage = lazy(() => import('./pages/ProductPage'))
const CartPage = lazy(() => import('./pages/CartPage'))
const AuthPage = lazy(() => import('./pages/AuthPage'))
const AccountPage = lazy(() => import('./pages/AccountPage'))
const OrderSuccessPage = lazy(() => import('./pages/OrderSuccessPage'))
const TermsPage = lazy(() => import('./pages/TermsPage'))
const PrivacyPage = lazy(() => import('./pages/PrivacyPage'))
const ReturnsPage = lazy(() => import('./pages/ReturnsPage'))
const AboutPage = lazy(() => import('./pages/AboutPage'))
import { useAuthStore } from './stores/authStore'
import { useCartStore } from './stores/cartStore'
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
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const cartStore = useCartStore.getState()
        if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
          if (cartStore.lastSyncedUserId !== session.user.id && cartStore.items.length > 0) {
            cartStore.syncAndMergeCart(session.user.id)
          } else {
            cartStore.fetchDbCart(session.user.id)
          }
        }
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
    <>
      <ScrollToTop />
      <ErrorBoundary>
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-pulse font-serif text-2xl tracking-[0.15em]">CHUYA</div></div>}>
          <Routes>
            <Route element={<Layout />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/shop" element={<ShopPage />} />
              <Route path="/product/:slug" element={<ProductPage />} />
              <Route path="/cart" element={<CartPage />} />
              <Route path="/auth" element={<AuthPage />} />
              <Route path="/account" element={<AccountPage />} />
              <Route path="/order-success/:orderId" element={<OrderSuccessPage />} />
              <Route path="/terms" element={<TermsPage />} />
              <Route path="/privacy" element={<PrivacyPage />} />
              <Route path="/returns" element={<ReturnsPage />} />
              <Route path="/about" element={<AboutPage />} />
            </Route>
          </Routes>
        </Suspense>
      </ErrorBoundary>
    </>
  )
}
