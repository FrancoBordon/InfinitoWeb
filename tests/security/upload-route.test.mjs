import assert from 'node:assert/strict'
import { request as httpRequest, createServer } from 'node:http'
import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { createHmac } from 'node:crypto'
import { resolve } from 'node:path'
import { test } from 'node:test'
import { deflateSync } from 'node:zlib'

const sessionSecret = 'integration-test-secret-at-least-32-bytes'
process.env.SESSION_SECRET = sessionSecret
const sessionCookieName = 'infinito_admin_session'

function createSignedSessionCookie(
  role = 'admin',
  expiresAt = Math.floor(Date.now() / 1000) + 60 * 60,
  adminId = 'upload-admin',
) {
  const payload = Buffer.from(JSON.stringify({
    adminId,
    email: 'admin@example.test',
    role,
    exp: expiresAt,
  })).toString('base64url')
  const signature = createHmac('sha256', sessionSecret).update(payload).digest('base64url')
  return `${sessionCookieName}=${payload}.${signature}`
}

function postChunked(origin, cookie, body) {
  const url = new URL('/api/upload', origin)
  return new Promise((resolveResponse, reject) => {
    const request = httpRequest(url, {
      method: 'POST',
      headers: {
        origin,
        cookie,
        'content-type': 'multipart/form-data; boundary=upload-test-boundary',
      },
    }, (response) => {
      const chunks = []
      response.on('data', (chunk) => chunks.push(chunk))
      response.on('end', () => resolveResponse({
        status: response.statusCode,
        body: Buffer.concat(chunks).toString(),
      }))
    })
    request.on('error', reject)
    request.end(body)
  })
}

function crc32(bytes) {
  let crc = 0xffffffff
  for (const byte of bytes) {
    crc ^= byte
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1))
  }
  return (crc ^ 0xffffffff) >>> 0
}

function pngChunk(type, content) {
  const chunk = Buffer.alloc(12 + content.length)
  chunk.writeUInt32BE(content.length, 0)
  chunk.write(type, 4)
  content.copy(chunk, 8)
  chunk.writeUInt32BE(crc32(chunk.subarray(4, 8 + content.length)), 8 + content.length)
  return chunk
}

function onePixelPng() {
  const header = Buffer.alloc(13)
  header.writeUInt32BE(1, 0)
  header.writeUInt32BE(1, 4)
  header[8] = 8
  header[9] = 6
  const data = deflateSync(Buffer.from([0, 255, 0, 0, 255]))
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk('IHDR', header),
    pngChunk('IDAT', data),
    pngChunk('IEND', Buffer.alloc(0)),
  ])
}

async function listen(server) {
  server.listen(0, '127.0.0.1')
  await once(server, 'listening')
  return server.address().port
}

async function waitForApp(origin, child, getLogs) {
  const deadline = Date.now() + 120_000
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`Next.js exited early:\n${getLogs()}`)
    try {
      const response = await fetch(`${origin}/api/health`)
      if (response.ok) return
    } catch {}
    await new Promise((resolveWait) => setTimeout(resolveWait, 500))
  }
  throw new Error(`Next.js did not become ready:\n${getLogs()}`)
}

test('upload API protects product and category image uploads end to end', { timeout: 180_000 }, async (t) => {
  const uploads = []
  const cleanupRequests = []
  let failUploadNumber = 0
  let uploadAttempt = 0
  const storageServer = createServer(async (request, response) => {
    const body = []
    for await (const chunk of request) body.push(chunk)
    if (request.method === 'DELETE') {
      cleanupRequests.push(JSON.parse(Buffer.concat(body).toString()).prefixes)
      response.writeHead(200, { 'Content-Type': 'application/json' })
      response.end('[]')
      return
    }
    uploads.push({
      url: request.url,
      apiKey: request.headers.apikey,
      upsert: request.headers['x-upsert'],
      body: Buffer.concat(body),
    })
    uploadAttempt += 1
    if (uploadAttempt === failUploadNumber) {
      response.writeHead(500, { 'Content-Type': 'application/json' })
      response.end(JSON.stringify({ statusCode: 500, error: 'test failure', message: 'simulated upload failure' }))
      return
    }
    response.writeHead(200, { 'Content-Type': 'application/json' })
    response.end(JSON.stringify({ Key: request.url, Id: 'test-object' }))
  })
  const storagePort = await listen(storageServer)

  const probe = createServer()
  const appPort = await listen(probe)
  await new Promise((resolveClose, reject) => probe.close((error) => error ? reject(error) : resolveClose()))
  const origin = `http://127.0.0.1:${appPort}`
  const logs = []
  const nextBin = resolve('node_modules/next/dist/bin/next')
  const childEnv = {}
  for (const key of [
    'PATH', 'Path', 'SystemRoot', 'SYSTEMROOT', 'TEMP', 'TMP', 'USERPROFILE',
    'APPDATA', 'LOCALAPPDATA', 'PATHEXT', 'ComSpec',
  ]) {
    if (process.env[key]) childEnv[key] = process.env[key]
  }
  const app = spawn(process.execPath, [nextBin, 'dev', '-p', String(appPort)], {
    cwd: process.cwd(),
    env: {
      ...childEnv,
      NODE_ENV: 'development',
      NEXT_TELEMETRY_DISABLED: '1',
      DATABASE_URL: 'postgresql://audit:local-only@127.0.0.1:55432/infinito_audit',
      DIRECT_URL: 'postgresql://audit:local-only@127.0.0.1:55432/infinito_audit',
      SESSION_SECRET: sessionSecret,
      APP_ORIGIN: origin,
      UPSTASH_REDIS_REST_URL: '',
      UPSTASH_REDIS_REST_TOKEN: '',
      NEXT_PUBLIC_SUPABASE_URL: `http://127.0.0.1:${storagePort}`,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
      SUPABASE_SERVICE_ROLE_KEY: 'test-server-service-key',
      VERCEL_URL: '',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  app.stdout.on('data', (chunk) => logs.push(chunk.toString()))
  app.stderr.on('data', (chunk) => logs.push(chunk.toString()))
  const getLogs = () => logs.join('')

  t.after(async () => {
    app.kill()
    await new Promise((resolveClose) => storageServer.close(resolveClose))
  })

  await waitForApp(origin, app, getLogs)
  const adminCookie = createSignedSessionCookie()

  const createForm = (purpose, filename = 'image.png', bytes = onePixelPng(), mime = 'image/png') => {
    const form = new FormData()
    form.set('purpose', purpose)
    form.append('files', new Blob([bytes], { type: mime }), filename)
    return form
  }
  const sendUpload = (form, headers = {}) => fetch(`${origin}/api/upload`, {
    method: 'POST',
    headers: { origin, ...headers },
    body: form,
  })

  const anonymous = await sendUpload(createForm('product'), { origin })
  assert.equal(anonymous.status, 401)
  assert.equal(uploads.length, 0)
  for (const invalidCookie of [
    createSignedSessionCookie('customer'),
    createSignedSessionCookie('admin', Math.floor(Date.now() / 1000) - 1),
    createSignedSessionCookie('admin', Math.floor(Date.now() / 1000) + 60 * 60, ''),
  ]) {
    assert.equal((await sendUpload(createForm('product'), { cookie: invalidCookie })).status, 401)
  }
  const validCookie = createSignedSessionCookie()
  const [cookieName, token] = validCookie.split('=')
  const [payload, signature] = token.split('.')
  const alteredSignature = `${signature[0] === 'A' ? 'B' : 'A'}${signature.slice(1)}`
  assert.equal((await sendUpload(createForm('product'), { cookie: `${cookieName}=${payload}.${alteredSignature}` })).status, 401)
  for (const [url, method, body] of [
    ['/api/auth', 'GET'],
    ['/api/customers', 'GET'],
    ['/api/customers', 'POST', '{}'],
    ['/api/customers/customer-id', 'GET'],
    ['/api/customers/customer-id', 'PUT', '{}'],
    ['/api/customers/customer-id', 'DELETE'],
    ['/api/orders', 'GET'],
    ['/api/orders/order-id', 'GET'],
    ['/api/orders/order-id', 'PUT', '{"status":"confirmed"}'],
    ['/api/products', 'POST', '{}'],
    ['/api/products?includeInactive=true', 'GET'],
    ['/api/products/product-id', 'PUT', '{}'],
    ['/api/products/product-id', 'DELETE'],
    ['/api/categories', 'POST', '{}'],
    ['/api/categories?includeInactive=true', 'GET'],
    ['/api/categories', 'PUT', '{"id":"category-id","active":false}'],
    ['/api/categories/category-id', 'DELETE'],
  ]) {
    const response = await fetch(`${origin}${url}`, {
      method,
      headers: { origin, ...(body ? { 'content-type': 'application/json' } : {}) },
      ...(body ? { body } : {}),
    })
    assert.equal(response.status, 401, `${method} ${url}`)
  }
  assert.equal((await fetch(`${origin}/api/seed`, {
    method: 'POST',
    headers: { origin },
  })).status, 410)
  assert.equal((await fetch(`${origin}/api/migrate`, {
    method: 'POST',
    headers: { origin },
  })).status, 410)
  assert.equal((await fetch(`${origin}/api/orders`, {
    method: 'POST',
    headers: { origin: 'https://attacker.example', 'content-type': 'application/json' },
    body: '{}',
  })).status, 403)
  assert.equal((await fetch(`${origin}/api/orders`, {
    method: 'POST',
    headers: { origin, 'content-type': 'application/json' },
    body: '{}',
  })).status, 400)

  const wrongOrigin = await sendUpload(createForm('product'), {
    origin: 'https://attacker.example',
    cookie: adminCookie,
  })
  assert.equal(wrongOrigin.status, 403)

  const spoofedContent = await sendUpload(
    createForm('product', 'fake.png', Buffer.from('<script>alert(1)</script>')),
    { cookie: adminCookie }
  )
  assert.equal(spoofedContent.status, 400)
  const mismatchedExtension = await sendUpload(
    createForm('product', 'image.jpg', onePixelPng()),
    { cookie: adminCookie }
  )
  assert.equal(mismatchedExtension.status, 400)
  const tooLarge = await sendUpload(
    createForm('product', 'large.png', Buffer.alloc(4 * 1024 * 1024 + 1), 'image/png'),
    { cookie: adminCookie }
  )
  assert.equal(tooLarge.status, 413)

  const tooManyFiles = new FormData()
  tooManyFiles.set('purpose', 'product')
  for (let index = 0; index < 6; index += 1) {
    tooManyFiles.append('files', new Blob([onePixelPng()], { type: 'image/png' }), `${index}.png`)
  }
  assert.equal((await sendUpload(tooManyFiles, { cookie: adminCookie })).status, 400)

  const chunkedBody = Buffer.concat([
    Buffer.from('--upload-test-boundary\r\nContent-Disposition: form-data; name="purpose"\r\n\r\nproduct\r\n'),
    Buffer.from('--upload-test-boundary\r\nContent-Disposition: form-data; name="files"; filename="large.png"\r\nContent-Type: image/png\r\n\r\n'),
    Buffer.alloc(4_400_000),
    Buffer.from('\r\n--upload-test-boundary--\r\n'),
  ])
  const chunkedResponse = await postChunked(origin, adminCookie, chunkedBody)
  assert.equal(chunkedResponse.status, 413, chunkedResponse.body)

  const productResponse = await sendUpload(createForm('product'), { cookie: adminCookie })
  assert.equal(productResponse.status, 200, getLogs())
  const productResult = await productResponse.json()
  assert.equal(productResult.imageUrls.length, 1)
  assert.match(productResult.imageUrls[0], /\/storage\/v1\/object\/public\/productos\/products\/[0-9a-f-]+\.png$/)

  const categoryResponse = await sendUpload(createForm('category'), { cookie: adminCookie })
  assert.equal(categoryResponse.status, 200, getLogs())
  const categoryResult = await categoryResponse.json()
  assert.match(categoryResult.imageUrls[0], /\/storage\/v1\/object\/public\/productos\/categories\/[0-9a-f-]+\.png$/)

  assert.equal(uploads.length, 2)
  assert.ok(uploads.every((upload) => upload.apiKey === 'test-server-service-key'))
  assert.ok(uploads.every((upload) => upload.upsert === 'false'))
  assert.notEqual(uploads[0].url, uploads[1].url)
  assert.ok(uploads.every((upload) => /\/storage\/v1\/object\/productos\/(?:products|categories)\/[0-9a-f-]+\.(?:png|jpe?g|gif|webp|bmp)$/.test(upload.url)))

  const failedBatch = new FormData()
  failedBatch.set('purpose', 'product')
  failedBatch.append('files', new Blob([onePixelPng()], { type: 'image/png' }), 'first.png')
  failedBatch.append('files', new Blob([onePixelPng()], { type: 'image/png' }), 'second.png')
  failUploadNumber = uploadAttempt + 2
  assert.equal((await sendUpload(failedBatch, { cookie: adminCookie })).status, 502)
  assert.equal(cleanupRequests.length, 1)
  const createdByFailedBatch = uploads.slice(-2).map((upload) => upload.url.split('/productos/')[1])
  assert.deepEqual(cleanupRequests[0], [createdByFailedBatch[0]])
  assert.match(cleanupRequests[0][0], /^products\/[0-9a-f-]+\.png$/)
})
