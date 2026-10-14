import { PrismaClient } from '@prisma/client'
import { DatabaseConfigurationError } from '@/lib/database-errors'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function getPrismaClient(): PrismaClient {
  if (!process.env.DATABASE_URL?.trim()) {
    throw new DatabaseConfigurationError()
  }

  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = new PrismaClient({ log: [] })
  }

  return globalForPrisma.prisma
}

export const db = new Proxy({} as PrismaClient, {
  get(_target, property) {
    const client = getPrismaClient()
    const value = Reflect.get(client, property, client)
    return typeof value === 'function' ? value.bind(client) : value
  },
})