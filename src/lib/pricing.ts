export function getEffectivePrice(price: number, promoPrice: number | null | undefined): number {
  return promoPrice !== null && promoPrice !== undefined && promoPrice < price
    ? promoPrice
    : price
}

export interface OrderPriceInput {
  productId: string
  quantity: number
}

export interface OrderPriceProduct {
  id: string
  name: string
  price: number
  promoPrice: number | null
  talle: string | null
}

export function calculateOrderSnapshot(
  items: OrderPriceInput[],
  products: OrderPriceProduct[]
): { items: Array<OrderPriceInput & Omit<OrderPriceProduct, 'id' | 'price' | 'promoPrice'> & { price: number }>; total: number } {
  const productsById = new Map(products.map((product) => [product.id, product]))
  const pricedItems = items.map((item) => {
    const product = productsById.get(item.productId)
    if (!product) throw new Error('Product is unavailable for order pricing')
    return {
      productId: product.id,
      name: product.name,
      price: getEffectivePrice(product.price, product.promoPrice),
      quantity: item.quantity,
      talle: product.talle,
    }
  })
  return {
    items: pricedItems,
    total: pricedItems.reduce((sum, item) => sum + item.price * item.quantity, 0),
  }
}
