import { createHmac, timingSafeEqual } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'

export const ADMIN_SESSION_COOKIE = 'infinito_admin_session'
const SESSION_TTL_SECONDS = 60 * 60 * 8

type AdminSession = {
  adminId: string
  email: string
  role: 'admin'
  exp: number
}

type AdminResult =
  | { ok: true; session: AdminSession }
  | { ok: false; response: NextResponse }

function getSessionSecret(): string | null {
  const secret = process.env.SESSION_SECRET
  return secret && Buffer.byteLength(secret) >= 32 ? secret : null
}

function sign(value: string, secret: string): string {
  return createHmac('sha256', secret).update(value).digest('base64url')
}

export function createAdminSession(admin: { id: string; email: string }): string {
  const secret = getSessionSecret()
  if (!secret) throw new Error('SESSION_SECRET must contain at least 32 bytes')

  const payload: AdminSession = {
    adminId: admin.id,
    email: admin.email,
    role: 'admin',
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
  }
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url')
  return `${encoded}.${sign(encoded, secret)}`
}

export function setAdminSessionCookie(response: NextResponse, token: string): void {
  response.cookies.set(ADMIN_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  })
}

export function clearAdminSessionCookie(response: NextResponse): void {
  response.cookies.set(ADMIN_SESSION_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  })
}

export function requireAdmin(request: NextRequest): AdminResult {
  const token = request.cookies.get(ADMIN_SESSION_COOKIE)?.value
  if (!token) {
    return { ok: false, response: NextResponse.json({ error: 'Authentication required' }, { status: 401 }) }
  }

  const secret = getSessionSecret()
  if (!secret) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Authentication is not configured' }, { status: 500 }),
    }
  }

  const [encoded, suppliedSignature, extra] = token.split('.')
  if (!encoded || !suppliedSignature || extra !== undefined) {
    return { ok: false, response: NextResponse.json({ error: 'Authentication required' }, { status: 401 }) }
  }

  const expectedSignature = sign(encoded, secret)
  const supplied = Buffer.from(suppliedSignature)
  const expected = Buffer.from(expectedSignature)
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) {
    return { ok: false, response: NextResponse.json({ error: 'Authentication required' }, { status: 401 }) }
  }

  try {
    const session = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as AdminSession
    if (
      session.role !== 'admin' ||
      typeof session.adminId !== 'string' ||
      typeof session.email !== 'string' ||
      typeof session.exp !== 'number' ||
      session.exp <= Math.floor(Date.now() / 1000)
    ) {
      return { ok: false, response: NextResponse.json({ error: 'Authentication required' }, { status: 401 }) }
    }
    return { ok: true, session }
  } catch {
    return { ok: false, response: NextResponse.json({ error: 'Authentication required' }, { status: 401 }) }
  }
}

export function verifyRequestOrigin(request: NextRequest): NextResponse | null {
  const originHeader = request.headers.get('origin')
  if (!originHeader) {
    return NextResponse.json({ error: 'Request origin is required' }, { status: 403 })
  }

  let origin: URL
  try {
    origin = new URL(originHeader)
  } catch {
    return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 })
  }

  const configuredOrigin = process.env.APP_ORIGIN ?? process.env.NEXT_PUBLIC_APP_URL
  const allowedOrigins = new Set<string>([request.nextUrl.origin])
  if (configuredOrigin) {
    try {
      allowedOrigins.add(new URL(configuredOrigin).origin)
    } catch {
      return NextResponse.json({ error: 'APP_ORIGIN must be a valid URL' }, { status: 500 })
    }
  }
  if (process.env.VERCEL_URL) {
    allowedOrigins.add(`https://${process.env.VERCEL_URL}`)
  }

  if (!allowedOrigins.has(origin.origin)) {
    return NextResponse.json({ error: 'Request origin is not allowed' }, { status: 403 })
  }
  return null
}

export function adminMutationFailure(request: NextRequest): NextResponse | null {
  const auth = requireAdmin(request)
  if (!auth.ok) return auth.response
  return verifyRequestOrigin(request)
}
