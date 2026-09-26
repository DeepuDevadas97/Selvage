import modelImage from '../assets/crossbody-model.png'
import frontImage from '../assets/crossbody-front.png'
import backImage from '../assets/crossbody-back.png'
import ivoryImage from '../assets/product-ivory.png'
import forestImage from '../assets/product-forest.png'
import burgundyImage from '../assets/product-burgundy.png'
import beigeImage from '../assets/prodcut-beige.png'

export type ProductColor = { name: string; value: string; image: string }
export type ProductImage = { src: string; alt: string }
export type Product = {
  id: string
  category: string
  name: string
  description: string
  amount: number
  currency: string
  sizes: string[]
  colors: ProductColor[]
  gallery: ProductImage[]
}

const signatureGallery: ProductImage[] = [
  { src: modelImage, alt: 'Model wearing the Signature Crossbody Bag in beige leather' },
  { src: frontImage, alt: 'Close view of the Signature Crossbody Bag' },
  { src: backImage, alt: 'Signature Crossbody Bag shown from the back' },
]

const sizes = ['S', 'M', 'L']
const colors: ProductColor[] = [
  { name: 'Ivory', value: '#e9e3d6', image: ivoryImage },
  { name: 'Forest', value: '#253d38', image: forestImage },
  { name: 'Beige', value: '#cbb99e', image: beigeImage },
  { name: 'Burgundy', value: '#713940', image: burgundyImage },
]

export const products: Record<string, Product> = {
  prod_123: {
    id: 'prod_123',
    category: 'CROSSBODY BAG',
    name: 'The Signature Crossbody Bag in Leather',
    description: 'Made for everyday, kept for years. Crafted from supple full-grain leather.',
    amount: 1995,
    currency: 'USD',
    sizes,
    colors,
    gallery: signatureGallery,
  },
}

export function getProduct(productId: string | null): Product | undefined {
  return productId ? products[productId] : undefined
}
