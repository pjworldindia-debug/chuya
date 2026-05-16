import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Search, User, ShoppingBag, Menu, X } from 'lucide-react'
import { useCartStore } from '../stores/cartStore'
import { useAuthStore } from '../stores/authStore'

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const location = useLocation()
  const itemCount = useCartStore((s) => s.getItemCount())
  const user = useAuthStore((s) => s.user)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 60)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    setMobileMenuOpen(false)
    setSearchOpen(false)
  }, [location.pathname])

  const navLinks = [
    { label: 'Shop', href: '/shop' },
    { label: 'Collections', href: '/shop?sort=newest' },
    { label: 'About', href: '/#brand-story' },
  ]

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-50 bg-cream/95 backdrop-blur-md border-b border-chuya/5 transition-all duration-300 ${
          scrolled ? 'py-3' : 'py-5'
        }`}
      >
        <div className="max-w-[1400px] mx-auto px-6 md:px-12 flex items-center justify-between">
          {/* Mobile menu toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-1"
            aria-label="Toggle menu"
            id="mobile-menu-toggle"
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>

          {/* Logo */}
          <Link
            to="/"
            className="flex items-center gap-2 font-serif text-2xl md:text-3xl tracking-[0.15em] font-medium"
            id="nav-logo"
          >
            <img src="/logo.png" alt="CHUYA Logo" className="h-8 md:h-10 w-auto" />
            CHUYA
          </Link>

          {/* Center nav links (desktop) */}
          <div className="hidden lg:flex items-center gap-10">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className="text-sm tracking-[0.08em] uppercase text-chuya/70 hover:text-chuya transition-colors duration-200"
                id={`nav-${link.label.toLowerCase()}`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-5">
            <button
              onClick={() => setSearchOpen(!searchOpen)}
              className="p-1 text-chuya/70 hover:text-chuya transition-colors"
              aria-label="Search"
              id="nav-search-toggle"
            >
              <Search size={20} />
            </button>

            <Link
              to={user ? '/account' : '/auth'}
              className="p-1 text-chuya/70 hover:text-chuya transition-colors"
              aria-label="Account"
              id="nav-account"
            >
              <User size={20} />
            </Link>

            <Link
              to="/cart"
              className="p-1 text-chuya/70 hover:text-chuya transition-colors relative"
              aria-label="Cart"
              id="nav-cart"
            >
              <ShoppingBag size={20} />
              {itemCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-chuya text-cream text-[10px] flex items-center justify-center font-medium">
                  {itemCount}
                </span>
              )}
            </Link>
          </div>
        </div>

        {/* Search bar */}
        {searchOpen && (
          <div className="border-t border-chuya/5 py-4 px-6 md:px-12 animate-fade-in">
            <div className="max-w-[600px] mx-auto">
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  if (searchQuery.trim()) {
                    window.location.href = `/shop?search=${encodeURIComponent(searchQuery.trim())}`
                  }
                }}
                className="flex items-center gap-3"
              >
                <Search size={18} className="text-muted" />
                <input
                  type="text"
                  placeholder="Search handbags..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 bg-transparent text-sm py-1 border-b border-chuya/20 focus:border-chuya/60 outline-none transition-colors"
                  autoFocus
                  id="search-input"
                />
              </form>
            </div>
          </div>
        )}
      </nav>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 bg-cream pt-20 px-6 lg:hidden animate-fade-in">
          <div className="flex flex-col gap-8 pt-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className="font-serif text-3xl tracking-wide"
                id={`mobile-nav-${link.label.toLowerCase()}`}
              >
                {link.label}
              </Link>
            ))}
            <div className="h-px bg-chuya/10 my-4" />
            <Link to={user ? '/account' : '/auth'} className="text-sm tracking-wider uppercase text-muted">
              {user ? 'My Account' : 'Sign In'}
            </Link>
          </div>
        </div>
      )}

      {/* Spacer for fixed nav */}
      <div className={scrolled ? 'h-[65px]' : 'h-[81px]'} />
    </>
  )
}
