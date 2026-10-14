import type { CartItem } from '@/lib/types'
import { getEffectivePrice } from '@/lib/pricing'
import { formatPrice } from './whatsapp-order'

export { formatPrice, getWhatsAppOrderUrl } from './whatsapp-order'
export type { WhatsAppOrderLine } from './whatsapp-order'

const WHATSAPP_NUMBER = '5493804313064'

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
