import { randomUUID } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, verifyRequestOrigin } from '@/lib/api-security'
import {
  MAX_IMAGE_FILES_PER_REQUEST,
  MAX_IMAGE_REQUEST_SIZE_BYTES,
  validateImageFile,
} from '@/lib/image-validation'
import { isRateLimited } from '@/lib/login-rate-limit'
import { createStorageClient, PRODUCT_IMAGE_BUCKET } from '@/lib/supabase-storage'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const UPLOADS_PER_WINDOW = 20
const RATE_LIMIT_WINDOW_SECONDS = 15 * 60

async function readBoundedBody(request: NextRequest): Promise<Buffer | null> {
  if (!request.body) return Buffer.alloc(0)

  const reader = request.body.getReader()
  const chunks: Buffer[] = []
  let totalBytes = 0

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      totalBytes += value.byteLength
      if (totalBytes > MAX_IMAGE_REQUEST_SIZE_BYTES) {
        try {
          await reader.cancel()
        } catch (error) {
          console.error('Image upload request cancellation error:', error)
        }
        return null
      }
      chunks.push(Buffer.from(value))
    }
  } finally {
    reader.releaseLock()
  }

  return Buffer.concat(chunks, totalBytes)
}

export async function POST(request: NextRequest) {
  const auth = requireAdmin(request)
  if (!auth.ok) return auth.response

  const originError = verifyRequestOrigin(request)
  if (originError) return originError

  try {
    const rateLimitKey = `admin-image-upload:${auth.session.adminId}`
    if (await isRateLimited(rateLimitKey, UPLOADS_PER_WINDOW, RATE_LIMIT_WINDOW_SECONDS)) {
      return NextResponse.json({ error: 'Se alcanzó el límite de cargas. Intentá nuevamente más tarde.' }, { status: 429 })
    }
  } catch (error) {
    console.error('Image upload rate-limit service error:', error)
    return NextResponse.json({ error: 'La carga de imágenes no está disponible temporalmente' }, { status: 503 })
  }

  const contentLengthHeader = request.headers.get('content-length')
  if (contentLengthHeader && !/^\d+$/.test(contentLengthHeader)) {
    return NextResponse.json({ error: 'Longitud de solicitud inválida' }, { status: 400 })
  }
  if (contentLengthHeader && Number(contentLengthHeader) > MAX_IMAGE_REQUEST_SIZE_BYTES) {
    return NextResponse.json({ error: 'La solicitud supera el tamaño máximo permitido' }, { status: 413 })
  }

  let body: Buffer
  try {
    const boundedBody = await readBoundedBody(request)
    if (!boundedBody) {
      return NextResponse.json({ error: 'La solicitud supera el tamaño máximo permitido' }, { status: 413 })
    }
    body = boundedBody
  } catch (error) {
    console.error('Image upload request body error:', error)
    return NextResponse.json({ error: 'No se pudo leer la solicitud de carga' }, { status: 400 })
  }

  let formData: FormData
  try {
    const requestBody = new Uint8Array(body)
    const boundedRequest = new Request(request.url, {
      method: 'POST',
      headers: request.headers,
      body: requestBody,
    })
    formData = await boundedRequest.formData()
  } catch {
    return NextResponse.json({ error: 'Formulario de carga inválido' }, { status: 400 })
  }

  const purpose = formData.get('purpose')
  const files = formData.getAll('files')
  if ((purpose !== 'product' && purpose !== 'category') ||
    files.length < 1 ||
    files.length > MAX_IMAGE_FILES_PER_REQUEST ||
    (purpose === 'category' && files.length !== 1) ||
    files.some((file) => !(file instanceof File))) {
    return NextResponse.json({ error: 'Tipo o cantidad de archivos inválida' }, { status: 400 })
  }

  const imageFiles = files as File[]
  const totalBytes = imageFiles.reduce((total, file) => total + file.size, 0)
  if (totalBytes > MAX_IMAGE_REQUEST_SIZE_BYTES - 100_000) {
    return NextResponse.json({ error: 'La carga supera el tamaño máximo permitido' }, { status: 413 })
  }

  const validatedFiles = await Promise.all(imageFiles.map(async (file) => {
    const bytes = new Uint8Array(await file.arrayBuffer())
    const validated = validateImageFile(file.name, file.type, bytes)
    return validated ? { bytes, ...validated } : null
  }))
  if (validatedFiles.some((file) => file === null)) {
    return NextResponse.json({
      error: 'Archivo de imagen inválido. Se aceptan JPEG, PNG, GIF, WebP o BMP con extensión y contenido coincidentes.',
    }, { status: 400 })
  }

  let storage
  try {
    storage = createStorageClient()
  } catch (error) {
    console.error('Supabase image storage configuration error:', error)
    return NextResponse.json({ error: 'La carga de imágenes no está configurada' }, { status: 503 })
  }

  const prefix = purpose === 'product' ? 'products' : 'categories'
  const imageUrls: string[] = []
  const uploadedPaths: string[] = []
  for (const image of validatedFiles) {
    if (!image) continue
    const filePath = `${prefix}/${randomUUID()}.${image.extension}`
    try {
      const { error } = await storage.storage
        .from(PRODUCT_IMAGE_BUCKET)
        .upload(filePath, image.bytes, {
          cacheControl: '3600',
          contentType: image.contentType,
          upsert: false,
        })

      if (error) throw error
    } catch (error) {
      console.error('Supabase image upload error:', error)
      if (uploadedPaths.length > 0) {
        try {
          const { error: cleanupError } = await storage.storage
            .from(PRODUCT_IMAGE_BUCKET)
            .remove(uploadedPaths)
          if (cleanupError) {
            console.error('Supabase image upload cleanup error:', cleanupError)
          }
        } catch (cleanupError) {
          console.error('Supabase image upload cleanup error:', cleanupError)
        }
      }
      return NextResponse.json({ error: 'No se pudo guardar la imagen' }, { status: 502 })
    }

    uploadedPaths.push(filePath)
    imageUrls.push(storage.storage.from(PRODUCT_IMAGE_BUCKET).getPublicUrl(filePath).data.publicUrl)
  }

  return NextResponse.json({ imageUrls }, { headers: { 'Cache-Control': 'no-store' } })
}
