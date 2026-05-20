// Shared hash functions for admin authentication
// Pure JS - no crypto or Math.imul (which can crash with Turbopack)

export function simpleHash(str: string): string {
  let hash = 5381
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) & 0xffffffff
  }
  // Convert to hex
  let hex = ''
  let val = hash >>> 0
  for (let i = 0; i < 8; i++) {
    hex = '0123456789abcdef'[val & 0xf] + hex
    val = val >>> 4
  }
  return hex
}

export function hashPassword(password: string, salt: string): string {
  let hash = simpleHash(salt + ':' + password)
  for (let i = 0; i < 3; i++) {
    hash = simpleHash(hash + ':' + salt + ':' + password + ':' + i)
  }
  return hash
}

export function generateSalt(): string {
  const chars = '0123456789abcdef'
  let result = ''
  for (let i = 0; i < 32; i++) {
    result += chars[Math.floor(Math.random() * chars.length)]
  }
  return result
}
