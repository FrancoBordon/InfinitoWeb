import { NextResponse } from 'next/server'

export class DatabaseConfigurationError extends Error {
  constructor() {
    super('DATABASE_URL is not configured')
    this.name = 'DatabaseConfigurationError'
  }
}

export function databaseUnavailableResponse(error: unknown): NextResponse | null {
  if (!(error instanceof DatabaseConfigurationError)) return null

  return NextResponse.json(
    { error: 'Database service is not configured' },
    { status: 503, headers: { 'Cache-Control': 'no-store' } }
  )
}
