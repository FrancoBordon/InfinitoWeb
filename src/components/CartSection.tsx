'use client'

import { useCartStore } from '@/lib/cart-store'
import { formatPrice, getWhatsAppUrl } from '@/lib/whatsapp'
import { getGradient, getProductImages } from '@/lib/shared'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  ShoppingBag,
  Gift,
  Gem,
  Plus,
  Minus,
  Trash2,
  MessageCircle,
} from 'lucide-react'

interface CartSectionProps {
  onGoToCatalog: () => void
}

export default function CartSection({ onGoToCatalog }: CartSectionProps) {
  const cartItems = useCartStore((s) => s.items)
  const removeItem = useCartStore((s) => s.removeItem)
  const updateQuantity = useCartStore((s) => s.updateQuantity)
  const clearCart = useCartStore((s) => s.clearCart)
  const getTotal = useCartStore((s) => s.getTotal)
  const getItemCount = useCartStore((s) => s.getItemCount)
  const cartTotal = getTotal()
  const cartCount = getItemCount()

  const whatsappUrl = cartItems.length === 0 ? '#' : getWhatsAppUrl(cartItems, cartTotal)

  return (
    <section className="mx-auto w-full max-w-3xl px-4 py-6">
      <h1 className="mb-6 flex items-center gap-3 font-serif text-3xl font-bold text-ink">
        <ShoppingBag className="size-8 text-gold" />
        Tu Carrito
      </h1>

      {cartItems.length === 0 ? (
        /* Empty State */
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="mb-6 flex size-24 items-center justify-center rounded-full bg-secondary">
            <Gift className="size-12 text-gold/40" />
          </div>
          <p className="font-serif text-2xl text-ink-muted">Tu carrito está vacío</p>
          <p className="mt-2 text-sm text-ink-muted/60">
            Agregá productos desde el catálogo
          </p>
          <Button
            onClick={onGoToCatalog}
            className="mt-6 gap-2 bg-gold text-ink hover:bg-gold-dark"
          >
            <Gem className="size-4" />
            Ver catálogo
          </Button>
        </div>
      ) : (
        <>
          {/* Cart Items */}
          <div className="space-y-3">
            {cartItems.map((item) => {
              const itemPrice = item.product.promoPrice || item.product.price
              return (
                <div
                  key={item.product.id}
                  className="flex gap-4 rounded-xl border border-gold/15 bg-card p-4 shadow-sm"
                >
                  {/* Thumbnail */}
                  <div className="size-20 shrink-0 overflow-hidden rounded-lg">
                    {(() => {
                      const thumbImages = getProductImages(item.product)
                      const thumbSrc = thumbImages.length > 0 ? thumbImages[0] : null
                      return thumbSrc ? (
                        <img
                          src={thumbSrc}
                          alt={item.product.name}
                          className="size-full object-cover"
                        />
                      ) : (
                        <div className={`flex size-full items-center justify-center bg-gradient-to-br ${getGradient(item.product.name)}`}>
                          <span className="font-serif text-2xl font-bold text-white/60">
                            {item.product.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )
                    })()}
                  </div>

                  {/* Info */}
                  <div className="flex flex-1 flex-col justify-between">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-serif text-base font-semibold leading-tight text-ink">
                          {item.product.name}
                        </p>
                        {item.product.talle && (
                          <p className="mt-0.5 text-xs text-ink-muted">
                            Talle: {item.product.talle}
                          </p>
                        )}
                        <p className="mt-1 text-sm font-medium text-ink">
                          {formatPrice(itemPrice)} c/u
                        </p>
                      </div>
                      <button
                        onClick={() => removeItem(item.product.id)}
                        className="rounded-md p-1.5 text-ink-muted/60 transition-colors hover:bg-red-50 hover:text-[#8B3A3A]"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>

                    <div className="mt-2 flex items-center justify-between">
                      {/* Quantity Controls */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                          className="flex size-8 items-center justify-center rounded-md border border-gold/30 text-ink-muted transition-colors hover:bg-gold/10"
                        >
                          <Minus className="size-3.5" />
                        </button>
                        <span className="w-8 text-center text-sm font-semibold text-ink">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                          className="flex size-8 items-center justify-center rounded-md border border-gold/30 text-ink-muted transition-colors hover:bg-gold/10"
                        >
                          <Plus className="size-3.5" />
                        </button>
                      </div>

                      {/* Subtotal */}
                      <span className="font-sans text-base font-bold text-ink">
                        {formatPrice(itemPrice * item.quantity)}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          <Separator className="my-6 bg-gold/20" />

          {/* Total & Actions */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-serif text-xl text-ink-muted">Total</span>
              <span className="font-sans text-2xl font-bold text-ink">
                {formatPrice(cartTotal)}
              </span>
            </div>

            <Button
              asChild
              className="w-full gap-2 bg-[#4A7C59] text-white hover:bg-[#3d6a4b]"
              size="lg"
            >
              <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="size-5" />
                Finalizar compra por WhatsApp
              </a>
            </Button>

            <Button
              variant="outline"
              onClick={() => {
                clearCart()
                toast.info('Carrito vaciado')
              }}
              className="w-full gap-2 border-[#8B3A3A]/30 text-[#8B3A3A] hover:bg-[#8B3A3A]/10 hover:text-[#8B3A3A]"
            >
              <Trash2 className="size-4" />
              Vaciar carrito
            </Button>
          </div>
        </>
      )}
    </section>
  )
}
