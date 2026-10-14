import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { adminMutationFailure, requireAdmin } from '@/lib/api-security'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const category = await db.category.findUnique({ where: { id } })
    if (!category) return NextResponse.json({ error: 'Category not found' }, { status: 404 })
    if (!category.active) {
      const auth = requireAdmin(request)
      if (!auth.ok) return auth.response
    }
    return NextResponse.json(category, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('Error fetching category:', error)
    return NextResponse.json({ error: 'Failed to fetch category' }, { status: 500 })
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
    await db.category.update({ where: { id }, data: { active: false } })
    return NextResponse.json({ success: true, id })
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2025') {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 })
    }
    console.error('Error deleting category:', error)
    return NextResponse.json({ error: 'Failed to delete category' }, { status: 500 })
  }
}
