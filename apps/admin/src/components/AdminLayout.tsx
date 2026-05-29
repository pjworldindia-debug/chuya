import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Package, Grid3X3, Image, ShoppingCart, Ticket, LogOut, Mail } from 'lucide-react'
import { supabase } from '@chuya/shared/supabase'

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
  { icon: Package, label: 'Products', path: '/products' },
  { icon: Grid3X3, label: 'Categories', path: '/categories' },
  { icon: Image, label: 'Banners', path: '/banners' },
  { icon: ShoppingCart, label: 'Orders', path: '/orders' },
  { icon: Ticket, label: 'Coupons', path: '/coupons' },
  { icon: Mail, label: 'Subscribers', path: '/subscribers' },
]

export default function AdminLayout() {
  const navigate = useNavigate()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate(0) // Reload to trigger auth check
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="admin-sidebar">
        <div className="h-14 flex items-center px-6 border-b border-gray-100">
          <span className="text-lg font-bold tracking-wider">CHUYA</span>
          <span className="ml-2 text-[10px] bg-chuya text-white px-1.5 py-0.5 rounded">Admin</span>
        </div>

        <nav className="p-3 space-y-0.5">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  isActive ? 'bg-chuya text-white' : 'text-gray-600 hover:bg-gray-50'
                }`
              }
              id={`nav-${item.label.toLowerCase()}`}
            >
              <item.icon size={18} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-gray-100">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-500 hover:text-red-600 hover:bg-red-50 w-full transition-colors"
            id="admin-logout"
          >
            <LogOut size={18} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Top Bar */}
      <header className="admin-topbar">
        <h1 className="text-sm font-medium tracking-wider">CHUYA CMS</h1>
      </header>

      {/* Content */}
      <main className="admin-content">
        <Outlet />
      </main>
    </div>
  )
}
