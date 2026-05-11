import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { supabase } from '@chuya/shared/supabase'
import { signInSchema, signUpSchema, type SignInFormData, type SignUpFormData } from '@chuya/shared/schemas'
import Button from '../components/Button'

export default function AuthPage() {
  const [tab, setTab] = useState<'signin' | 'signup'>('signin')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotSent, setForgotSent] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string })?.from || '/account'

  // Sign In form
  const signInForm = useForm<SignInFormData>({ resolver: zodResolver(signInSchema) })

  // Sign Up form
  const signUpForm = useForm<SignUpFormData>({ resolver: zodResolver(signUpSchema) })

  const handleSignIn = async (data: SignInFormData) => {
    setLoading(true)
    setError('')
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      })
      if (authError) throw authError
      navigate(from, { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed')
    } finally {
      setLoading(false)
    }
  }

  const handleSignUp = async (data: SignUpFormData) => {
    setLoading(true)
    setError('')
    try {
      const { error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            full_name: data.full_name,
          },
        },
      })
      if (authError) throw authError
      navigate(from, { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign up failed')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleAuth = async () => {
    try {
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}${from}`,
        },
      })
      if (authError) throw authError
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google sign in failed')
    }
  }

  const handleForgotPassword = async () => {
    if (!forgotEmail) return
    setLoading(true)
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
        redirectTo: `${window.location.origin}/auth`,
      })
      if (resetError) throw resetError
      setForgotSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send reset email')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Helmet><title>Sign In — CHUYA</title></Helmet>
      <div className="section min-h-[80vh] flex items-center justify-center" id="auth-page">
        <div className="w-full max-w-[440px] bg-white p-8 md:p-12">
          {/* Logo */}
          <h1 className="font-serif text-[28px] tracking-[0.15em] text-center mb-8">CHUYA</h1>

          {showForgotPassword ? (
            /* Forgot Password */
            <div className="space-y-6">
              <h2 className="text-sm tracking-[0.15em] uppercase text-center text-muted">Reset Password</h2>
              {forgotSent ? (
                <div className="text-center space-y-4">
                  <p className="text-sm text-muted">Check your email for a password reset link.</p>
                  <button onClick={() => { setShowForgotPassword(false); setForgotSent(false) }} className="text-sm underline text-chuya">
                    Back to Sign In
                  </button>
                </div>
              ) : (
                <>
                  <input
                    type="email"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="Your email address"
                    className="input"
                    id="forgot-email"
                  />
                  <Button variant="primary" fullWidth onClick={handleForgotPassword} loading={loading}>
                    Send Reset Link
                  </Button>
                  <button onClick={() => setShowForgotPassword(false)} className="text-sm text-muted hover:text-chuya block mx-auto">
                    Back to Sign In
                  </button>
                </>
              )}
            </div>
          ) : (
            <>
              {/* Tabs */}
              <div className="flex border-b border-chuya/10 mb-8">
                <button
                  onClick={() => { setTab('signin'); setError('') }}
                  className={`flex-1 pb-3 text-sm tracking-[0.1em] uppercase transition-colors ${tab === 'signin' ? 'text-chuya border-b-2 border-chuya' : 'text-muted'}`}
                  id="tab-signin"
                >
                  Sign In
                </button>
                <button
                  onClick={() => { setTab('signup'); setError('') }}
                  className={`flex-1 pb-3 text-sm tracking-[0.1em] uppercase transition-colors ${tab === 'signup' ? 'text-chuya border-b-2 border-chuya' : 'text-muted'}`}
                  id="tab-signup"
                >
                  Create Account
                </button>
              </div>

              {error && (
                <div className="bg-red-50 text-red-600 text-sm p-3 mb-6">{error}</div>
              )}

              {tab === 'signin' ? (
                <form onSubmit={signInForm.handleSubmit(handleSignIn)} className="space-y-4">
                  <div>
                    <input {...signInForm.register('email')} type="email" placeholder="Email" className="input" id="signin-email" />
                    {signInForm.formState.errors.email && <p className="text-red-500 text-xs mt-0.5">{signInForm.formState.errors.email.message}</p>}
                  </div>
                  <div>
                    <input {...signInForm.register('password')} type="password" placeholder="Password" className="input" id="signin-password" />
                    {signInForm.formState.errors.password && <p className="text-red-500 text-xs mt-0.5">{signInForm.formState.errors.password.message}</p>}
                  </div>
                  <div className="text-right">
                    <button type="button" onClick={() => setShowForgotPassword(true)} className="text-xs text-muted hover:text-chuya">
                      Forgot password?
                    </button>
                  </div>
                  <Button type="submit" variant="primary" fullWidth loading={loading} id="signin-submit">
                    Sign In
                  </Button>
                </form>
              ) : (
                <form onSubmit={signUpForm.handleSubmit(handleSignUp)} className="space-y-4">
                  <div>
                    <input {...signUpForm.register('full_name')} placeholder="Full Name" className="input" id="signup-name" />
                    {signUpForm.formState.errors.full_name && <p className="text-red-500 text-xs mt-0.5">{signUpForm.formState.errors.full_name.message}</p>}
                  </div>
                  <div>
                    <input {...signUpForm.register('email')} type="email" placeholder="Email" className="input" id="signup-email" />
                    {signUpForm.formState.errors.email && <p className="text-red-500 text-xs mt-0.5">{signUpForm.formState.errors.email.message}</p>}
                  </div>
                  <div>
                    <input {...signUpForm.register('password')} type="password" placeholder="Password" className="input" id="signup-password" />
                    {signUpForm.formState.errors.password && <p className="text-red-500 text-xs mt-0.5">{signUpForm.formState.errors.password.message}</p>}
                  </div>
                  <div>
                    <input {...signUpForm.register('confirm_password')} type="password" placeholder="Confirm Password" className="input" id="signup-confirm" />
                    {signUpForm.formState.errors.confirm_password && <p className="text-red-500 text-xs mt-0.5">{signUpForm.formState.errors.confirm_password.message}</p>}
                  </div>
                  <div>
                    <input {...signUpForm.register('phone')} placeholder="Phone (optional)" className="input" id="signup-phone" />
                    {signUpForm.formState.errors.phone && <p className="text-red-500 text-xs mt-0.5">{signUpForm.formState.errors.phone.message}</p>}
                  </div>
                  <Button type="submit" variant="primary" fullWidth loading={loading} id="signup-submit">
                    Create Account
                  </Button>
                </form>
              )}

              {/* Divider */}
              <div className="flex items-center gap-4 my-6">
                <div className="flex-1 h-px bg-chuya/10" />
                <span className="text-xs text-muted uppercase">or</span>
                <div className="flex-1 h-px bg-chuya/10" />
              </div>

              {/* Google OAuth */}
              <Button variant="ghost" fullWidth onClick={handleGoogleAuth} id="google-auth">
                <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Continue with Google
              </Button>
            </>
          )}
        </div>
      </div>
    </>
  )
}
