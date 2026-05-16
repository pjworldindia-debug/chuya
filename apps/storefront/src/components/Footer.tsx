import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Instagram, Mail, MapPin, ArrowRight } from 'lucide-react'
import { supabase } from '@chuya/shared/supabase'
import { BRAND } from '@chuya/shared/constants'

export default function Footer() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return

    setStatus('loading')
    setErrorMsg('')

    try {
      const { error } = await supabase
        .from('subscribers')
        .insert([{ email: email.trim().toLowerCase() }] as { email: string }[])

      if (error) {
        if (error.code === '23505') {
          setStatus('success') // Already subscribed, still show success
        } else {
          throw error
        }
      } else {
        setStatus('success')
      }
      setEmail('')
    } catch (err) {
      setStatus('error')
      setErrorMsg(err instanceof Error ? err.message : 'Something went wrong')
    }
  }

  return (
    <footer className="bg-chuya text-cream">
      {/* Newsletter */}
      <div className="border-b border-cream/10 py-16 px-6 md:px-12">
        <div className="max-w-[1400px] mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
          <div>
            <h3 className="font-serif text-2xl md:text-3xl mb-2">Stay in the Loop</h3>
            <p className="text-cream/50 text-sm">
              Be the first to know about new collections, exclusive offers, and more.
            </p>
          </div>
          <form onSubmit={handleSubscribe} className="flex w-full md:w-auto">
            <input
              type="email"
              placeholder="Your email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1 md:w-[300px] px-5 py-3.5 bg-cream/5 border border-cream/20 text-cream text-sm placeholder:text-cream/30 focus:border-cream/40 outline-none transition-colors"
              required
              id="newsletter-email"
              style={{ borderRadius: 0 }}
            />
            <button
              type="submit"
              disabled={status === 'loading'}
              className="px-6 py-3.5 bg-taupe text-chuya text-sm font-medium tracking-wider uppercase hover:bg-taupe/80 transition-colors disabled:opacity-50"
              style={{ borderRadius: 0 }}
              id="newsletter-submit"
            >
              {status === 'loading' ? (
                <span className="animate-pulse">...</span>
              ) : (
                <ArrowRight size={18} />
              )}
            </button>
          </form>
        </div>
        {status === 'success' && (
          <p className="text-center text-taupe text-sm mt-4 animate-fade-in">
            Thank you for subscribing! ✨
          </p>
        )}
        {status === 'error' && (
          <p className="text-center text-red-400 text-sm mt-4 animate-fade-in">
            {errorMsg}
          </p>
        )}
      </div>

      {/* Links */}
      <div className="max-w-[1400px] mx-auto px-6 md:px-12 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          {/* Brand */}
          <div className="md:col-span-1">
            <Link to="/" className="font-serif text-2xl tracking-[0.15em] mb-4 block">
              CHUYA
            </Link>
            <p className="text-cream/50 text-sm leading-relaxed">
              {BRAND.description}
            </p>
          </div>

          {/* Shop */}
          <div>
            <h4 className="text-xs tracking-[0.2em] uppercase text-cream/40 mb-6">Shop</h4>
            <div className="flex flex-col gap-3">
              <Link to="/shop" className="text-sm text-cream/70 hover:text-cream transition-colors">
                All Products
              </Link>
              <Link to="/shop?sort=newest" className="text-sm text-cream/70 hover:text-cream transition-colors">
                New Arrivals
              </Link>
              <Link to="/shop?featured=true" className="text-sm text-cream/70 hover:text-cream transition-colors">
                Featured
              </Link>
            </div>
          </div>

          {/* Support */}
          <div>
            <h4 className="text-xs tracking-[0.2em] uppercase text-cream/40 mb-6">Support</h4>
            <div className="flex flex-col gap-3">
              <Link to="/auth" className="text-sm text-cream/70 hover:text-cream transition-colors">
                My Account
              </Link>
              <a href={`mailto:${BRAND.email}`} className="text-sm text-cream/70 hover:text-cream transition-colors">
                Contact Us
              </a>
              <a
                href="https://drive.google.com/file/d/1HjbFlz7eDmhyvSC4l3AW1jFIjbiNieny/view?usp=sharing"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-cream/70 hover:text-cream transition-colors"
              >
                Terms &amp; Conditions
              </a>
            </div>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-xs tracking-[0.2em] uppercase text-cream/40 mb-6">Connect</h4>
            <div className="flex flex-col gap-3">
              <a
                href={BRAND.instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-cream/70 hover:text-cream transition-colors"
              >
                <Instagram size={16} /> Instagram
              </a>
              <a
                href={`mailto:${BRAND.email}`}
                className="flex items-center gap-2 text-sm text-cream/70 hover:text-cream transition-colors"
              >
                <Mail size={16} /> {BRAND.email}
              </a>
              <div className="flex items-start gap-2 text-sm text-cream/70 mt-2">
                <MapPin size={16} className="flex-shrink-0 mt-0.5" />
                <span>{BRAND.address}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-cream/10 py-6 px-6 md:px-12">
        <div className="max-w-[1400px] mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-cream/30 text-xs">
            © {new Date().getFullYear()} CHUYA. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <span className="text-cream/30 text-xs">Privacy Policy</span>
            <a
              href="https://drive.google.com/file/d/1HjbFlz7eDmhyvSC4l3AW1jFIjbiNieny/view?usp=sharing"
              target="_blank"
              rel="noopener noreferrer"
              className="text-cream/30 text-xs hover:text-cream/60 transition-colors"
            >
              Terms &amp; Conditions
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
