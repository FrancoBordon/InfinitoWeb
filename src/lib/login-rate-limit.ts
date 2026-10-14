const WINDOW_SECONDS = 15 * 60
const MAX_ATTEMPTS = 5
const localAttempts = new Map<string, { count: number; expiresAt: number }>()

async function upstashCommand(command: string, key: string, argument?: string): Promise<number> {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) throw new Error('Distributed login rate limiting is not configured')

  const baseUrl = new URL(url)
  if (baseUrl.protocol !== 'https:' || baseUrl.username || baseUrl.password || baseUrl.pathname !== '/') {
    throw new Error('Upstash REST URL must be a credential-free HTTPS origin')
  }
  const suffix = argument ? `/${argument}` : ''
  const response = await fetch(`${baseUrl.origin}/${command}/${encodeURIComponent(key)}${suffix}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  })
  if (!response.ok) throw new Error(`Rate-limit service returned ${response.status}`)
  const result = await response.json() as { result?: number; error?: string }
  if (result.error || typeof result.result !== 'number') {
    throw new Error(result.error ?? 'Invalid rate-limit response')
  }
  return result.result
}

async function increment(key: string): Promise<number> {
  if (process.env.NODE_ENV === 'production') {
    const count = await upstashCommand('incr', key)
    await upstashCommand('expire', key, String(WINDOW_SECONDS))
    return count
  }

  const now = Date.now()
  const current = localAttempts.get(key)
  if (!current || current.expiresAt <= now) {
    localAttempts.set(key, { count: 1, expiresAt: now + WINDOW_SECONDS * 1000 })
    return 1
  }
  current.count += 1
  return current.count
}

export async function isLoginRateLimited(key: string): Promise<boolean> {
  return (await increment(key)) > MAX_ATTEMPTS
}

export async function clearLoginAttempts(key: string): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    await upstashCommand('del', key)
    return
  }
  localAttempts.delete(key)
}
