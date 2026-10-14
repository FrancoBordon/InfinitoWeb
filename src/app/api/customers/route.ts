import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { databaseUnavailableResponse } from '@/lib/database-errors'
import { adminMutationFailure, requireAdmin } from '@/lib/api-security'

const customerFields = {
  name: z.string().trim().min(1).max(200),
  phone: z.string().trim().min(1).max(50),
  email: z.string().email().max(254).nullable().optional(),
  address: z.string().max(1000).nullable().optional(),
  notes: z.string().max(5000).nullable().optional(),
  tags: z.string().max(500).nullable().optional(),
}
const createSchema = z.object(customerFields).strict()

export async function GET(request: NextRequest) {
  const auth = requireAdmin(request)
  if (!auth.ok) return auth.response
  try {
    const search = request.nextUrl.searchParams.get('search')?.trim().slice(0, 100)
    const customers = await db.customer.findMany({
      where: search ? {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ],
      } : {},
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { orders: true } } },
    })
    return NextResponse.json(customers.map((customer) => ({
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      email: customer.email,
      address: customer.address,
      notes: customer.notes,
      tags: customer.tags,
      orderCount: customer._count.orders,
      createdAt: customer.createdAt,
      updatedAt: customer.updatedAt,
    })), { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    const databaseErrorResponse = databaseUnavailableResponse(error)
    if (databaseErrorResponse) return databaseErrorResponse
    console.error('Error fetching customers:', error)
    return NextResponse.json({ error: 'Failed to fetch customers' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const authError = adminMutationFailure(request)
  if (authError) return authError
  try {
    const input = createSchema.parse(await request.json())
    const customer = await db.customer.create({
      data: {
        ...input,
        email: input.email ?? null,
        address: input.address ?? null,
        notes: input.notes ?? null,
        tags: input.tags ?? null,
      },
    })
    return NextResponse.json(customer, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError || error instanceof SyntaxError) {
      return NextResponse.json({ error: 'Invalid customer data' }, { status: 400 })
    }
    const databaseErrorResponse = databaseUnavailableResponse(error)
    if (databaseErrorResponse) return databaseErrorResponse
    console.error('Error creating customer:', error)
    return NextResponse.json({ error: 'Failed to create customer' }, { status: 500 })
  }
}
