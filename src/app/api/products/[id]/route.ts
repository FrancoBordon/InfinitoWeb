import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/products/[id] - Get a single product
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const product = await db.product.findUnique({
      where: { id },
    })

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }

    // Parse images JSON string to array
    const parsedProduct = {
      ...product,
      images: product.images ? JSON.parse(product.images) : [],
    }

    return NextResponse.json(parsedProduct)
  } catch (error) {
    console.error('Error fetching product:', error)
    return NextResponse.json(
      { error: 'Failed to fetch product' },
      { status: 500 }
    )
  }
}

// PUT /api/products/[id] - Update a product
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { name, description, category, price, costPrice, promoPrice, imageUrl, images, stock, talle, active } = body

    // Check if product exists
    const existing = await db.product.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }

    const product = await db.product.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(category !== undefined && { category }),
        ...(price !== undefined && { price: Number(price) }),
        ...(costPrice !== undefined && { costPrice: Number(costPrice) }),
        ...(promoPrice !== undefined && { promoPrice: promoPrice ? Number(promoPrice) : null }),
        ...(imageUrl !== undefined && { imageUrl }),
        ...(images !== undefined && { images: JSON.stringify(images) }),
        ...(stock !== undefined && { stock: Number(stock) }),
        ...(talle !== undefined && { talle }),
        ...(active !== undefined && { active }),
      },
    })

    // Parse images for the response
    const parsedProduct = {
      ...product,
      images: product.images ? JSON.parse(product.images) : [],
    }

    return NextResponse.json(parsedProduct)
  } catch (error) {
    console.error('Error updating product:', error)
    return NextResponse.json(
      { error: 'Failed to update product' },
      { status: 500 }
    )
  }
}

// DELETE /api/products/[id] - Hard delete a product
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Check if product exists
    const existing = await db.product.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }

    // Hard delete - remove product and its order items
    await db.orderItem.deleteMany({ where: { productId: id } })
    await db.product.delete({ where: { id } })

    return NextResponse.json({ success: true, id })
  } catch (error) {
    console.error('Error deleting product:', error)
    return NextResponse.json(
      { error: 'Failed to delete product' },
      { status: 500 }
    )
  }
}
