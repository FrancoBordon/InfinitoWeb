import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// POST /api/auth - Login with email and password
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const email = String(body.email || '').toLowerCase().trim()
    const password = String(body.password || '')

    if (!email || !password) {
      return NextResponse.json({ ok: false, error: 'Correo y contraseña son obligatorios' })
    }

    const admin = await db.admin.findUnique({
      where: { email },
    })

    if (!admin) {
      return NextResponse.json({ ok: false, error: 'Correo o contraseña incorrectos' })
    }

    // Password stored as salt:hash - verify
    const colonIdx = admin.password.indexOf(':')
    if (colonIdx < 1) {
      return NextResponse.json({ ok: false, error: 'Correo o contraseña incorrectos' })
    }
    const salt = admin.password.substring(0, colonIdx)
    const expected = admin.password.substring(colonIdx + 1)

    // djb2 hash - compute the same way as when seeding
    const input = salt + ':' + password
    let h = 5381
    for (let i = 0; i < input.length; i++) {
      h = ((h << 5) + h + input.charCodeAt(i)) & 0xffffffff
    }
    let r = (h >>> 0).toString(16).padStart(8, '0')

    if (r !== expected) {
      return NextResponse.json({ ok: false, error: 'Correo o contraseña incorrectos' })
    }

    return NextResponse.json({
      ok: true,
      user: { id: admin.id, email: admin.email, name: admin.name },
      message: 'Sesión iniciada correctamente',
    })
  } catch (err) {
    return NextResponse.json({ ok: false, error: 'Error al iniciar sesión' })
  }
}

// GET /api/auth - Check if any admin exists
export async function GET() {
  try {
    const count = await db.admin.count()
    return NextResponse.json({ hasAdmin: count > 0 })
  } catch {
    return NextResponse.json({ hasAdmin: false })
  }
}
