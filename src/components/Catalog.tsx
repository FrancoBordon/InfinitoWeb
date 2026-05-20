'use client'

import { useEffect, useState, useMemo } from 'react'
import { useCartStore } from '@/store'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Gem, ShoppingCart, Tag } from 'lucide-react'
import { toast } from 'sonner'

interface Product {
  id: string
  name: string
  description: string
  category: string
  price: number
  costPrice: number
  promoPrice?: number | null
  imageUrl?: string | null
  stock: number
  talle?: string | null
}

const fmtARS = (n: number) => '$' + Math.round(n).toLocaleString('es-AR')

export default function Catalog() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState('Todos')
  const addItem = useCartStore((s) => s.addItem)

  useEffect(() => {
    fetch('/api/products')
      .then((r) => r.json())
      .then((data) => {
        setProducts(Array.isArray(data) ? data : [])
      })
      .catch(() => {
        setProducts([])
      })
      .finally(() => setLoading(false))
  }, [])

  const categories = useMemo(() => {
    const cats = [...new Set(products.map((p) => p.category))]
    return ['Todos', ...cats]
  }, [products])

  const filtered = useMemo(
    () =>
      activeCategory === 'Todos'
        ? products
        : products.filter((p) => p.category === activeCategory),
    [products, activeCategory]
  )

  const handleAdd = (product: Product) => {
    addItem({
      productId: product.id,
      name: product.name,
      price: product.promoPrice || product.price,
      quantity: 1,
      talle: product.talle || undefined,
      imageUrl: product.imageUrl || undefined,
      category: product.category,
    })
    toast.success(`${product.name} agregado al carrito`)
  }

  /* ── Loading skeleton ── */
  if (loading) {
    return (
      <section className="mx-auto w-full max-w-7xl px-4 py-8">
        <div className="mb-6 flex flex-wrap gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-20 rounded-full" />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="overflow-hidden rounded-xl border border-border bg-card">
              <Skeleton className="aspect-square w-full" />
              <div className="space-y-2 p-3">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-8 w-full" />
              </div>
            </div>
          ))}
        </div>
      </section>
    )
  }

  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-8">
      {/* Category filters */}
      <div className="mb-6 flex flex-wrap gap-2">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
              activeCategory === cat
                ? 'bg-gold text-ink shadow-sm'
                : 'bg-secondary text-ink-muted hover:bg-gold-light/40'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Gem className="mb-4 size-12 text-gold/40" />
          <p className="font-serif text-xl text-ink-muted">
            No hay productos disponibles
          </p>
          <p className="mt-1 text-sm text-ink-muted/70">
            Volvé más tarde para ver novedades
          </p>
        </div>
      )}

      {/* Product grid */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {filtered.map((product) => {
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
              {/* Image */}
              <div className="relative aspect-square overflow-hidden bg-secondary">
                {product.imageUrl ? (
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex size-full items-center justify-center">
                    <Gem className="size-12 text-gold/30" />
                  </div>
                )}

                {/* Badges */}
                {hasPromo && (
                  <Badge className="absolute left-2 top-2 bg-red-500 text-white shadow-sm">
                    {discountPct}% OFF
                  </Badge>
                )}
                {outOfStock && (
                  <div className="absolute inset-0 flex items-center justify-center bg-ink/40">
                    <Badge
                      variant="secondary"
                      className="bg-ink/80 text-cream"
                    >
                      Sin stock
                    </Badge>
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="flex flex-1 flex-col gap-1 p-3">
                {/* Category badge */}
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

                {/* Price */}
                <div className="mt-auto flex items-baseline gap-2 pt-1">
                  {hasPromo ? (
                    <>
                      <span className="text-sm text-ink-muted line-through">
                        {fmtARS(product.price)}
                      </span>
                      <span className="font-sans text-lg font-bold text-red-600">
                        {fmtARS(product.promoPrice!)}
                      </span>
                    </>
                  ) : (
                    <span className="font-sans text-lg font-bold text-ink">
                      {fmtARS(product.price)}
                    </span>
                  )}
                </div>

                {/* Add to cart */}
                <Button
                  onClick={() => handleAdd(product)}
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
    </section>
  )
}
