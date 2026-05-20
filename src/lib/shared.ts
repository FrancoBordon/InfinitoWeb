import { toast } from 'sonner'

// ─── Constants ───────────────────────────────────────────────────────
export const STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pendiente', color: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
  confirmed: { label: 'Confirmado', color: 'bg-blue-100 text-blue-800 border-blue-300' },
  shipped: { label: 'Enviado', color: 'bg-purple-100 text-purple-800 border-purple-300' },
  delivered: { label: 'Entregado', color: 'bg-green-100 text-green-800 border-green-300' },
  cancelled: { label: 'Cancelado', color: 'bg-red-100 text-red-800 border-red-300' },
}

// ─── Product Form Interface ──────────────────────────────────────────
export interface ProductFormData {
  name: string
  description: string
  category: string
  price: string
  costPrice: string
  promoPrice: string
  stock: string
  talle: string
  imageUrl: string
  images: string[]
}

export const emptyProductForm: ProductFormData = {
  name: '',
  description: '',
  category: '',
  price: '',
  costPrice: '',
  promoPrice: '',
  stock: '0',
  talle: '',
  imageUrl: '',
  images: [],
}

// ─── Customer Form Interface ─────────────────────────────────────────
export interface CustomerFormData {
  name: string
  phone: string
  email: string
  address: string
  notes: string
  tags: string
}

export const emptyCustomerForm: CustomerFormData = {
  name: '',
  phone: '',
  email: '',
  address: '',
  notes: '',
  tags: '',
}

// ─── Category Form Interface ─────────────────────────────────────────
export interface CategoryFormData {
  name: string
  description: string
  imageUrl: string
  sortOrder: number
}

export const emptyCategoryForm: CategoryFormData = {
  name: '',
  description: '',
  imageUrl: '',
  sortOrder: 0,
}

// ─── Gradient Colors for product placeholders ────────────────────────
export const GRADIENTS = [
  'from-amber-200 to-yellow-100',
  'from-rose-200 to-pink-100',
  'from-violet-200 to-purple-100',
  'from-emerald-200 to-green-100',
  'from-sky-200 to-blue-100',
  'from-orange-200 to-amber-100',
]

export function getGradient(name: string) {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return GRADIENTS[Math.abs(hash) % GRADIENTS.length]
}

// ─── Image Upload Helper ─────────────────────────────────────────────
export async function uploadImage(file: File): Promise<string | null> {
  const MAX_SIZE = 10 * 1024 * 1024

  // Client-side validation
  if (file.size === 0) { toast.error('El archivo está vacío'); return null }
  if (file.size > MAX_SIZE) { toast.error('Archivo demasiado grande. Máximo 10MB'); return null }

  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'image/bmp']
  if (!allowedTypes.includes(file.type)) {
    toast.error('Formato no permitido. Usá JPG, PNG, GIF, WebP o SVG')
    return null
  }

  const formData = new FormData()
  formData.append('file', file)

  try {
    const res = await fetch('/api/upload', { method: 'POST', body: formData })
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}))
      toast.error(errData.error || 'Error al subir imagen')
      return null
    }
    const data = await res.json()
    return data.imageUrl
  } catch {
    toast.error('Error al subir imagen. Verificá tu conexión.')
    return null
  }
}

// ─── Product Images Helper ──────────────────────────────────────────
export function getProductImages(product: { imageUrl?: string | null; images?: string[] }): string[] {
  if (product.images && Array.isArray(product.images) && product.images.length > 0) {
    return product.images
  }
  const imgs: string[] = []
  if (product.imageUrl) {
    imgs.push(product.imageUrl)
  }
  return imgs
}
