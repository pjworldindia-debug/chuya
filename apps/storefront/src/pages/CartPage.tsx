import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Trash2, Minus, Plus, Tag, Lock, CreditCard } from 'lucide-react'
import { useCartStore } from '../stores/cartStore'
import { useAuthStore } from '../stores/authStore'
import { formatCurrency, GST_RATE } from '@chuya/shared/constants'
import { INDIAN_STATES } from '@chuya/shared/types'
import { addressSchema, type AddressFormData } from '@chuya/shared/schemas'
import Button from '../components/Button'

export default function CartPage() {
  const navigate = useNavigate()
  const { items, removeItem, updateQuantity, clearCart, getSubtotal } = useCartStore()
  const user = useAuthStore((s) => s.user)
  const [couponCode, setCouponCode] = useState('')
  const [discount, setDiscount] = useState(0)
  const [couponError, setCouponError] = useState('')
  const [couponLoading, setCouponLoading] = useState(false)
  const [orderLoading, setOrderLoading] = useState(false)

  const subtotal = getSubtotal()
  const gst = Math.round(subtotal * GST_RATE)
  const total = subtotal + gst - discount

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<AddressFormData>({
    resolver: zodResolver(addressSchema),
  })

  const handlePincodeBlur = async (e: React.FocusEvent<HTMLInputElement>) => {
    const pin = e.target.value
    if (pin.length !== 6) return
    try {
      const res = await fetch(`https://api.postalpincode.in/pincode/${pin}`)
      const data = await res.json()
      if (data?.[0]?.Status === 'Success' && data[0].PostOffice?.length > 0) {
        const po = data[0].PostOffice[0]
        setValue('city', po.District || '')
        setValue('state', po.State || '')
      }
    } catch {
      // Silently fail - user can fill manually
    }
  }

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return
    setCouponLoading(true)
    setCouponError('')
    try {
      const apiUrl = import.meta.env.VITE_API_URL || ''
      const res = await fetch(`${apiUrl}/api/coupons/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: couponCode.trim().toUpperCase(), subtotal }),
      })
      const data = await res.json()
      if (data.valid) {
        setDiscount(data.discount)
      } else {
        setCouponError(data.error || 'Invalid coupon')
        setDiscount(0)
      }
    } catch {
      setCouponError('Failed to validate coupon')
    } finally {
      setCouponLoading(false)
    }
  }

  const onPlaceOrder = async (addressData: AddressFormData) => {
    if (!user) {
      navigate('/auth', { state: { from: '/cart' } })
      return
    }
    if (items.length === 0) return

    setOrderLoading(true)
    try {
      const apiUrl = import.meta.env.VITE_API_URL || ''
      const orderIdStr = crypto.randomUUID().replace(/-/g, '')
      const res = await fetch(`${apiUrl}/api/payment/initiate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: orderIdStr,
          amount: total,
          items: items.map((item) => ({
            productId: item.productId,
            name: item.name,
            slug: item.slug,
            price: item.price,
            quantity: item.quantity,
            image: item.image,
          })),
          shippingAddress: addressData,
          userId: user.id,
          couponCode: couponCode || undefined,
          subtotal,
          gst,
          discount,
          redirectUrl: `${apiUrl}/api/payment/redirect/${orderIdStr}?frontend=${encodeURIComponent(window.location.origin + '/order-success/' + orderIdStr)}`,
          callbackUrl: `${apiUrl}/api/payment/callback`,
          customerPhone: addressData.phone,
          customerEmail: user.email,
        }),
      })
      const data = await res.json()
      if (data.success && data.paymentUrl) {
        window.location.href = data.paymentUrl
      } else {
        throw new Error(data.error || 'Payment initiation failed')
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setOrderLoading(false)
    }
  }

  if (items.length === 0) {
    return (
      <>
        <Helmet><title>Your Bag — CHUYA</title></Helmet>
        <div className="section min-h-[60vh] flex flex-col items-center justify-center text-center">
          <h1 className="font-serif text-3xl md:text-4xl mb-4">Your Bag is Empty</h1>
          <p className="text-muted text-sm mb-8">Looks like you haven't added anything yet.</p>
          <Link to="/shop"><Button variant="primary">Continue Shopping</Button></Link>
        </div>
      </>
    )
  }

  return (
    <>
      <Helmet><title>Your Bag — CHUYA</title></Helmet>
      <div className="section" id="cart-page">
        <div className="max-w-[1400px] mx-auto">
          <h1 className="font-serif text-3xl md:text-4xl mb-10 text-center">Your Bag</h1>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-12">
            {/* Left — Items */}
            <div className="lg:col-span-3 space-y-6">
              {items.map((item) => (
                <div
                  key={item.productId}
                  className="flex gap-4 md:gap-6 pb-6 border-b border-chuya/10"
                  id={`cart-item-${item.productId}`}
                >
                  <Link to={`/product/${item.slug}`} className="flex-shrink-0">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-[80px] h-[80px] md:w-[100px] md:h-[100px] object-cover"
                    />
                  </Link>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <Link to={`/product/${item.slug}`} className="font-serif text-lg hover:text-taupe transition-colors">
                          {item.name}
                        </Link>
                        <p className="text-sm text-muted mt-0.5">{formatCurrency(item.price)}</p>
                      </div>
                      <p className="text-sm font-medium">{formatCurrency(item.price * item.quantity)}</p>
                    </div>
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center border border-chuya/20">
                        <button onClick={() => updateQuantity(item.productId, item.quantity - 1)} className="p-1.5">
                          <Minus size={12} />
                        </button>
                        <span className="w-8 text-center text-xs">{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.productId, item.quantity + 1)} className="p-1.5">
                          <Plus size={12} />
                        </button>
                      </div>
                      <button
                        onClick={() => removeItem(item.productId)}
                        className="text-muted hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {/* Coupon */}
              <div className="pt-2">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Tag size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                    <input
                      type="text"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                      placeholder="Coupon code"
                      className="input pl-10"
                      id="coupon-input"
                    />
                  </div>
                  <Button variant="ghost" onClick={handleApplyCoupon} loading={couponLoading}>
                    Apply
                  </Button>
                </div>
                {couponError && <p className="text-red-500 text-xs mt-1">{couponError}</p>}
                {discount > 0 && <p className="text-green-600 text-xs mt-1">Coupon applied! You save {formatCurrency(discount)}</p>}
              </div>
            </div>

            {/* Right — Summary + Checkout */}
            <div className="lg:col-span-2">
              <div className="bg-white p-6 md:p-8 sticky top-24">
                <h2 className="text-xs tracking-[0.2em] uppercase text-muted mb-6">Order Summary</h2>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between"><span className="text-muted">Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
                  <div className="flex justify-between"><span className="text-muted">GST (18%)</span><span>{formatCurrency(gst)}</span></div>
                  {discount > 0 && (
                    <div className="flex justify-between text-green-600"><span>Discount</span><span>-{formatCurrency(discount)}</span></div>
                  )}
                  <div className="flex justify-between"><span className="text-muted">Shipping</span><span className="text-green-600">Free</span></div>
                  <div className="h-px bg-chuya/10 my-2" />
                  <div className="flex justify-between text-lg font-medium"><span>Total</span><span>{formatCurrency(total)}</span></div>
                </div>

                <div className="h-px bg-chuya/10 my-6" />

                {/* Shipping Address Form */}
                <h3 className="text-xs tracking-[0.2em] uppercase text-muted mb-4">Shipping Address</h3>
                <form onSubmit={handleSubmit(onPlaceOrder)} className="space-y-3">
                  <div>
                    <input {...register('name')} placeholder="Full Name *" className="input" id="checkout-name" />
                    {errors.name && <p className="text-red-500 text-xs mt-0.5">{errors.name.message}</p>}
                  </div>
                  <div>
                    <input {...register('phone')} placeholder="Phone (10 digits) *" className="input" id="checkout-phone" />
                    {errors.phone && <p className="text-red-500 text-xs mt-0.5">{errors.phone.message}</p>}
                  </div>
                  <div>
                    <input {...register('line1')} placeholder="Address Line 1 *" className="input" id="checkout-line1" />
                    {errors.line1 && <p className="text-red-500 text-xs mt-0.5">{errors.line1.message}</p>}
                  </div>
                  <input {...register('line2')} placeholder="Address Line 2 (optional)" className="input" id="checkout-line2" />
                  <div>
                    <input
                      {...register('pincode')}
                      placeholder="PIN Code *"
                      className="input"
                      maxLength={6}
                      onBlur={handlePincodeBlur}
                      id="checkout-pincode"
                    />
                    {errors.pincode && <p className="text-red-500 text-xs mt-0.5">{errors.pincode.message}</p>}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <input {...register('city')} placeholder="City *" className="input" id="checkout-city" />
                      {errors.city && <p className="text-red-500 text-xs mt-0.5">{errors.city.message}</p>}
                    </div>
                    <div>
                      <select {...register('state')} className="input" id="checkout-state" defaultValue="">
                        <option value="" disabled>State *</option>
                        {INDIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                      {errors.state && <p className="text-red-500 text-xs mt-0.5">{errors.state.message}</p>}
                    </div>
                  </div>

                  <div className="pt-4">
                    <Button
                      type="submit"
                      variant="primary"
                      fullWidth
                      loading={orderLoading}
                      disabled={!user}
                      id="place-order"
                    >
                      <Lock size={14} className="mr-2" />
                      {user ? 'Place Order' : 'Sign In to Checkout'}
                    </Button>
                  </div>

                  {!user && (
                    <p className="text-center text-xs text-muted mt-2">
                      <Link to="/auth" state={{ from: '/cart' }} className="underline hover:text-chuya">Sign in</Link> to place your order
                    </p>
                  )}

                  <div className="flex items-center justify-center gap-2 text-xs text-muted mt-3">
                    <Lock size={12} />
                    <span>100% Secure Checkout</span>
                    <span>•</span>
                    <CreditCard size={12} />
                    <span className="text-[#5F259F] font-medium">PhonePe</span>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
