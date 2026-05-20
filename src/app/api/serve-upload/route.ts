import { NextRequest, NextResponse } from 'next/server'
import { readFile, stat } from 'fs/promises'
import path from 'path'
import { existsSync } from 'fs'

const UPLOADS_DIR = path.join(process.cwd(), 'public', 'uploads')

const MIME_TYPES: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.bmp': 'image/bmp',
  '.tiff': 'image/tiff',
  '.tif': 'image/tiff',
}

// GET /api/serve-upload?file=filename.png
// Serves uploaded files directly from the filesystem
// This is kept for backward compatibility with existing image URLs
export async function GET(request: NextRequest) {
  try {
    const fileName = request.nextUrl.searchParams.get('file')

    if (!fileName) {
      return NextResponse.json({ error: 'File parameter required' }, { status: 400 })
    }

    // Sanitize filename - prevent directory traversal
    const safeName = path.basename(fileName)
    const filePath = path.join(UPLOADS_DIR, safeName)

    // Ensure the path is within UPLOADS_DIR
    if (!filePath.startsWith(UPLOADS_DIR)) {
      return NextResponse.json({ error: 'Invalid file path' }, { status: 400 })
    }

    if (!existsSync(filePath)) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    const fileStat = await stat(filePath)
    if (!fileStat.isFile()) {
      return NextResponse.json({ error: 'Not a file' }, { status: 400 })
    }

    const ext = path.extname(safeName).toLowerCase()
    const contentType = MIME_TYPES[ext] || 'application/octet-stream'

    // Read file and serve it
    const fileBuffer = await readFile(filePath)

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': fileStat.size.toString(),
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  } catch (error) {
    console.error('Serve upload error:', error)
    return NextResponse.json({ error: 'Error serving file' }, { status: 500 })
  }
}
