import type { CartItem } from '@/lib/types'
import { getEffectivePrice } from '@/lib/pricing'

const WHATSAPP_NUMBER = '5493804313064'

export interface WhatsAppOrderLine {
  name: string
  price: number
  quantity: number
  talle: string | null
}

export function formatPrice(price: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price)
}

export function generateWhatsAppMessage(items: CartItem[], total: number): string {
  const lines = items.map((item) => {
    const price = getEffectivePrice(item.product.price, item.product.promoPrice)
    const unitPrice = formatPrice(price)
    const talle = item.product.talle ? ` (${item.product.talle})` : ''

    if (item.quantity > 1) {
      return `${item.quantity}x ${item.product.name}${talle} - ${unitPrice} (c/u)`
    }
    return `${item.quantity}x ${item.product.name}${talle} - ${unitPrice}`
  })

  const message = [
    '¡Hola Infinito! 🎁 Me gustaría realizar el siguiente pedido:',
    '',
    ...lines,
    '',
    `Total: ${formatPrice(total)}`,
    '',
    '¡Gracias!',
  ].join('\n')

  return message
}

export function getWhatsAppUrl(items: CartItem[], total: number): string {
  const message = generateWhatsAppMessage(items, total)
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`
}

export function getWhatsAppOrderUrl(items: WhatsAppOrderLine[], total: number): string {
  const lines = items.map((item) => {
    const talle = item.talle ? ` (${item.talle})` : ''
    const unitPrice = formatPrice(item.price)
    return item.quantity > 1
      ? `${item.quantity}x ${item.name}${talle} - ${unitPrice} (c/u)`
      : `${item.quantity}x ${item.name}${talle} - ${unitPrice}`
  })
  const message = [
    '¡Hola Infinito! 🎁 Me gustaría realizar el siguiente pedido:',
    '',
    ...lines,
    '',
    `Total: ${formatPrice(total)}`,
    '',
    '¡Gracias!',
  ].join('\n')
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`
}
