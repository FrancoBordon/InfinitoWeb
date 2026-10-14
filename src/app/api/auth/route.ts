import { createHash } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { databaseUnavailableResponse } from '@/lib/database-errors'
import {
  clearAdminSessionCookie,
  createAdminSession,
  requireAdmin,
  setAdminSessionCookie,
  verifyRequestOrigin,
} from '@/lib/api-security'
import { clearLoginAttempts, isLoginRateLimited } from '@/lib/login-rate-limit'
import { hashPassword, verifyPassword } from '@/lib/password-security'

const loginSchema = z.object({
  email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
  password: z.string().min(1).max(1024),
})

function attemptKey(value: string): string {
  return createHash('sha256').update(value).digest('hex')
}

export async function POST(request: NextRequest) {
  if (
    process.env.NODE_ENV === 'production' &&
    (!process.env.SESSION_SECRET || Buffer.byteLength(process.env.SESSION_SECRET) < 32)
  ) {
    return NextResponse.json({ error: 'Authentication is not configured' }, { status: 500 })
  }

  const originError = verifyRequestOrigin(request)
  if (originError) return originError

  let input: z.infer<typeof loginSchema>
  try {
    input = loginSchema.parse(await request.json())
  } catch {
    return NextResponse.json({ ok: false, error: 'Correo o contraseña inválidos' }, { status: 400 })
  }

  const ip = request.headers.get('x-real-ip') ?? request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const emailKey = `admin-login:email:${attemptKey(input.email)}`
  const addressKey = `admin-login:address:${attemptKey(ip)}`
  try {
    const emailLimited = await isLoginRateLimited(emailKey)
    const addressLimited = await isLoginRateLimited(addressKey)
    if (emailLimited || addressLimited) {
      return NextResponse.json({ ok: false, error: 'Demasiados intentos. Intentá nuevamente más tarde.' }, { status: 429 })
    }
  } catch (error) {
    console.error('Login rate-limit service error:', error)
    return NextResponse.json({ ok: false, error: 'El inicio de sesión no está disponible temporalmente' }, { status: 503 })
  }

  try {
    const admin = await db.admin.findUnique({ where: { email: input.email } })
    if (!admin) {
      await hashPassword(input.password)
      return NextResponse.json({ ok: false, error: 'Correo o contraseña incorrectos' }, { status: 401 })
    }

    const verification = await verifyPassword(input.password, admin.password)
    if (!verification.valid) {
      return NextResponse.json({ ok: false, error: 'Correo o contraseña incorrectos' }, { status: 401 })
    }

    if (verification.needsRehash) {
      await db.admin.update({
        where: { id: admin.id },
        data: { password: await hashPassword(input.password) },
      })
    }

    await Promise.all([clearLoginAttempts(emailKey), clearLoginAttempts(addressKey)])
    const response = NextResponse.json({
      ok: true,
      user: { id: admin.id, email: admin.email, name: admin.name },
      message: 'Sesión iniciada correctamente',
    })
    setAdminSessionCookie(response, createAdminSession(admin))
    response.headers.set('Cache-Control', 'no-store')
    return response
  } catch (error) {
    const databaseErrorResponse = databaseUnavailableResponse(error)
    if (databaseErrorResponse) return databaseErrorResponse
    console.error('Admin login error:', error)
    return NextResponse.json({ ok: false, error: 'Error al iniciar sesión' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  const auth = requireAdmin(request)
  if (!auth.ok) return auth.response
  return NextResponse.json({
    ok: true,
    user: { id: auth.session.adminId, email: auth.session.email },
  }, { headers: { 'Cache-Control': 'no-store' } })
}

export async function DELETE(request: NextRequest) {
  const originError = verifyRequestOrigin(request)
  if (originError) return originError
  const response = NextResponse.json({ ok: true })
  clearAdminSessionCookie(response)
  response.headers.set('Cache-Control', 'no-store')
  return response
}
