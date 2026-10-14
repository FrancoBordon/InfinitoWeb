import assert from 'node:assert/strict'
import { deflateSync } from 'node:zlib'
import { test } from 'node:test'
import { validateImageFile } from '../../src/lib/image-validation.ts'

function crc32(bytes) {
  let crc = 0xffffffff
  for (const byte of bytes) {
    crc ^= byte
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1))
    }
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
  const imageData = deflateSync(Buffer.from([0, 255, 0, 0, 255]))
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk('IHDR', header),
    pngChunk('IDAT', imageData),
    pngChunk('IEND', Buffer.alloc(0)),
  ])
}

function onePixelJpeg() {
  return Buffer.from([
    0xff, 0xd8,
    0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x01, 0x00, 0x01, 0x01, 0x01, 0x11, 0x00,
    0xff, 0xda, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3f, 0x00,
    0x00, 0xff, 0xd9,
  ])
}

function onePixelGif() {
  return Buffer.from([
    ...Buffer.from('GIF89a'),
    1, 0, 1, 0, 0, 0, 0,
    0x2c, 0, 0, 0, 0, 1, 0, 1, 0, 0,
    2, 2, 0x44, 0x01, 0, 0x3b,
  ])
}

function onePixelBmp() {
  const bmp = Buffer.alloc(58)
  bmp.write('BM')
  bmp.writeUInt32LE(58, 2)
  bmp.writeUInt32LE(54, 10)
  bmp.writeUInt32LE(40, 14)
  bmp.writeInt32LE(1, 18)
  bmp.writeInt32LE(1, 22)
  bmp.writeUInt16LE(1, 26)
  bmp.writeUInt16LE(24, 28)
  bmp.writeUInt32LE(4, 34)
  return bmp
}

function onePixelWebp() {
  const webp = Buffer.alloc(26)
  webp.write('RIFF')
  webp.writeUInt32LE(18, 4)
  webp.write('WEBP', 8)
  webp.write('VP8L', 12)
  webp.writeUInt32LE(5, 16)
  webp[20] = 0x2f
  return webp
}

test('accepts an actual PNG with a matching extension and MIME type', () => {
  assert.deepEqual(
    validateImageFile('product.png', 'image/png', onePixelPng()),
    { extension: 'png', contentType: 'image/png' }
  )
})

test('accepts the supported JPEG, GIF, WebP, and BMP raster formats', () => {
  const fixtures = [
    ['photo.jpg', 'image/jpeg', onePixelJpeg()],
    ['animation.gif', 'image/gif', onePixelGif()],
    ['photo.webp', 'image/webp', onePixelWebp()],
    ['photo.bmp', 'image/bmp', onePixelBmp()],
  ]
  for (const [name, mime, bytes] of fixtures) {
    assert.notEqual(validateImageFile(name, mime, bytes), null, name)
  }
})

test('rejects mismatched MIME, extension, spoofed SVG, malformed structure, and oversize files', () => {
  const png = onePixelPng()
  assert.equal(validateImageFile('product.png', 'image/jpeg', png), null)
  assert.equal(validateImageFile('product.jpg', 'image/png', png), null)
  assert.equal(validateImageFile('product.svg', 'image/svg+xml', Buffer.from('<svg/>')), null)
  assert.equal(validateImageFile('product.png', 'image/png', png.subarray(0, 24)), null)
  assert.equal(validateImageFile('product.png', 'image/png', Buffer.alloc(4 * 1024 * 1024 + 1)), null)
})

test('rejects corrupt PNG chunks and unsafe image dimensions', () => {
  const corrupt = onePixelPng()
  corrupt[20] ^= 0xff
  assert.equal(validateImageFile('corrupt.png', 'image/png', corrupt), null)

  const tooLarge = onePixelPng()
  tooLarge.writeUInt32BE(10_001, 16)
  const ihdrCrc = crc32(tooLarge.subarray(12, 29))
  tooLarge.writeUInt32BE(ihdrCrc, 29)
  assert.equal(validateImageFile('large.png', 'image/png', tooLarge), null)
})
