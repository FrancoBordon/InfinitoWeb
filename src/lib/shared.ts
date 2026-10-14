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
export async function uploadImages(files: File[], purpose: 'product' | 'category'): Promise<string[]> {
  if (files.length < 1 || files.length > 5) throw new Error('Seleccioná entre 1 y 5 imágenes')
  const formData = new FormData()
  formData.set('purpose', purpose)
  for (const file of files) formData.append('files', file)

  const res = await fetch('/api/upload', { method: 'POST', body: formData })
  const data = await res.json().catch(() => ({})) as { error?: string; imageUrls?: unknown }
  if (!res.ok) throw new Error(data.error || 'Error al subir imagen')
  if (!Array.isArray(data.imageUrls) || data.imageUrls.length !== files.length ||
    !data.imageUrls.every((url): url is string => typeof url === 'string')) {
    throw new Error('Respuesta inválida al subir imágenes')
  }
  return data.imageUrls
}

export async function uploadImage(file: File, purpose: 'product' | 'category' = 'category'): Promise<string | null> {
  try {
    return (await uploadImages([file], purpose))[0]
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Error al subir imagen')
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
