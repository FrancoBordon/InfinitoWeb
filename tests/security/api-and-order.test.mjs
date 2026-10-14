import assert from 'node:assert/strict'
import { test } from 'node:test'
import { calculateOrderSnapshot, getEffectivePrice } from '../../src/lib/pricing.ts'
import { getProductImages } from '../../src/lib/shared.ts'
import { formatPrice, getWhatsAppOrderUrl } from '../../src/lib/whatsapp-order.ts'
import {
  aggregateOrderQuantities,
  canConfirmOrderStock,
  canTransitionOrderStatus,
  getActiveReservedQuantities,
  getAvailableStock,
  getStockReservationExpiry,
  STOCK_RESERVATION_DURATION_MS,
  StockReservationError,
} from '../../src/lib/stock-reservations.ts'

process.env.SESSION_SECRET = 'test-only-session-secret-at-least-32-bytes'
process.env.APP_ORIGIN = 'https://shop.example'
process.env.NODE_ENV = 'test'

test('order pricing uses current product prices, promotions, and validated quantities', () => {
  assert.equal(getEffectivePrice(100, 75), 75)
  const quote = calculateOrderSnapshot(
    [{ productId: 'p-1', quantity: 2 }, { productId: 'p-2', quantity: 1 }],
    [
      { id: 'p-1', name: 'Gift', price: 100, promoPrice: 75, talle: null },
      { id: 'p-2', name: 'Box', price: 50, promoPrice: null, talle: 'Único' },
    ]
  )
  assert.equal(quote.total, 200)
  assert.deepEqual(quote.items.map(({ price, quantity }) => ({ price, quantity })), [
    { price: 75, quantity: 2 },
    { price: 50, quantity: 1 },
  ])
  const whatsapp = new URL(getWhatsAppOrderUrl(quote.items, quote.total))
  assert.equal(whatsapp.hostname, 'wa.me')
  assert.equal(whatsapp.pathname, '/5493804313064')
  assert.match(decodeURIComponent(whatsapp.searchParams.get('text')), /2x Gift - /)
  assert.ok(decodeURIComponent(whatsapp.searchParams.get('text')).includes(`Total: ${formatPrice(quote.total)}`))
  assert.throws(() => calculateOrderSnapshot(
    [{ productId: 'missing', quantity: 1 }],
    []
  ))
})

test('existing public image URLs remain unchanged and render through the existing helper', () => {
  const oldPublicUrl = 'https://example.supabase.co/storage/v1/object/public/productos/1712345678-photo.jpg'
  assert.deepEqual(getProductImages({ imageUrl: oldPublicUrl }), [oldPublicUrl])
  assert.deepEqual(getProductImages({ images: [oldPublicUrl] }), [oldPublicUrl])
})

test('stock simulation accounts for live holds and expires them after 30 minutes', async () => {
  assert.equal(STOCK_RESERVATION_DURATION_MS, 30 * 60 * 1000)
  const now = new Date('2026-10-13T12:00:00Z')
  let query
  const reserved = await getActiveReservedQuantities({
    order: {
      findMany: async (args) => {
        query = args
        return [
          { items: [{ productId: 'p-1', quantity: 2 }, { productId: 'p-1', quantity: 1 }] },
          { items: [{ productId: 'p-1', quantity: 2 }] },
        ]
      },
    },
  }, ['p-1'], now)

  assert.equal(query.where.status, 'pending')
  assert.deepEqual(query.where.stockReservedUntil, { gt: now })
  assert.equal(reserved.get('p-1'), 5)
  assert.equal(getAvailableStock(7, reserved.get('p-1')), 2)
  assert.equal(getAvailableStock(4, reserved.get('p-1')), -1)
  assert.deepEqual(aggregateOrderQuantities([
    { productId: 'p-1', quantity: 2 },
    { productId: 'p-1', quantity: 3 },
  ]), new Map([['p-1', 5]]))
  assert.throws(
    () => aggregateOrderQuantities([{ productId: null, quantity: 1 }]),
    StockReservationError
  )
})

test('stock reservation recovery flag disables new holds only when explicitly false', () => {
  const originalValue = process.env.STOCK_RESERVATIONS_ENABLED
  const now = new Date('2026-10-13T12:00:00Z')
  try {
    delete process.env.STOCK_RESERVATIONS_ENABLED
    assert.equal(getStockReservationExpiry(now).getTime(), now.getTime() + STOCK_RESERVATION_DURATION_MS)
    process.env.STOCK_RESERVATIONS_ENABLED = 'false'
    assert.equal(getStockReservationExpiry(now), null)
    process.env.STOCK_RESERVATIONS_ENABLED = 'true'
    assert.equal(getStockReservationExpiry(now).getTime(), now.getTime() + STOCK_RESERVATION_DURATION_MS)
    process.env.STOCK_RESERVATIONS_ENABLED = 'False'
    assert.equal(getStockReservationExpiry(now).getTime(), now.getTime() + STOCK_RESERVATION_DURATION_MS)
  } finally {
    if (originalValue === undefined) delete process.env.STOCK_RESERVATIONS_ENABLED
    else process.env.STOCK_RESERVATIONS_ENABLED = originalValue
  }
})

test('simulated WhatsApp order holds prevent overselling and confirmation consumes stock once', () => {
  const physicalStock = 3
  let activeReservations = 0
  assert.equal(canConfirmOrderStock(physicalStock, activeReservations, 2), true)
  activeReservations += 2
  assert.equal(canConfirmOrderStock(physicalStock, activeReservations, 2), false)
  assert.equal(canTransitionOrderStatus('pending', 'confirmed'), true)
  assert.equal(canTransitionOrderStatus('pending', 'cancelled'), true)
  assert.equal(canTransitionOrderStatus('pending', 'shipped'), false)
  assert.equal(canTransitionOrderStatus('confirmed', 'shipped'), true)
  assert.equal(physicalStock - 2, 1)
})
