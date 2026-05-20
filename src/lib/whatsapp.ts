import type { CartItem } from '@/lib/types'

const WHATSAPP_NUMBER = '5493804313064'

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
    const price = item.product.promoPrice || item.product.price
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
