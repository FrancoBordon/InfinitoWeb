import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { adminMutationFailure, requireAdmin } from '@/lib/api-security'
import { updateProductSchema } from '@/lib/product-validation'
import { getActiveReservedQuantities, lockProductRows } from '@/lib/stock-reservations'

class ProductStockReservationError extends Error {}

function parseImages(images: string | null): string[] {
  if (!images) return []
  const parsed: unknown = JSON.parse(images)
  return Array.isArray(parsed) && parsed.every((image) => typeof image === 'string') ? parsed : []
}

function productResponse(product: Awaited<ReturnType<typeof db.product.findUnique>>, isAdmin: boolean) {
  if (!product) return null
  const { costPrice, ...publicFields } = product
  return {
    ...(isAdmin ? product : publicFields),
    images: parseImages(product.images),
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const product = await db.product.findUnique({ where: { id } })
    if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 })

    const auth = requireAdmin(request)
    if (!product.active && !auth.ok) return auth.response
    return NextResponse.json(productResponse(product, auth.ok), {
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch (error) {
    console.error('Error fetching product:', error)
    return NextResponse.json({ error: 'Failed to fetch product' }, { status: 500 })
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
    const input = updateProductSchema.parse(await request.json())
    const { images, ...fields } = input
    const requestedStock = fields.stock
    const data = {
      ...fields,
      ...(images !== undefined ? { images: JSON.stringify(images) } : {}),
    }
    const product = requestedStock === undefined
      ? await db.product.update({ where: { id }, data })
      : await db.$transaction(async (tx) => {
        await lockProductRows(tx, [id])
        const existing = await tx.product.findUnique({ where: { id }, select: { id: true } })
        if (!existing) return tx.product.update({ where: { id }, data })
        const now = new Date()
        const reservations = await getActiveReservedQuantities(tx, [id], now)
        if (requestedStock < (reservations.get(id) ?? 0)) {
          throw new ProductStockReservationError('El stock no puede ser menor que las unidades reservadas')
        }
        return tx.product.update({ where: { id }, data })
      })
    return NextResponse.json(productResponse(product, true))
  } catch (error) {
    if (error instanceof z.ZodError || error instanceof SyntaxError) {
      return NextResponse.json({ error: 'Invalid product data' }, { status: 400 })
    }
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2025') {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }
    if (error instanceof ProductStockReservationError) {
      return NextResponse.json({ error: error.message }, { status: 409 })
    }
    console.error('Error updating product:', error)
    return NextResponse.json({ error: 'Failed to update product' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = adminMutationFailure(request)
  if (authError) return authError
  try {
    const { id } = await params
    await db.product.update({ where: { id }, data: { active: false } })
    return NextResponse.json({ success: true, id })
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2025') {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }
    console.error('Error deleting product:', error)
    return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 })
  }
}
