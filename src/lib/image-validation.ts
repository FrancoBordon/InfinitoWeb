import { inflateSync } from 'node:zlib'

export const MAX_IMAGE_SIZE_BYTES = 4 * 1024 * 1024
export const MAX_IMAGE_FILES_PER_REQUEST = 5
export const MAX_IMAGE_REQUEST_SIZE_BYTES = 4_250_000

const IMAGE_FORMATS = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  bmp: 'image/bmp',
} as const

type ImageExtension = keyof typeof IMAGE_FORMATS

function dimensionsAreSafe(width: number, height: number): boolean {
  return Number.isInteger(width) && Number.isInteger(height) &&
    width > 0 && height > 0 && width <= 10_000 && height <= 10_000 &&
    width * height <= 25_000_000
}

function crc32(bytes: Uint8Array, start: number, end: number): number {
  let crc = 0xffffffff
  for (let index = start; index < end; index += 1) {
    crc ^= bytes[index]
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1))
    }
  }
  return (crc ^ 0xffffffff) >>> 0
}

function isPng(bytes: Uint8Array): boolean {
  const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
  if (bytes.length < 45 || !signature.every((value, index) => bytes[index] === value)) return false
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  let offset = 8
  let hasHeader = false
  let hasImageData = false
  let hasEnd = false
  const imageData: Uint8Array[] = []

  while (offset + 12 <= bytes.length) {
    const length = view.getUint32(offset)
    const chunkEnd = offset + 12 + length
    if (chunkEnd > bytes.length) return false
    const type = String.fromCharCode(...bytes.subarray(offset + 4, offset + 8))
    const expectedCrc = view.getUint32(offset + 8 + length)
    if (crc32(bytes, offset + 4, offset + 8 + length) !== expectedCrc) return false

    if (!hasHeader) {
      if (type !== 'IHDR' || length !== 13 ||
        !dimensionsAreSafe(view.getUint32(offset + 8), view.getUint32(offset + 12))) return false
      hasHeader = true
    } else if (type === 'IHDR') {
      return false
    }

    if (type === 'IDAT' && length > 0) {
      hasImageData = true
      imageData.push(bytes.subarray(offset + 8, offset + 8 + length))
    }
    if (type === 'IEND') {
      if (length !== 0 || chunkEnd !== bytes.length) return false
      hasEnd = true
      break
    }
    offset = chunkEnd
  }
  if (!hasHeader || !hasImageData || !hasEnd) return false
  try {
    const compressed = Buffer.concat(imageData.map((chunk) => Buffer.from(chunk)))
    return inflateSync(compressed, { maxOutputLength: 100_000_000 }).length > 0
  } catch {
    return false
  }
}

function isGif(bytes: Uint8Array): boolean {
  if (bytes.length < 27 || bytes[bytes.length - 1] !== 0x3b) return false
  const signature = String.fromCharCode(...bytes.subarray(0, 6))
  const width = bytes[6] | (bytes[7] << 8)
  const height = bytes[8] | (bytes[9] << 8)
  if ((signature !== 'GIF87a' && signature !== 'GIF89a') ||
    !dimensionsAreSafe(width, height)) return false

  let offset = 13
  const hasGlobalColorTable = (bytes[10] & 0x80) !== 0
  if (hasGlobalColorTable) offset += 3 * (1 << ((bytes[10] & 0x07) + 1))
  let hasImage = false

  while (offset < bytes.length - 1) {
    const marker = bytes[offset]
    offset += 1
    if (marker === 0x2c) {
      if (offset + 9 > bytes.length) return false
      const imageWidth = bytes[offset + 4] | (bytes[offset + 5] << 8)
      const imageHeight = bytes[offset + 6] | (bytes[offset + 7] << 8)
      if (!dimensionsAreSafe(imageWidth, imageHeight)) return false
      const localTable = (bytes[offset + 8] & 0x80) !== 0
      offset += 9
      if (localTable) offset += 3 * (1 << ((bytes[offset - 1] & 0x07) + 1))
      if (offset >= bytes.length - 1) return false
      offset += 1
      hasImage = true
    } else if (marker === 0x21) {
      if (offset >= bytes.length - 1) return false
      offset += 1
    } else {
      return false
    }

    let blockSize = 1
    while (blockSize !== 0) {
      if (offset >= bytes.length - 1) return false
      blockSize = bytes[offset]
      offset += 1
      if (offset + blockSize > bytes.length - 1) return false
      offset += blockSize
    }
  }
  return hasImage && offset === bytes.length - 1
}

function isBmp(bytes: Uint8Array): boolean {
  if (bytes.length < 54 || bytes[0] !== 0x42 || bytes[1] !== 0x4d) return false
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const headerSize = view.getUint32(14, true)
  const width = view.getInt32(18, true)
  const height = Math.abs(view.getInt32(22, true))
  const bitsPerPixel = view.getUint16(28, true)
  const pixelOffset = view.getUint32(10, true)
  const fileSize = view.getUint32(2, true)
  const compression = view.getUint32(30, true)
  if (headerSize < 40 || view.getUint16(26, true) !== 1 ||
    (bitsPerPixel !== 24 && bitsPerPixel !== 32) || compression !== 0 ||
    !dimensionsAreSafe(width, height) || fileSize > bytes.length || fileSize < bytes.length ||
    pixelOffset < 54 || pixelOffset > bytes.length) return false
  const rowBytes = Math.ceil((width * bitsPerPixel) / 32) * 4
  return pixelOffset + rowBytes * height <= bytes.length
}

function isJpeg(bytes: Uint8Array): boolean {
  if (bytes.length < 20 || bytes[0] !== 0xff || bytes[1] !== 0xd8 ||
    bytes[bytes.length - 2] !== 0xff || bytes[bytes.length - 1] !== 0xd9) return false
  const startOfFrameMarkers = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf])
  let offset = 2
  let dimensions: { width: number; height: number } | null = null

  while (offset < bytes.length) {
    while (bytes[offset] === 0xff) offset += 1
    if (offset >= bytes.length) return false
    const marker = bytes[offset]
    offset += 1
    if (marker === 0xd9) return false
    if (marker === 0xda) {
      if (dimensions === null || !dimensionsAreSafe(dimensions.width, dimensions.height) ||
        offset + 2 > bytes.length - 2) return false
      const scanLength = (bytes[offset] << 8) | bytes[offset + 1]
      return scanLength >= 2 && offset + scanLength <= bytes.length - 2
    }
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue
    if (offset + 2 > bytes.length) return false

    const segmentLength = (bytes[offset] << 8) | bytes[offset + 1]
    if (segmentLength < 2 || offset + segmentLength > bytes.length) return false
    if (startOfFrameMarkers.has(marker)) {
      if (segmentLength < 7) return false
      const height = (bytes[offset + 3] << 8) | bytes[offset + 4]
      const width = (bytes[offset + 5] << 8) | bytes[offset + 6]
      if (!dimensionsAreSafe(width, height)) return false
      dimensions = { width, height }
    }
    offset += segmentLength
  }
  return false
}

function isWebp(bytes: Uint8Array): boolean {
  if (bytes.length < 26 || String.fromCharCode(...bytes.subarray(0, 4)) !== 'RIFF' ||
    String.fromCharCode(...bytes.subarray(8, 12)) !== 'WEBP') return false
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  if (view.getUint32(4, true) + 8 !== bytes.length) return false

  let offset = 12
  let hasImageData = false
  let hasSafeDimensions = false
  while (offset + 8 <= bytes.length) {
    const chunk = String.fromCharCode(...bytes.subarray(offset, offset + 4))
    const chunkSize = view.getUint32(offset + 4, true)
    const dataOffset = offset + 8
    if (dataOffset + chunkSize > bytes.length) return false

    if (chunk === 'VP8X' && chunkSize >= 10) {
      const width = 1 + bytes[dataOffset + 4] + (bytes[dataOffset + 5] << 8) + (bytes[dataOffset + 6] << 16)
      const height = 1 + bytes[dataOffset + 7] + (bytes[dataOffset + 8] << 8) + (bytes[dataOffset + 9] << 16)
      hasSafeDimensions ||= dimensionsAreSafe(width, height)
    } else if (chunk === 'VP8 ' && chunkSize >= 10) {
      const markerOffset = dataOffset + 3
      if (bytes[markerOffset] !== 0x9d || bytes[markerOffset + 1] !== 0x01 || bytes[markerOffset + 2] !== 0x2a) return false
      const width = (bytes[markerOffset + 3] | (bytes[markerOffset + 4] << 8)) & 0x3fff
      const height = (bytes[markerOffset + 5] | (bytes[markerOffset + 6] << 8)) & 0x3fff
      hasSafeDimensions ||= dimensionsAreSafe(width, height)
      hasImageData = true
    } else if (chunk === 'VP8L' && chunkSize >= 5 && bytes[dataOffset] === 0x2f) {
      const width = 1 + bytes[dataOffset + 1] + ((bytes[dataOffset + 2] & 0x3f) << 8)
      const height = 1 + (bytes[dataOffset + 2] >> 6) + (bytes[dataOffset + 3] << 2) +
        ((bytes[dataOffset + 4] & 0x0f) << 10)
      hasSafeDimensions ||= dimensionsAreSafe(width, height)
      hasImageData = true
    } else if (chunk === 'ANMF' && chunkSize > 16) {
      hasImageData = true
    }
    offset = dataOffset + chunkSize + (chunkSize & 1)
  }
  return hasImageData && hasSafeDimensions && offset === bytes.length
}

function hasValidImageContent(extension: ImageExtension, bytes: Uint8Array): boolean {
  switch (extension) {
    case 'jpg':
    case 'jpeg':
      return isJpeg(bytes)
    case 'png':
      return isPng(bytes)
    case 'gif':
      return isGif(bytes)
    case 'webp':
      return isWebp(bytes)
    case 'bmp':
      return isBmp(bytes)
  }
}

export function validateImageFile(
  fileName: string,
  mimeType: string,
  bytes: Uint8Array
): { extension: ImageExtension; contentType: string } | null {
  const extension = fileName.split('.').pop()?.toLowerCase() as ImageExtension | undefined
  if (!extension || !(extension in IMAGE_FORMATS) || !bytes.length || bytes.length > MAX_IMAGE_SIZE_BYTES) {
    return null
  }
  const contentType = IMAGE_FORMATS[extension]
  if (mimeType.toLowerCase() !== contentType || !hasValidImageContent(extension, bytes)) return null
  return { extension, contentType }
}
