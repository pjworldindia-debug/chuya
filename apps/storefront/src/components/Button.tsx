import React from 'react'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'accent'
  loading?: boolean
  fullWidth?: boolean
  children: React.ReactNode
}

export default function Button({
  variant = 'primary',
  loading = false,
  fullWidth = false,
  children,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  const baseClasses =
    'inline-flex items-center justify-center px-8 py-3 text-sm font-medium tracking-[0.1em] uppercase transition-all duration-300 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed'

  const variantClasses = {
    primary: 'bg-chuya text-cream hover:bg-chuya/90',
    ghost: 'bg-transparent text-chuya border border-chuya hover:bg-chuya hover:text-cream',
    accent: 'bg-taupe text-chuya hover:bg-taupe/80',
  }

  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${fullWidth ? 'w-full' : ''} ${className}`}
      style={{ borderRadius: 0 }}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span className="flex items-center gap-2">
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          Loading...
        </span>
      ) : (
        children
      )}
    </button>
  )
}
