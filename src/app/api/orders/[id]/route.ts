import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { adminMutationFailure, requireAdmin } from '@/lib/api-security'

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
    const order = await db.order.update({
      where: { id },
      data,
      include: {
        customer: { select: { id: true, name: true, phone: true, email: true } },
        items: true,
      },
    })
    return NextResponse.json(order)
  } catch (error) {
    if (error instanceof z.ZodError || error instanceof SyntaxError) {
      return NextResponse.json({ error: 'Invalid order data' }, { status: 400 })
    }
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2025') {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }
    console.error('Error updating order:', error)
    return NextResponse.json({ error: 'Failed to update order' }, { status: 500 })
  }
}
