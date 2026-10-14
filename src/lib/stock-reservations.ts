import type { Prisma } from '@prisma/client'

export const STOCK_RESERVATION_DURATION_MS = 30 * 60 * 1000

export function getStockReservationExpiry(now: Date): Date | null {
  if (process.env.STOCK_RESERVATIONS_ENABLED === 'false') return null
  return new Date(now.getTime() + STOCK_RESERVATION_DURATION_MS)
}

export class StockReservationError extends Error {}

type Transaction = Prisma.TransactionClient

export function getAvailableStock(stock: number, reserved: number): number {
  return stock - reserved
}

export function canConfirmOrderStock(
  stock: number,
  otherActiveReservations: number,
  requestedQuantity: number
): boolean {
  return getAvailableStock(stock, otherActiveReservations) >= requestedQuantity
}

const ORDER_STATUS_TRANSITIONS: Record<string, readonly string[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['shipped', 'cancelled'],
  shipped: ['delivered'],
  delivered: [],
  cancelled: [],
}

export function canTransitionOrderStatus(current: string, next: string): boolean {
  return current === next || ORDER_STATUS_TRANSITIONS[current]?.includes(next) === true
}

export async function lockProductRows(tx: Transaction, productIds: string[]): Promise<void> {
  for (const id of [...new Set(productIds)].sort()) {
    await tx.$queryRaw`SELECT "id" FROM "Product" WHERE "id" = ${id} FOR UPDATE`
  }
}

export async function getActiveReservedQuantities(
  tx: Transaction,
  productIds: string[],
  now: Date,
  excludeOrderId?: string
): Promise<Map<string, number>> {
  const ids = [...new Set(productIds)]
  const reservations = new Map<string, number>()
  if (ids.length === 0) return reservations

  const orders = await tx.order.findMany({
    where: {
      status: 'pending',
      stockReservedUntil: { gt: now },
      ...(excludeOrderId ? { id: { not: excludeOrderId } } : {}),
      items: { some: { productId: { in: ids } } },
    },
    select: {
      items: {
        where: { productId: { in: ids } },
        select: { productId: true, quantity: true },
      },
    },
  })

  for (const order of orders) {
    for (const item of order.items) {
      if (item.productId) {
        reservations.set(item.productId, (reservations.get(item.productId) ?? 0) + item.quantity)
      }
    }
  }
  return reservations
}

export function aggregateOrderQuantities(
  items: Array<{ productId: string | null; quantity: number }>
): Map<string, number> {
  const quantities = new Map<string, number>()
  for (const item of items) {
    if (!item.productId) throw new StockReservationError('An order item has no product available for stock validation')
    quantities.set(item.productId, (quantities.get(item.productId) ?? 0) + item.quantity)
  }
  return quantities
}
