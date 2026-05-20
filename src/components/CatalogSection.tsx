'use client'

import { useState } from 'react'
import type { Product, Category } from '@/lib/types'
import { formatPrice } from '@/lib/whatsapp'
import { getGradient, getProductImages } from '@/lib/shared'
import { toast } from 'sonner'
import { useCartStore } from '@/lib/cart-store'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Search,
  ShoppingCart,
  Gift,
  Tag,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'

interface CatalogSectionProps {
  products: Product[]
  categories: Category[]
  productsLoading: boolean
  onOpenLightbox: (images: string[], index: number) => void
}

export default function CatalogSection({ products, categories, productsLoading, onOpenLightbox }: CatalogSectionProps) {
  const [categoryFilter, setCategoryFilter] = useState('Todos')
  const [catalogSearch, setCatalogSearch] = useState('')
  const [carouselIndex, setCarouselIndex] = useState<Record<string, number>>({})

  const addItem = useCartStore((s) => s.addItem)

  const catalogCategories = ['Todos', ...categories.map((c) => c.name)]

  const catalogProducts = products.filter((p) => {
    if (categoryFilter !== 'Todos' && p.category !== categoryFilter) return false
    if (catalogSearch) {
      const search = catalogSearch.toLowerCase()
      if (!p.name.toLowerCase().includes(search) && !p.description?.toLowerCase().includes(search)) return false
    }
    return true
  })

  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-6">
      {/* Search Bar */}
      <div className="relative mb-5">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-muted" />
        <Input
          placeholder="Buscar productos..."
          value={catalogSearch}
          onChange={(e) => setCatalogSearch(e.target.value)}
          className="border-gold/30 bg-white pl-10 placeholder:text-ink-muted/50 focus:border-gold"
        />
      </div>

      {/* Category Filters (dynamic) */}
      <div className="mb-6 flex flex-wrap gap-2">
        {catalogCategories.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategoryFilter(cat)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
              categoryFilter === cat
                ? 'bg-gold text-ink shadow-sm'
                : 'bg-secondary text-ink-muted hover:bg-gold-light/40'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Loading */}
      {productsLoading && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="overflow-hidden rounded-xl border border-border bg-card">
              <div className="aspect-square animate-pulse bg-secondary" />
              <div className="space-y-2 p-3">
                <div className="h-4 w-3/4 animate-pulse rounded bg-secondary" />
                <div className="h-4 w-1/2 animate-pulse rounded bg-secondary" />
                <div className="h-8 w-full animate-pulse rounded bg-secondary" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!productsLoading && catalogProducts.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Gift className="mb-4 size-16 text-gold/30" />
          <p className="font-serif text-2xl text-ink-muted">No hay productos disponibles</p>
          <p className="mt-2 text-sm text-ink-muted/60">
            Volvé más tarde para ver novedades
          </p>
        </div>
      )}

      {/* Product Grid */}
      {!productsLoading && catalogProducts.length > 0 && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {catalogProducts.map((product) => {
            const hasPromo = product.promoPrice != null && product.promoPrice < product.price
            const discountPct = hasPromo
              ? Math.round(((product.price - product.promoPrice!) / product.price) * 100)
              : 0
            const outOfStock = product.stock === 0

            return (
              <div
                key={product.id}
                className="group relative flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md"
              >
                {/* Image / Placeholder with Carousel */}
                <div className="relative aspect-square overflow-hidden">
                  {(() => {
                    const productImages = getProductImages(product)
                    const currentIdx = carouselIndex[product.id] || 0
                    const hasMultiple = productImages.length > 1
                    const currentImage = productImages.length > 0 ? productImages[currentIdx] : null

                    return (
                      <>
                        {currentImage ? (
                          <img
                            src={currentImage}
                            alt={product.name}
                            className="size-full cursor-pointer object-cover transition-transform duration-500 group-hover:scale-105"
                            onClick={() => {
                              onOpenLightbox(productImages, currentIdx)
                            }}
                          />
                        ) : (
                          <div className={`flex size-full items-center justify-center bg-gradient-to-br ${getGradient(product.name)}`}>
                            <span className="font-serif text-5xl font-bold text-white/60">
                              {product.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}

                        {/* Carousel Arrows */}
                        {hasMultiple && (
                          <>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                setCarouselIndex((prev) => ({
                                  ...prev,
                                  [product.id]: (currentIdx - 1 + productImages.length) % productImages.length,
                                }))
                              }}
                              className="absolute left-1 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition-colors hover:bg-black/60 sm:size-9"
                              aria-label="Imagen anterior"
                            >
                              <ChevronLeft className="size-4 sm:size-5" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                setCarouselIndex((prev) => ({
                                  ...prev,
                                  [product.id]: (currentIdx + 1) % productImages.length,
                                }))
                              }}
                              className="absolute right-1 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition-colors hover:bg-black/60 sm:size-9"
                              aria-label="Siguiente imagen"
                            >
                              <ChevronRight className="size-4 sm:size-5" />
                            </button>
                          </>
                        )}

                        {/* Dot Indicators */}
                        {hasMultiple && (
                          <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1">
                            {productImages.map((_, idx) => (
                              <button
                                key={idx}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setCarouselIndex((prev) => ({ ...prev, [product.id]: idx }))
                                }}
                                className={`size-1.5 rounded-full transition-colors ${
                                  idx === currentIdx ? 'bg-white' : 'bg-white/50'
                                }`}
                                aria-label={`Ir a imagen ${idx + 1}`}
                              />
                            ))}
                          </div>
                        )}
                      </>
                    )
                  })()}

                  {/* Badges */}
                  {hasPromo && (
                    <Badge className="absolute left-2 top-2 z-10 bg-[#8B3A3A] text-white shadow-sm">
                      {discountPct}% OFF
                    </Badge>
                  )}
                  {outOfStock && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center bg-ink/40 backdrop-blur-[2px]">
                      <Badge variant="secondary" className="bg-ink/80 text-cream">
                        Sin stock
                      </Badge>
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex flex-1 flex-col gap-1 p-3">
                  {/* Category */}
                  <div className="flex items-center gap-1.5">
                    <Tag className="size-3 text-gold" />
                    <span className="text-[11px] font-medium uppercase tracking-wider text-ink-muted">
                      {product.category}
                    </span>
                  </div>

                  {/* Name */}
                  <h3 className="font-serif text-base font-semibold leading-tight text-ink line-clamp-2">
                    {product.name}
                  </h3>

                  {/* Talle */}
                  {product.talle && (
                    <span className="text-xs text-ink-muted">
                      Talle: {product.talle}
                    </span>
                  )}

                  {/* Stock indicator */}
                  <div className="flex items-center gap-1">
                    {outOfStock ? (
                      <>
                        <span className="size-1.5 rounded-full bg-[#8B3A3A]" />
                        <span className="text-[11px] font-medium text-[#8B3A3A]">Sin stock</span>
                      </>
                    ) : (
                      <>
                        <span className="size-1.5 rounded-full bg-[#4A7C59]" />
                        <span className="text-[11px] font-medium text-[#4A7C59]">En stock</span>
                      </>
                    )}
                  </div>

                  {/* Price */}
                  <div className="mt-auto flex items-baseline gap-2 pt-1">
                    {hasPromo ? (
                      <>
                        <span className="text-sm text-ink-muted line-through">
                          {formatPrice(product.price)}
                        </span>
                        <span className="font-sans text-lg font-bold text-[#8B3A3A]">
                          {formatPrice(product.promoPrice!)}
                        </span>
                      </>
                    ) : (
                      <span className="font-sans text-lg font-bold text-ink">
                        {formatPrice(product.price)}
                      </span>
                    )}
                  </div>

                  {/* Add to cart */}
                  <Button
                    onClick={() => {
                      addItem(product)
                      toast.success(`${product.name} agregado al carrito`)
                    }}
                    disabled={outOfStock}
                    className="mt-2 w-full gap-1.5 bg-gold text-ink hover:bg-gold-dark disabled:opacity-50"
                    size="sm"
                  >
                    <ShoppingCart className="size-4" />
                    Agregar al carrito
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
