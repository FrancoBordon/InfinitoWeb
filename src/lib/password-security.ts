import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'crypto'

const SCRYPT_OPTIONS = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }

function deriveScrypt(password: string, salt: Buffer, keyLength: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCallback(password, salt, keyLength, SCRYPT_OPTIONS, (error, derived) => {
      if (error) reject(error)
      else resolve(derived)
    })
  })
}

function legacyDjb2(value: string): string {
  let hash = 5381
  for (let i = 0; i < value.length; i++) {
    hash = ((hash << 5) + hash + value.charCodeAt(i)) & 0xffffffff
  }
  return (hash >>> 0).toString(16).padStart(8, '0')
}

function constantTimeEqual(actual: string, expected: string): boolean {
  const actualBuffer = Buffer.from(actual)
  const expectedBuffer = Buffer.from(expected)
  return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer)
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16)
  const derived = await deriveScrypt(password, salt, 64)
  return `scrypt$${salt.toString('base64url')}$${derived.toString('base64url')}`
}

export async function verifyPassword(
  password: string,
  stored: string
): Promise<{ valid: boolean; needsRehash: boolean }> {
  const [scheme, saltValue, digestValue, extra] = stored.split('$')
  if (scheme === 'scrypt' && saltValue && digestValue && extra === undefined) {
    try {
      const salt = Buffer.from(saltValue, 'base64url')
      const digest = Buffer.from(digestValue, 'base64url')
      if (salt.length !== 16 || digest.length !== 64) return { valid: false, needsRehash: false }
      const candidate = await deriveScrypt(password, salt, digest.length)
      return { valid: timingSafeEqual(candidate, digest), needsRehash: false }
    } catch {
      return { valid: false, needsRehash: false }
    }
  }

  const separator = stored.indexOf(':')
  if (separator < 1) {
    await deriveScrypt(password, randomBytes(16), 64)
    return { valid: false, needsRehash: false }
  }
  const salt = stored.slice(0, separator)
  const expected = stored.slice(separator + 1)
  const oneRound = legacyDjb2(`${salt}:${password}`)
  const matchesOneRound = constantTimeEqual(oneRound, expected)

  let repeated = oneRound
  for (let i = 0; i < 3; i++) {
    repeated = legacyDjb2(`${repeated}:${salt}:${password}:${i}`)
  }
  const matchesRepeated = constantTimeEqual(repeated, expected)
  const legacyValid = matchesOneRound || matchesRepeated
  await deriveScrypt(password, randomBytes(16), 64)
  return { valid: legacyValid, needsRehash: legacyValid }
}
