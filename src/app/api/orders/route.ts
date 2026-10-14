import { createHash } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireAdmin, verifyRequestOrigin } from '@/lib/api-security'
import { isRateLimited } from '@/lib/login-rate-limit'
import { calculateOrderSnapshot } from '@/lib/pricing'
import {
  canConfirmOrderStock,
  getActiveReservedQuantities,
  getStockReservationExpiry,
  lockProductRows,
} from '@/lib/stock-reservations'

const orderSchema = z.object({
  customerName: z.string().trim().max(200).nullable().optional(),
  customerPhone: z.string().trim().max(50).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
  items: z.array(z.object({
    productId: z.string().min(1).max(100),
    quantity: z.number().int().min(1).max(100),
  }).strict()).min(1).max(30),
}).strict()

export async function GET(request: NextRequest) {
  const auth = requireAdmin(request)
  if (!auth.ok) return auth.response
  try {
    const params = request.nextUrl.searchParams
    const status = params.get('status')
    const limit = Math.min(100, Math.max(1, Number(params.get('limit') ?? 50) || 50))
    const offset = Math.max(0, Math.min(100_000, Number(params.get('offset') ?? 0) || 0))
    const where = status ? { status } : {}
    const [orders, total] = await Promise.all([
      db.order.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        include: {
          customer: { select: { id: true, name: true, phone: true, email: true } },
          items: {
            include: {
              product: { select: { id: true, name: true, imageUrl: true } },
            },
          },
        },
      }),
      db.order.count({ where }),
    ])
    return NextResponse.json({ orders, total, limit, offset }, {
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch (error) {
    console.error('Error fetching orders:', error)
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const originError = verifyRequestOrigin(request)
  if (originError) return originError
  const sourceAddress = request.headers.get('x-real-ip') ??
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    'unknown'
  const sourceKey = createHash('sha256').update(sourceAddress).digest('hex')
  try {
    if (await isRateLimited(`public-order:${sourceKey}`, 10, 15 * 60)) {
      return NextResponse.json({ error: 'Demasiados pedidos. Intentá nuevamente más tarde.' }, { status: 429 })
    }
  } catch (error) {
    console.error('Order rate-limit service error:', error)
    return NextResponse.json({ error: 'La creación de pedidos no está disponible temporalmente' }, { status: 503 })
  }

  try {
    const input = orderSchema.parse(await request.json())
    const quantities = new Map<string, number>()
    for (const item of input.items) {
      quantities.set(item.productId, (quantities.get(item.productId) ?? 0) + item.quantity)
    }

    const order = await db.$transaction(async (tx) => {
      const now = new Date()
      await lockProductRows(tx, [...quantities.keys()])
      const products = await tx.product.findMany({
        where: { id: { in: [...quantities.keys()] }, active: true },
        select: {
          id: true,
          name: true,
          price: true,
          promoPrice: true,
          stock: true,
          talle: true,
        },
      })
      if (products.length !== quantities.size) {
        throw new OrderInputError('One or more products are unavailable')
      }
      const reservations = await getActiveReservedQuantities(tx, [...quantities.keys()], now)
      const productsById = new Map(products.map((product) => [product.id, product]))
      for (const [productId, quantity] of quantities) {
        const product = productsById.get(productId)
        if (!product || !canConfirmOrderStock(
          product.stock,
          reservations.get(productId) ?? 0,
          quantity
        )) {
          throw new OrderInputError('Requested quantity is unavailable')
        }
      }

      const { items, total } = calculateOrderSnapshot(input.items, products)
      return tx.order.create({
        data: {
          customerId: null,
          customerName: input.customerName ?? null,
          customerPhone: input.customerPhone ?? null,
          total,
          notes: input.notes ?? null,
          source: 'whatsapp',
          status: 'pending',
          stockReservedUntil: getStockReservationExpiry(now),
          items: { create: items },
        },
        include: {
          customer: true,
          items: { include: { product: { select: { id: true, name: true, imageUrl: true } } } },
        },
      })
    })
    return NextResponse.json(order, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError || error instanceof SyntaxError) {
      return NextResponse.json({ error: 'Invalid order data' }, { status: 400 })
    }
    if (error instanceof OrderInputError) {
      return NextResponse.json({ error: error.message }, { status: 409 })
    }
    console.error('Error creating order:', error)
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 })
  }
}

class OrderInputError extends Error {}
