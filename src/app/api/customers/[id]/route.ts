import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { adminMutationFailure, requireAdmin } from '@/lib/api-security'

const updateSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  phone: z.string().trim().min(1).max(50).optional(),
  email: z.string().email().max(254).nullable().optional(),
  address: z.string().max(1000).nullable().optional(),
  notes: z.string().max(5000).nullable().optional(),
  tags: z.string().max(500).nullable().optional(),
}).strict().refine((value) => Object.keys(value).length > 0, 'At least one field is required')

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireAdmin(request)
  if (!auth.ok) return auth.response
  try {
    const { id } = await params
    const customer = await db.customer.findUnique({
      where: { id },
      include: { orders: { orderBy: { createdAt: 'desc' }, include: { items: true } } },
    })
    if (!customer) return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    return NextResponse.json(customer, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('Error fetching customer:', error)
    return NextResponse.json({ error: 'Failed to fetch customer' }, { status: 500 })
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
    const customer = await db.customer.update({ where: { id }, data })
    return NextResponse.json(customer)
  } catch (error) {
    if (error instanceof z.ZodError || error instanceof SyntaxError) {
      return NextResponse.json({ error: 'Invalid customer data' }, { status: 400 })
    }
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2025') {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }
    console.error('Error updating customer:', error)
    return NextResponse.json({ error: 'Failed to update customer' }, { status: 500 })
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
    await db.customer.delete({ where: { id } })
    return NextResponse.json({ success: true, id })
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2025') {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }
    console.error('Error deleting customer:', error)
    return NextResponse.json({ error: 'Failed to delete customer' }, { status: 500 })
  }
}
