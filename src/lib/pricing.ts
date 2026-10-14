export function getEffectivePrice(price: number, promoPrice: number | null | undefined): number {
  return promoPrice !== null && promoPrice !== undefined && promoPrice < price
    ? promoPrice
    : price
}
