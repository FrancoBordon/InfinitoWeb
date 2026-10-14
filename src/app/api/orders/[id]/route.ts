import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { adminMutationFailure, requireAdmin } from '@/lib/api-security'
import {
  aggregateOrderQuantities,
  canConfirmOrderStock,
  canTransitionOrderStatus,
  getActiveReservedQuantities,
  lockProductRows,
  StockReservationError,
} from '@/lib/stock-reservations'

const updateSchema = z.object({
  status: z.enum(['pending', 'confirmed', 'shipped', 'delivered', 'cancelled']).optional(),
  notes: z.string().max(2000).nullable().optional(),
}).strict().refine((value) => Object.keys(value).length > 0, 'At least one field is required')

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireAdmin(request)
  if (!auth.ok) return auth.response
  try {
    const { id } = await params
    const order = await db.order.findUnique({
      where: { id },
      include: {
        customer: { select: { id: true, name: true, phone: true, email: true, address: true } },
        items: {
          include: {
            product: { select: { id: true, name: true, imageUrl: true, category: true } },
          },
        },
      },
    })
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    return NextResponse.json(order, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('Error fetching order:', error)
    return NextResponse.json({ error: 'Failed to fetch order' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = adminMutationFailure(request)
  if (authError) return authError
  try {
    const { id } = await params
    const data = updateSchema.parse(await request.json())
    const order = await db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "Order" WHERE "id" = ${id} FOR UPDATE`
      const current = await tx.order.findUnique({
        where: { id },
        include: { items: { select: { productId: true, quantity: true } } },
      })
      if (!current) return tx.order.update({ where: { id }, data })

      const nextStatus = data.status ?? current.status
      const statusChanged = nextStatus !== current.status
      if (statusChanged && !canTransitionOrderStatus(current.status, nextStatus)) {
        throw new OrderStatusTransitionError('El cambio de estado solicitado no está permitido')
      }

      if (current.status === 'pending' && nextStatus === 'confirmed') {
        const quantities = aggregateOrderQuantities(current.items)
        const productIds = [...quantities.keys()]
        await lockProductRows(tx, productIds)
        const products = await tx.product.findMany({
          where: { id: { in: productIds } },
          select: { id: true, stock: true },
        })
        const productsById = new Map(products.map((product) => [product.id, product]))
        const reservations = await getActiveReservedQuantities(tx, productIds, new Date(), id)

        for (const [productId, quantity] of quantities) {
          const product = productsById.get(productId)
          if (!product || !canConfirmOrderStock(
            product.stock,
            reservations.get(productId) ?? 0,
            quantity
          )) {
            throw new StockReservationError('Stock insuficiente para confirmar este pedido')
          }
        }

        for (const [productId, quantity] of quantities) {
          await tx.product.update({
            where: { id: productId },
            data: { stock: { decrement: quantity } },
          })
        }
      }

      return tx.order.update({
        where: { id },
        data: {
          ...data,
          ...(current.status === 'pending' && nextStatus !== 'pending'
            ? { stockReservedUntil: null }
            : {}),
        },
        include: {
          customer: { select: { id: true, name: true, phone: true, email: true } },
          items: true,
        },
      })
    })
    return NextResponse.json(order)
  } catch (error) {
    if (error instanceof z.ZodError || error instanceof SyntaxError) {
      return NextResponse.json({ error: 'Invalid order data' }, { status: 400 })
    }
    if (error instanceof OrderStatusTransitionError || error instanceof StockReservationError) {
      return NextResponse.json({ error: error.message }, { status: 409 })
    }
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2025') {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }
    console.error('Error updating order:', error)
    return NextResponse.json({ error: 'Failed to update order' }, { status: 500 })
  }
}

class OrderStatusTransitionError extends Error {}
