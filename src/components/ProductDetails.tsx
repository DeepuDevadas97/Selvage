import { useState } from 'react'
import type { Product } from '../data/products'

type ProductDetailsProps = {
  product: Product
  size: string
  color: string
  quantity: number
  cartCount: number
  onSizeChange: (size: string) => void
  onColorChange: (color: string) => void
  onQuantityChange: (quantity: number) => void
  onAddToCart: () => void
  onBuyNow: () => void
}

const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })

export default function ProductDetails({
  product,
  size,
  color,
  quantity,
  cartCount,
  onSizeChange,
  onColorChange,
  onQuantityChange,
  onAddToCart,
  onBuyNow,
}: ProductDetailsProps) {
  const [activeImage, setActiveImage] = useState(0)
  const [showSizeGuide, setShowSizeGuide] = useState(false)
  const [added, setAdded] = useState(false)
  const colorImage = product.colors.find((option) => option.name === color)?.image ?? product.gallery[0].src
  const gallery = product.gallery.map((image, index) => index === 0 ? { ...image, src: colorImage, alt: `The ${color} Signature Crossbody Bag` } : image)
  const visibleImages = [gallery[activeImage], ...gallery.filter((_, index) => index !== activeImage)]

  return (
    <div className="page-shell product-page">
      <div className="product-page-title">
        <span>NEW COLLECTION</span>
        <h1>Designed to Last Beyond Trends</h1>
      </div>
      <div className="product-page-layout">
        <section className="product-gallery" aria-label="Product images">
          <div className="product-gallery-main">
            <img src={visibleImages[0].src} alt={visibleImages[0].alt} />
            <span className="gallery-counter">{String(activeImage + 1).padStart(2, '0')} / {String(product.gallery.length).padStart(2, '0')}</span>
          </div>
          <div className="product-gallery-thumbnails">
            {visibleImages.slice(1).map((image) => (
              <button
                type="button"
                className="product-thumbnail"
                key={image.src}
                onClick={() => setActiveImage(gallery.indexOf(image))}
                aria-label={'View ' + image.alt}
              >
                <img src={image.src} alt="" />
              </button>
            ))}
          </div>
        </section>

        <section className="product-purchase" aria-labelledby="product-title">
          <div className="product-purchase-top"><span>{product.category}</span><span className="bag-count" aria-label={cartCount + ' items in bag'}>BAG <b>{cartCount}</b></span></div>
          <h2 id="product-title">{product.name}</h2>
          <p className="product-description">{product.description}</p>
          <p className="product-detail-price">{money.format(product.amount)}</p>
          <p className="product-tax-note">Taxes calculated at checkout</p>

          <div className="product-options">
            <div className="option-heading"><span>Size: <strong>{size}</strong></span><button type="button" className="size-guide-link" onClick={() => setShowSizeGuide((value) => !value)} aria-expanded={showSizeGuide}>Size guide</button></div>
            <div className="size-options" role="group" aria-label="Choose a size">
              {product.sizes.map((option) => <button type="button" key={option} className={size === option ? 'selected' : ''} aria-pressed={size === option} onClick={() => { onSizeChange(option); setAdded(false) }}>{option}</button>)}
            </div>
            {showSizeGuide && <div className="size-guide" role="region" aria-label="Size guide"><strong>Find your fit</strong><span>Small · essentials only</span><span>Medium · everyday carry</span><span>Large · room for more</span></div>}
          </div>

          <div className="product-options color-options">
            <div className="option-heading"><span>Color: <strong>{color}</strong></span></div>
            <div className="color-swatches" role="group" aria-label="Choose a color">
              {product.colors.map((option) => <button type="button" key={option.name} className={color === option.name ? 'selected' : ''} onClick={() => { onColorChange(option.name); setActiveImage(0); setAdded(false) }} aria-label={option.name} aria-pressed={color === option.name}><span style={{ backgroundColor: option.value }} /></button>)}
            </div>
          </div>

          <div className="product-buy-row">
            <div className="quantity-control" aria-label="Quantity">
              <button type="button" onClick={() => { onQuantityChange(Math.max(1, quantity - 1)); setAdded(false) }} aria-label="Decrease quantity" disabled={quantity <= 1}>−</button>
              <output aria-live="polite">{quantity}</output>
              <button type="button" onClick={() => { onQuantityChange(Math.min(9, quantity + 1)); setAdded(false) }} aria-label="Increase quantity" disabled={quantity >= 9}>+</button>
            </div>
            <button type="button" className="add-to-cart-button" onClick={() => { onAddToCart(); setAdded(true) }}>{added ? 'ADDED TO BAG' : 'ADD TO CART'} <span aria-hidden="true">▣</span></button>
          </div>
          <button type="button" className="buy-now-button" onClick={onBuyNow}>BUY IT NOW <span aria-hidden="true">→</span></button>
          <p className="add-feedback" role="status">{added ? quantity + ' ' + (quantity === 1 ? 'item' : 'items') + ' added to your bag.' : 'Complimentary shipping and easy returns.'}</p>
          <div className="product-trust"><span>CRAFTED WITH CARE</span><span>COMPLIMENTARY SHIPPING</span><span>30-DAY RETURNS</span></div>
        </section>
      </div>
    </div>
  )
}
