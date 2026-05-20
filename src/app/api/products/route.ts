import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/products - List all products with optional filters
// Supports: ?category=joyas&active=true&search=anillo
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const active = searchParams.get('active')
    const search = searchParams.get('search')

    const where: Record<string, unknown> = {}

    if (category) {
      where.category = category
    }

    if (active === 'true') {
      where.active = true
    } else if (active === 'false') {
      where.active = false
    }

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { description: { contains: search } },
      ]
    }

    const products = await db.product.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    })

    // Parse images JSON string to array for each product
    const parsedProducts = products.map((p) => ({
      ...p,
      images: p.images ? JSON.parse(p.images) : [],
    }))

    return NextResponse.json(parsedProducts)
  } catch (error) {
    console.error('Error fetching products:', error)
    return NextResponse.json(
      { error: 'Failed to fetch products' },
      { status: 500 }
    )
  }
}

// POST /api/products - Create a new product
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, description, category, price, costPrice, promoPrice, imageUrl, images, stock, talle } = body

    if (!name) {
      return NextResponse.json(
        { error: 'Product name is required' },
        { status: 400 }
      )
    }

    if (price === undefined || price === null) {
      return NextResponse.json(
        { error: 'Product price is required' },
        { status: 400 }
      )
    }

    const product = await db.product.create({
      data: {
        name,
        description: description || null,
        category: category || 'General',
        price: Number(price),
        costPrice: costPrice ? Number(costPrice) : 0,
        promoPrice: promoPrice ? Number(promoPrice) : null,
        imageUrl: imageUrl || null,
        images: images ? JSON.stringify(images) : "[]",
        stock: stock ? Number(stock) : 0,
        talle: talle || null,
        active: true,
      },
    })

    // Parse images for the response
    const parsedProduct = {
      ...product,
      images: product.images ? JSON.parse(product.images) : [],
    }

    return NextResponse.json(parsedProduct, { status: 201 })
  } catch (error) {
    console.error('Error creating product:', error)
    return NextResponse.json(
      { error: 'Failed to create product' },
      { status: 500 }
    )
  }
}
