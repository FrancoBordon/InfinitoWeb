import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { adminMutationFailure, requireAdmin } from '@/lib/api-security'

const categoryFields = {
  name: z.string().trim().min(1).max(100),
  description: z.string().max(2000).nullable().optional(),
  imageUrl: z.string().max(2048).nullable().optional(),
  sortOrder: z.number().int().min(0).max(100_000).optional(),
}
const createSchema = z.object(categoryFields).strict()
const updateSchema = z.object({
  id: z.string().min(1).max(100),
  name: categoryFields.name.optional(),
  description: categoryFields.description,
  imageUrl: categoryFields.imageUrl,
  sortOrder: categoryFields.sortOrder,
  active: z.boolean().optional(),
}).strict().refine(({ id, ...fields }) => Object.keys(fields).length > 0, 'At least one field is required')

export async function GET(request: NextRequest) {
  try {
    const includeInactive = request.nextUrl.searchParams.get('includeInactive') === 'true'
    if (includeInactive) {
      const auth = requireAdmin(request)
      if (!auth.ok) return auth.response
    }
    const categories = await db.category.findMany({
      where: includeInactive ? {} : { active: true },
      orderBy: { sortOrder: 'asc' },
    })
    return NextResponse.json(categories, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('Error fetching categories:', error)
    return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const authError = adminMutationFailure(request)
  if (authError) return authError
  try {
    const input = createSchema.parse(await request.json())
    const category = await db.category.create({
      data: {
        ...input,
        description: input.description ?? null,
        imageUrl: input.imageUrl ?? null,
        sortOrder: input.sortOrder ?? 0,
      },
    })
    return NextResponse.json(category, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError || error instanceof SyntaxError) {
      return NextResponse.json({ error: 'Invalid category data' }, { status: 400 })
    }
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      return NextResponse.json({ error: 'Ya existe una categoría con ese nombre' }, { status: 409 })
    }
    console.error('Error creating category:', error)
    return NextResponse.json({ error: 'Failed to create category' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  const authError = adminMutationFailure(request)
  if (authError) return authError
  try {
    const input = updateSchema.parse(await request.json())
    const { id, ...data } = input
    const category = await db.category.update({ where: { id }, data })
    return NextResponse.json(category)
  } catch (error) {
    if (error instanceof z.ZodError || error instanceof SyntaxError) {
      return NextResponse.json({ error: 'Invalid category data' }, { status: 400 })
    }
    if (error && typeof error === 'object' && 'code' in error) {
      if (error.code === 'P2025') return NextResponse.json({ error: 'Category not found' }, { status: 404 })
      if (error.code === 'P2002') return NextResponse.json({ error: 'Ya existe una categoría con ese nombre' }, { status: 409 })
    }
    console.error('Error updating category:', error)
    return NextResponse.json({ error: 'Failed to update category' }, { status: 500 })
  }
}
