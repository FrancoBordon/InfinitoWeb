import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { adminMutationFailure, requireAdmin } from '@/lib/api-security'
import { createProductSchema } from '@/lib/product-validation'

function parseImages(images: string | null): string[] {
  if (!images) return []
  const parsed: unknown = JSON.parse(images)
  return Array.isArray(parsed) && parsed.every((image) => typeof image === 'string') ? parsed : []
}

function publicProduct(product: Awaited<ReturnType<typeof db.product.findMany>>[number]) {
  const { costPrice: _costPrice, ...publicFields } = product
  return { ...publicFields, images: parseImages(product.images) }
}

function adminProduct(product: Awaited<ReturnType<typeof db.product.findMany>>[number]) {
  return { ...product, images: parseImages(product.images) }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const includeInactive = searchParams.get('includeInactive') === 'true'
    const requestedActive = searchParams.get('active')
    const auth = requireAdmin(request)
    const isAdmin = auth.ok

    if ((includeInactive || requestedActive === 'false') && !isAdmin) {
      return auth.ok ? NextResponse.json({ error: 'Forbidden' }, { status: 403 }) : auth.response
    }

    const search = searchParams.get('search')?.trim().slice(0, 100)
    const products = await db.product.findMany({
      where: {
        ...(!isAdmin ? { active: true } : {}),
        ...(isAdmin && !includeInactive && requestedActive === 'true' ? { active: true } : {}),
        ...(isAdmin && !includeInactive && requestedActive === 'false' ? { active: false } : {}),
        ...(search ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { description: { contains: search, mode: 'insensitive' as const } },
          ],
        } : {}),
        ...(searchParams.get('category') ? { category: searchParams.get('category')! } : {}),
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(
      products.map(isAdmin ? adminProduct : publicProduct),
      { headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (error) {
    console.error('Error fetching products:', error)
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const authError = adminMutationFailure(request)
  if (authError) return authError
  try {
    const input = createProductSchema.parse(await request.json())
    const product = await db.product.create({
      data: {
        ...input,
        description: input.description ?? null,
        category: input.category,
        costPrice: input.costPrice ?? 0,
        promoPrice: input.promoPrice ?? null,
        imageUrl: input.imageUrl ?? null,
        images: JSON.stringify(input.images ?? []),
        stock: input.stock ?? 0,
        talle: input.talle ?? null,
        active: true,
      },
    })
    return NextResponse.json(adminProduct(product), { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError || error instanceof SyntaxError) {
      return NextResponse.json({ error: 'Invalid product data' }, { status: 400 })
    }
    console.error('Error creating product:', error)
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 })
  }
}
