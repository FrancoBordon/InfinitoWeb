'use client'

import { useCartStore, type CartItem } from '@/store'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetDescription,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { ShoppingBag, Minus, Plus, X, MessageCircle, Trash2, Gem } from 'lucide-react'

const fmtARS = (n: number) => '$' + Math.round(n).toLocaleString('es-AR')

export default function CartDrawer() {
  const items = useCartStore((s) => s.items)
  const isOpen = useCartStore((s) => s.isOpen)
  const setCartOpen = useCartStore((s) => s.setCartOpen)
  const removeItem = useCartStore((s) => s.removeItem)
  const updateQuantity = useCartStore((s) => s.updateQuantity)
  const clearCart = useCartStore((s) => s.clearCart)
  const getTotal = useCartStore((s) => s.getTotal)

  const total = getTotal()

  const buildWhatsAppMessage = () => {
    const lines = items
      .map((item: CartItem) => {
        const talleStr = item.talle ? ` (${item.talle})` : ''
        return `• ${item.name}${talleStr} x${item.quantity} - ${fmtARS(item.price * item.quantity)}`
      })
      .join('\n')

    return encodeURIComponent(
      `🛒 *Nuevo Pedido - Infinito Regalería*\n\n${lines}\n\n💰 *Total: ${fmtARS(total)}*\n\nGracias por tu compra! 🎁`
    )
  }

  const whatsappUrl = `https://wa.me/5493804313064?text=${buildWhatsAppMessage()}`

  return (
    <Sheet open={isOpen} onOpenChange={setCartOpen}>
      <SheetContent
        side="right"
        className="flex w-full flex-col bg-cream sm:max-w-md"
      >
        <SheetHeader className="border-b border-gold/20 pb-4">
          <SheetTitle className="flex items-center gap-2 font-serif text-xl text-ink">
            <ShoppingBag className="size-5 text-gold" />
            Tu Carrito
          </SheetTitle>
          <SheetDescription className="text-ink-muted">
            {items.length === 0
              ? 'Tu carrito está vacío'
              : `${items.length} producto${items.length > 1 ? 's' : ''} en tu carrito`}
          </SheetDescription>
        </SheetHeader>

        {/* Items */}
        <div className="flex-1 overflow-y-auto py-4">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <ShoppingBag className="mb-4 size-16 text-gold/30" />
              <p className="font-serif text-lg text-ink-muted">
                Tu carrito está vacío
              </p>
              <p className="mt-1 text-sm text-ink-muted/70">
                Agregá productos desde el catálogo
              </p>
              <Button
                onClick={() => setCartOpen(false)}
                variant="outline"
                className="mt-4 border-gold text-gold-dark hover:bg-gold/10"
              >
                Ver catálogo
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {items.map((item: CartItem) => (
                <div
                  key={item.productId}
                  className="flex gap-3 rounded-lg border border-gold/15 bg-white p-3 shadow-sm"
                >
                  {/* Thumbnail */}
                  <div className="size-16 shrink-0 overflow-hidden rounded-md bg-secondary">
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="size-full object-cover"
                      />
                    ) : (
                      <div className="flex size-full items-center justify-center">
                        <Gem className="size-6 text-gold/40" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex flex-1 flex-col justify-between">
                    <div className="flex items-start justify-between gap-1">
                      <div>
                        <p className="font-serif text-sm font-semibold leading-tight text-ink">
                          {item.name}
                        </p>
                        {item.talle && (
                          <p className="text-xs text-ink-muted">
                            Talle: {item.talle}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => removeItem(item.productId)}
                        className="rounded p-0.5 text-ink-muted/60 transition-colors hover:bg-red-50 hover:text-red-500"
                      >
                        <X className="size-3.5" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between">
                      {/* Qty controls */}
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() =>
                            updateQuantity(item.productId, item.quantity - 1)
                          }
                          className="flex size-6 items-center justify-center rounded border border-gold/30 text-ink-muted transition-colors hover:bg-gold/10"
                        >
                          <Minus className="size-3" />
                        </button>
                        <span className="w-6 text-center text-sm font-medium text-ink">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() =>
                            updateQuantity(item.productId, item.quantity + 1)
                          }
                          className="flex size-6 items-center justify-center rounded border border-gold/30 text-ink-muted transition-colors hover:bg-gold/10"
                        >
                          <Plus className="size-3" />
                        </button>
                      </div>

                      {/* Line total */}
                      <span className="font-sans text-sm font-bold text-ink">
                        {fmtARS(item.price * item.quantity)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <SheetFooter className="border-t border-gold/20 pt-4">
            <div className="w-full space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-serif text-lg text-ink-muted">Total</span>
                <span className="font-sans text-xl font-bold text-ink">
                  {fmtARS(total)}
                </span>
              </div>

              <Button
                asChild
                className="w-full gap-2 bg-green-600 text-white hover:bg-green-700"
                size="lg"
              >
                <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="size-5" />
                  Finalizar compra por WhatsApp
                </a>
              </Button>

              <Button
                variant="outline"
                onClick={clearCart}
                className="w-full gap-2 border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700"
              >
                <Trash2 className="size-4" />
                Vaciar carrito
              </Button>
            </div>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  )
}
