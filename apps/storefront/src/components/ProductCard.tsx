import { Link } from 'react-router-dom'
import type { Product } from '@chuya/shared/types'
import { formatCurrency } from '@chuya/shared/constants'
import { Heart } from 'lucide-react'

interface ProductCardProps {
  product: Product
  onWishlistToggle?: (productId: string) => void
  isWishlisted?: boolean
}

export default function ProductCard({ product, onWishlistToggle, isWishlisted }: ProductCardProps) {
  const primaryImage = product.images?.[0] || '/placeholder-product.jpg'
  const secondaryImage = product.images?.[1]
  const isOutOfStock = product.stock === 0
  const hasDiscount = product.compare_at_price && product.compare_at_price > product.price

  return (
    <div className="product-card group" id={`product-card-${product.slug}`}>
      <Link to={`/product/${product.slug}`} className="block relative overflow-hidden">
        {/* Primary image */}
        <img
          src={primaryImage}
          alt={product.name}
          className="product-card-image"
          loading="lazy"
        />

        {/* Secondary image on hover */}
        {secondaryImage && (
          <img
            src={secondaryImage}
            alt={`${product.name} - alternate view`}
            className="absolute inset-0 w-full h-full object-cover opacity-0 group-hover:opacity-100 transition-opacity duration-500"
            loading="lazy"
          />
        )}

        {/* Out of stock overlay */}
        {isOutOfStock && (
          <div className="absolute inset-0 bg-cream/60 flex items-center justify-center">
            <span className="badge bg-chuya text-cream text-xs tracking-wider">
              Out of Stock
            </span>
          </div>
        )}

        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5">
          {product.is_new_arrival && (
            <span className="badge bg-chuya text-cream">New</span>
          )}
          {hasDiscount && (
            <span className="badge bg-taupe text-chuya">
              {Math.round(((product.compare_at_price! - product.price) / product.compare_at_price!) * 100)}% Off
            </span>
          )}
        </div>

        {/* Wishlist */}
        {onWishlistToggle && (
          <button
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onWishlistToggle(product.id)
            }}
            className="absolute top-3 right-3 p-2 bg-cream/80 backdrop-blur-sm hover:bg-cream transition-colors opacity-0 group-hover:opacity-100"
            aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
          >
            <Heart
              size={16}
              className={isWishlisted ? 'fill-chuya text-chuya' : 'text-chuya'}
            />
          </button>
        )}
      </Link>

      {/* Info */}
      <div className="mt-4 px-1">
        <Link to={`/product/${product.slug}`}>
          <h3 className="font-serif text-lg leading-tight hover:text-taupe transition-colors">
            {product.name}
          </h3>
        </Link>
        <div className="mt-1.5 flex items-center gap-2">
          <span className="text-sm font-medium">{formatCurrency(product.price)}</span>
          {hasDiscount && (
            <span className="text-sm text-muted line-through">
              {formatCurrency(product.compare_at_price!)}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
