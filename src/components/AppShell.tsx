'use client'
import { uploadProductImage } from '@/lib/supabase'
import { useEffect, useState, useCallback, useRef } from 'react'
import { useCartStore } from '@/lib/cart-store'
import type { Product, Customer, Order, Category } from '@/lib/types'
import { formatPrice, getWhatsAppUrl } from '@/lib/whatsapp'
import { toast } from 'sonner'
import {
  emptyProductForm,
  emptyCustomerForm,
  emptyCategoryForm,
  uploadImage,
  type ProductFormData,
  type CustomerFormData,
  type CategoryFormData,
} from '@/lib/shared'

// UI Components
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

// Icons
import {
  Gem,
  ShoppingBag,
  Package,
  Lock,
  LogOut,
} from 'lucide-react'

// Section Components
import CatalogSection from '@/components/CatalogSection'
import CartSection from '@/components/CartSection'
import AdminSection from '@/components/AdminSection'
import Modals from '@/components/Modals'

type CustomerWithCount = Customer & { orderCount?: number }

// ─── Gradient Colors for product placeholders ────────────────────────
const GRADIENTS = [
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

// ─── Fetch with retry helper ──────────────────────────────────────────
async function fetchWithRetry(url: string, options?: RequestInit, retries = 3, delay = 2000): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, options)
      if (res.ok || res.status === 400 || res.status === 404 || res.status === 409) {
        return res
      }
      // Server error - might be restarting, retry
      if (res.status >= 500 && i < retries - 1) {
        await new Promise(r => setTimeout(r, delay * (i + 1)))
        continue
      }
      return res
    } catch {
      if (i < retries - 1) {
        await new Promise(r => setTimeout(r, delay * (i + 1)))
        continue
      }
      throw new Error('Network error after retries')
    }
  }
  throw new Error('Max retries exceeded')
}

// ═══════════════════════════════════════════════════════════════════════
// APP SHELL COMPONENT
// ═══════════════════════════════════════════════════════════════════════
export default function AppShell() {
  // ─── Navigation ──────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<'catalogo' | 'carrito' | 'admin'>('catalogo')

  // ─── Admin Auth ──────────────────────────────────────────────────
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false)
  const [adminName, setAdminName] = useState('')
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)

  // ─── Data ────────────────────────────────────────────────────────
  const [products, setProducts] = useState<Product[]>([])
  const [customers, setCustomers] = useState<CustomerWithCount[]>([])
  const [ordersData, setOrdersData] = useState<{ orders: Order[]; total: number }>({ orders: [], total: 0 })
  const [categories, setCategories] = useState<Category[]>([])

  // ─── Loading ─────────────────────────────────────────────────────
  const [productsLoading, setProductsLoading] = useState(true)
  const [customersLoading, setCustomersLoading] = useState(false)
  const [ordersLoading, setOrdersLoading] = useState(false)
  const [categoriesLoading, setCategoriesLoading] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [uploadingCategoryImage, setUploadingCategoryImage] = useState(false)
  const [savingProduct, setSavingProduct] = useState(false)
  const [savingCustomer, setSavingCustomer] = useState(false)
  const [savingCategory, setSavingCategory] = useState(false)

  // ─── Modals ──────────────────────────────────────────────────────
  const [showProductModal, setShowProductModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [productForm, setProductForm] = useState<ProductFormData>(emptyProductForm)

  const [showCustomerModal, setShowCustomerModal] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<CustomerWithCount | null>(null)
  const [customerForm, setCustomerForm] = useState<CustomerFormData>(emptyCustomerForm)

  const [showOrderDetail, setShowOrderDetail] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)

  const [showCustomerDetail, setShowCustomerDetail] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<(Customer & { orderCount?: number; orders?: Order[] }) | null>(null)

  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [categoryForm, setCategoryForm] = useState<CategoryFormData>(emptyCategoryForm)

  // ─── Image Lightbox ────────────────────────────────────────────
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxImages, setLightboxImages] = useState<string[]>([])
  const [lightboxIndex, setLightboxIndex] = useState(0)

  // ─── Track when category is being created from product form ────
  const [creatingCategoryFromProduct, setCreatingCategoryFromProduct] = useState(false)

  // ─── Cart Store ──────────────────────────────────────────────────
  const getItemCount = useCartStore((s) => s.getItemCount)
  const cartCount = getItemCount()

  // ─── Fetch Products (for catalog) ────────────────────────────────
  const fetchProducts = useCallback(async () => {
    try {
      const res = await fetchWithRetry('/api/products?active=true')
      const data = await res.json()
      setProducts(Array.isArray(data) ? data : [])
    } catch {
      setProducts([])
    } finally {
      setProductsLoading(false)
    }
  }, [])

  // ─── Fetch All Products (for admin) ──────────────────────────────
  const fetchAllProducts = useCallback(async () => {
    try {
      const res = await fetchWithRetry('/api/products')
      const data = await res.json()
      setProducts(Array.isArray(data) ? data : [])
    } catch {
      // Keep existing products on failure
    } finally {
      setProductsLoading(false)
    }
  }, [])

  // ─── Fetch Customers ────────────────────────────────────────────
  const fetchCustomers = useCallback(async (search?: string) => {
    setCustomersLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      const res = await fetchWithRetry(`/api/customers?${params}`)
      const data = await res.json()
      setCustomers(Array.isArray(data) ? data : [])
    } catch {
      // Keep existing customers on failure
    } finally {
      setCustomersLoading(false)
    }
  }, [])

  // ─── Fetch Orders ───────────────────────────────────────────────
  const fetchOrders = useCallback(async (status?: string) => {
    setOrdersLoading(true)
    try {
      const params = new URLSearchParams()
      if (status && status !== 'all') params.set('status', status)
      const res = await fetchWithRetry(`/api/orders?${params}`)
      const data = await res.json()
      setOrdersData({ orders: data.orders || [], total: data.total || 0 })
    } catch {
      // Keep existing orders on failure
    } finally {
      setOrdersLoading(false)
    }
  }, [])

  // ─── Fetch Categories ───────────────────────────────────────────
  const fetchCategories = useCallback(async () => {
    setCategoriesLoading(true)
    try {
      const res = await fetchWithRetry('/api/categories')
      const data = await res.json()
      setCategories(Array.isArray(data) ? data : [])
    } catch {
      // Keep existing categories on failure
    } finally {
      setCategoriesLoading(false)
    }
  }, [])

  // ─── Effects ─────────────────────────────────────────────────────
  useEffect(() => {
    fetchCategories()
  }, [fetchCategories])

  useEffect(() => {
    if (activeTab === 'catalogo') {
      fetchProducts()
    }
  }, [activeTab, fetchProducts])

  useEffect(() => {
    if (isAdminLoggedIn && activeTab === 'admin') {
      fetchAllProducts()
      fetchCustomers()
      fetchOrders()
      fetchCategories()
    }
  }, [isAdminLoggedIn, activeTab, fetchAllProducts, fetchCustomers, fetchOrders, fetchCategories])

  // ─── Admin Login ─────────────────────────────────────────────────
  const handleAdminLogin = async () => {
    if (!loginEmail || !loginPassword) {
      setLoginError('Ingresá correo y contraseña')
      return
    }
    setLoginLoading(true)
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      })
      const data = await res.json()
      if (!data.ok) {
        setLoginError(data.error || 'Error al iniciar sesión')
        return
      }
      setIsAdminLoggedIn(true)
      setAdminName(data.user?.name || loginEmail)
      setShowLoginModal(false)
      setLoginEmail('')
      setLoginPassword('')
      setLoginError('')
      toast.success(`Bienvenido, ${data.user?.name || 'Admin'}`)
    } catch {
      setLoginError('Error de conexión. Intentá de nuevo.')
    } finally {
      setLoginLoading(false)
    }
  }

  const handleAdminTabClick = () => {
    if (!isAdminLoggedIn) {
      setShowLoginModal(true)
    } else {
      setActiveTab('admin')
    }
  }

  // ─── Product Image Upload ────────────────────────────────────────
  const handleProductImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    setUploadingImage(true)
    try {
      for (const file of Array.from(files)) {
  const imageUrl = await uploadProductImage(file)

  if (imageUrl) {
    setProductForm((prev) => {
      const newImages = [...prev.images, imageUrl]
      return {
        ...prev,
        images: newImages,
        imageUrl: prev.imageUrl || imageUrl,
      }
    })
  }
}
      toast.success('Imagen(es) subida(s) correctamente')
    } catch {
      toast.error('Error al subir imagen')
    } finally {
      setUploadingImage(false)
      e.target.value = ''
    }
  }

  // ─── Category Image Upload ───────────────────────────────────────
  const handleCategoryImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingCategoryImage(true)
    try {
      const imageUrl = await uploadImage(file)
      if (imageUrl) {
        setCategoryForm((prev) => ({ ...prev, imageUrl }))
        toast.success('Imagen subida correctamente')
      }
    } catch {
      toast.error('Error al subir imagen')
    } finally {
      setUploadingCategoryImage(false)
      e.target.value = ''
    }
  }

  // ─── Product CRUD ────────────────────────────────────────────────
  const handleSaveProduct = async () => {
    if (!productForm.name || !productForm.price) {
      toast.error('Nombre y precio son obligatorios')
      return
    }
    setSavingProduct(true)
    const payload = {
      name: productForm.name,
      description: productForm.description || null,
      category: productForm.category || 'General',
      price: parseFloat(productForm.price),
      costPrice: parseFloat(productForm.costPrice) || 0,
      promoPrice: productForm.promoPrice ? parseFloat(productForm.promoPrice) : null,
      stock: parseInt(productForm.stock) || 0,
      talle: productForm.talle || null,
      imageUrl: productForm.imageUrl || null,
      images: productForm.images.length > 0 ? productForm.images : [],
    }
    try {
      let savedProduct: Product | null = null
      if (editingProduct) {
        const res = await fetchWithRetry(`/api/products/${editingProduct.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}))
          throw new Error(errData.error || 'Error del servidor')
        }
        savedProduct = await res.json()
        toast.success('Producto actualizado')
      } else {
        const res = await fetchWithRetry('/api/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}))
          throw new Error(errData.error || 'Error del servidor')
        }
        savedProduct = await res.json()
        toast.success('Producto creado exitosamente')
      }
      // Close modal and reset form immediately
      setShowProductModal(false)
      setEditingProduct(null)
      setProductForm(emptyProductForm)
      // Update local state immediately with the saved product
      if (savedProduct) {
        if (editingProduct) {
          setProducts((prev) => prev.map((p) => p.id === savedProduct!.id ? savedProduct! : p))
        } else {
          setProducts((prev) => [savedProduct!, ...prev])
        }
      }
      // Also refresh from server in background
      fetchAllProducts()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar producto')
    } finally {
      setSavingProduct(false)
    }
  }

  const handleDeleteProduct = async (id: string) => {
    if (!confirm('¿Eliminar este producto?')) return
    // Remove from local state immediately for instant UI update
    const productToRemove = products.find((p) => p.id === id)
    setProducts((prev) => prev.filter((p) => p.id !== id))
    try {
      const res = await fetchWithRetry(`/api/products/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || 'Error del servidor')
      }
      toast.success('Producto eliminado')
    } catch (err) {
      // Restore on error
      if (productToRemove) {
        setProducts((prev) => [...prev, productToRemove])
      }
      toast.error(err instanceof Error ? err.message : 'Error al eliminar producto')
    }
  }

  const openEditProduct = (product: Product) => {
    setEditingProduct(product)
    setProductForm({
      name: product.name,
      description: product.description || '',
      category: product.category,
      price: product.price.toString(),
      costPrice: product.costPrice.toString(),
      promoPrice: product.promoPrice?.toString() || '',
      stock: product.stock.toString(),
      talle: product.talle || '',
      imageUrl: product.imageUrl || '',
      images: product.images && Array.isArray(product.images) ? product.images : (product.imageUrl ? [product.imageUrl] : []),
    })
    setShowProductModal(true)
  }

  const openNewProduct = () => {
    setEditingProduct(null)
    setProductForm({ ...emptyProductForm, category: categories.length > 0 ? categories[0].name : 'General' })
    setShowProductModal(true)
  }

  // ─── Customer CRUD ───────────────────────────────────────────────
  const handleSaveCustomer = async () => {
    if (!customerForm.name || !customerForm.phone) {
      toast.error('Nombre y teléfono son obligatorios')
      return
    }
    setSavingCustomer(true)
    const payload = {
      name: customerForm.name,
      phone: customerForm.phone,
      email: customerForm.email || null,
      address: customerForm.address || null,
      notes: customerForm.notes || null,
      tags: customerForm.tags || null,
    }
    try {
      let savedCustomer: CustomerWithCount | null = null
      if (editingCustomer) {
        const res = await fetchWithRetry(`/api/customers/${editingCustomer.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}))
          throw new Error(errData.error || 'Error del servidor')
        }
        const data = await res.json()
        savedCustomer = { ...data, orderCount: editingCustomer.orderCount }
        toast.success('Cliente actualizado')
      } else {
        const res = await fetchWithRetry('/api/customers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}))
          throw new Error(errData.error || 'Error del servidor')
        }
        savedCustomer = { ...(await res.json()), orderCount: 0 }
        toast.success('Cliente creado exitosamente')
      }
      // Close modal and reset form immediately
      setShowCustomerModal(false)
      setEditingCustomer(null)
      setCustomerForm(emptyCustomerForm)
      // Update local state immediately
      if (savedCustomer) {
        if (editingCustomer) {
          setCustomers((prev) => prev.map((c) => c.id === savedCustomer!.id ? savedCustomer! : c))
        } else {
          setCustomers((prev) => [savedCustomer!, ...prev])
        }
      }
      // Also refresh from server in background
      fetchCustomers()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar cliente')
    } finally {
      setSavingCustomer(false)
    }
  }

  const handleDeleteCustomer = async (id: string) => {
    if (!confirm('¿Eliminar este cliente?')) return
    const customerToRemove = customers.find((c) => c.id === id)
    setCustomers((prev) => prev.filter((c) => c.id !== id))
    try {
      const res = await fetchWithRetry(`/api/customers/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || 'Error del servidor')
      }
      toast.success('Cliente eliminado')
    } catch (err) {
      if (customerToRemove) {
        setCustomers((prev) => [...prev, customerToRemove])
      }
      toast.error(err instanceof Error ? err.message : 'Error al eliminar cliente')
    }
  }

  const openEditCustomer = (customer: CustomerWithCount) => {
    setEditingCustomer(customer)
    setCustomerForm({
      name: customer.name,
      phone: customer.phone,
      email: customer.email || '',
      address: customer.address || '',
      notes: customer.notes || '',
      tags: customer.tags || '',
    })
    setShowCustomerModal(true)
  }

  const openNewCustomer = () => {
    setEditingCustomer(null)
    setCustomerForm(emptyCustomerForm)
    setShowCustomerModal(true)
  }

  // ─── Category CRUD ───────────────────────────────────────────────
  const handleSaveCategory = async () => {
    if (!categoryForm.name) {
      toast.error('El nombre de la categoría es obligatorio')
      return
    }
    setSavingCategory(true)
    const payload = {
      name: categoryForm.name,
      description: categoryForm.description || null,
      imageUrl: categoryForm.imageUrl || null,
      sortOrder: categoryForm.sortOrder,
    }
    try {
      let savedCategory: Category | null = null
      if (editingCategory) {
        const res = await fetchWithRetry('/api/categories', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingCategory.id, ...payload }),
        })
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}))
          throw new Error(errData.error || 'Error')
        }
        savedCategory = await res.json()
        toast.success('Categoría actualizada')
      } else {
        const res = await fetchWithRetry('/api/categories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}))
          throw new Error(errData.error || 'Error')
        }
        savedCategory = await res.json()
        // Auto-select the new category in the product form
        if (creatingCategoryFromProduct) {
          setProductForm((prev) => ({ ...prev, category: categoryForm.name }))
        }
        toast.success('Categoría creada exitosamente')
      }
      // Close modal and reset form immediately
      setShowCategoryModal(false)
      setEditingCategory(null)
      setCategoryForm(emptyCategoryForm)
      setCreatingCategoryFromProduct(false)
      // Update local state immediately
      if (savedCategory) {
        if (editingCategory) {
          setCategories((prev) => prev.map((c) => c.id === savedCategory!.id ? savedCategory! : c))
        } else {
          setCategories((prev) => [...prev, savedCategory!])
        }
      }
      // Also refresh from server in background
      fetchCategories()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar categoría')
    } finally {
      setSavingCategory(false)
    }
  }

  const handleDeleteCategory = async (id: string) => {
    if (!confirm('¿Eliminar esta categoría? Los productos asociados no se eliminarán.')) return
    const categoryToRemove = categories.find((c) => c.id === id)
    setCategories((prev) => prev.filter((c) => c.id !== id))
    try {
      const res = await fetchWithRetry(`/api/categories/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      toast.success('Categoría eliminada')
    } catch {
      if (categoryToRemove) {
        setCategories((prev) => [...prev, categoryToRemove])
      }
      toast.error('Error al eliminar categoría')
    }
  }

  const openEditCategory = (category: Category) => {
    setEditingCategory(category)
    setCategoryForm({
      name: category.name,
      description: category.description || '',
      imageUrl: category.imageUrl || '',
      sortOrder: category.sortOrder,
    })
    setShowCategoryModal(true)
  }

  const openNewCategory = () => {
    setEditingCategory(null)
    setCategoryForm({ ...emptyCategoryForm, sortOrder: categories.length })
    setShowCategoryModal(true)
  }

  const openNewCategoryFromProduct = () => {
    setCreatingCategoryFromProduct(true)
    setEditingCategory(null)
    setCategoryForm({ ...emptyCategoryForm, sortOrder: categories.length })
    setShowCategoryModal(true)
  }

  const handleCategorySortOrder = async (category: Category, direction: 'up' | 'down') => {
    const newSortOrder = direction === 'up' ? category.sortOrder - 1 : category.sortOrder + 1
    try {
      await fetchWithRetry('/api/categories', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: category.id, sortOrder: newSortOrder }),
      })
      await fetchCategories()
    } catch {
      toast.error('Error al reordenar categoría')
    }
  }

  // ─── Order Status Change ─────────────────────────────────────────
  const handleOrderStatusChange = async (orderId: string, newStatus: string) => {
    try {
      const res = await fetchWithRetry(`/api/orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (!res.ok) throw new Error()
      toast.success('Estado actualizado')
      await fetchOrders()
    } catch {
      toast.error('Error al actualizar estado')
    }
  }

  // ─── Lightbox handler ────────────────────────────────────────────
  const handleOpenLightbox = (images: string[], index: number) => {
    setLightboxImages(images)
    setLightboxIndex(index)
    setLightboxOpen(true)
  }

  // ═════════════════════════════════════════════════════════════════
  // RENDER
  // ═════════════════════════════════════════════════════════════════
  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* ─── HEADER ──────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 w-full border-b border-gold/20 bg-ink shadow-lg">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
          <button
            onClick={() => setActiveTab('catalogo')}
            className="flex items-center gap-2.5 transition-opacity hover:opacity-80"
          >
            <img src="/logo.png" alt="Infinito" className="h-10 w-10 rounded-full object-cover" />
            <div className="flex flex-col leading-tight">
              <span className="flex items-baseline gap-1">
                <span className="font-serif text-2xl font-bold tracking-wide text-gold">Infinito</span>
                <span className="font-serif text-lg text-gold-light">∞</span>
              </span>
              <span className="font-sans text-[10px] font-medium uppercase tracking-[0.2em] text-cream/50">Regalería</span>
            </div>
          </button>

          <nav className="hidden items-center gap-1 sm:flex">
            <button onClick={() => setActiveTab('catalogo')} className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${activeTab === 'catalogo' ? 'bg-gold/20 text-gold' : 'text-cream/70 hover:bg-white/5 hover:text-cream'}`}>
              <span className="flex items-center gap-1.5"><Gem className="size-4" />Catálogo</span>
            </button>
            <button onClick={() => setActiveTab('carrito')} className={`relative rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${activeTab === 'carrito' ? 'bg-gold/20 text-gold' : 'text-cream/70 hover:bg-white/5 hover:text-cream'}`}>
              <span className="flex items-center gap-1.5"><ShoppingBag className="size-4" />Carrito{cartCount > 0 && <Badge className="ml-1 flex size-5 items-center justify-center rounded-full bg-gold p-0 text-[10px] font-bold text-ink">{cartCount}</Badge>}</span>
            </button>
            <button onClick={handleAdminTabClick} className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${activeTab === 'admin' ? 'bg-gold/20 text-gold' : 'text-cream/70 hover:bg-white/5 hover:text-cream'}`}>
              <span className="flex items-center gap-1.5">{isAdminLoggedIn ? <Package className="size-4" /> : <Lock className="size-4" />}Admin</span>
            </button>
            {isAdminLoggedIn && activeTab === 'admin' && (
              <div className="flex items-center gap-2 ml-2">
                <span className="text-xs text-cream/50 hidden lg:inline">{adminName}</span>
                <button onClick={() => { setIsAdminLoggedIn(false); setAdminName(''); setActiveTab('catalogo') }} className="rounded-md px-3 py-1.5 text-sm font-medium text-cream/50 hover:bg-white/10 hover:text-cream" title="Cerrar sesión"><LogOut className="size-4" /></button>
              </div>
            )}
          </nav>

          <div className="flex items-center gap-2 sm:hidden">
            <button onClick={() => setActiveTab('carrito')} className="relative p-2 text-cream/80 hover:text-cream">
              <ShoppingBag className="size-5" />
              {cartCount > 0 && <Badge className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-gold p-0 text-[10px] font-bold text-ink">{cartCount}</Badge>}
            </button>
          </div>
        </div>

        <div className="flex border-t border-gold/10 sm:hidden">
          {(['catalogo', 'carrito', 'admin'] as const).map((tab) => (
            <button key={tab} onClick={() => { if (tab === 'admin') handleAdminTabClick(); else setActiveTab(tab) }} className={`flex flex-1 items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors ${activeTab === tab ? 'bg-gold/20 text-gold' : 'text-cream/60 hover:text-cream'}`}>
              {tab === 'catalogo' && <Gem className="size-3.5" />}
              {tab === 'carrito' && <ShoppingBag className="size-3.5" />}
              {tab === 'admin' && (isAdminLoggedIn ? <Package className="size-3.5" /> : <Lock className="size-3.5" />)}
              {tab === 'catalogo' ? 'Catálogo' : tab === 'carrito' ? 'Carrito' : 'Admin'}
              {tab === 'carrito' && cartCount > 0 && <Badge className="flex size-4 items-center justify-center rounded-full bg-gold p-0 text-[9px] font-bold text-ink">{cartCount}</Badge>}
            </button>
          ))}
        </div>
      </header>

      {/* ─── MAIN CONTENT ────────────────────────────────────────── */}
      <main className="flex-1">
        {activeTab === 'catalogo' && (
          <CatalogSection products={products} categories={categories} productsLoading={productsLoading} onOpenLightbox={handleOpenLightbox} />
        )}
        {activeTab === 'carrito' && (
          <CartSection onGoToCatalog={() => setActiveTab('catalogo')} />
        )}
        {activeTab === 'admin' && isAdminLoggedIn && (
          <AdminSection
            products={products} customers={customers} ordersData={ordersData} categories={categories}
            productsLoading={productsLoading} customersLoading={customersLoading} ordersLoading={ordersLoading} categoriesLoading={categoriesLoading}
            fetchAllProducts={fetchAllProducts} fetchCustomers={fetchCustomers} fetchOrders={fetchOrders} fetchCategories={fetchCategories}
            onEditProduct={openEditProduct} onNewProduct={openNewProduct} onDeleteProduct={handleDeleteProduct}
            onEditCustomer={openEditCustomer} onNewCustomer={openNewCustomer} onDeleteCustomer={handleDeleteCustomer}
            onViewCustomer={(customer) => { setSelectedCustomer(customer as (Customer & { orderCount?: number; orders?: Order[] })); setShowCustomerDetail(true) }}
            onEditCategory={openEditCategory} onNewCategory={openNewCategory} onDeleteCategory={handleDeleteCategory} onCategorySortOrder={handleCategorySortOrder}
            onViewOrder={(order) => { setSelectedOrder(order); setShowOrderDetail(true) }} onOrderStatusChange={handleOrderStatusChange}
          />
        )}
      </main>

      {/* ─── FOOTER ──────────────────────────────────────────────── */}
      <footer className="mt-auto border-t border-gold/15 bg-ink py-6 text-center">
        <div className="flex items-center justify-center gap-2">
          <img src="/logo.png" alt="Infinito" className="h-6 w-6 rounded-full object-cover" />
          <p className="font-serif text-sm text-gold/70">Infinito ∞ Regalería</p>
        </div>
        <p className="mt-1 text-xs text-cream/40">La Rioja, Argentina — Hecho con ♥ para vos</p>
      </footer>

      {/* ─── MODALS ──────────────────────────────────────────────── */}
      <Modals
        showLoginModal={showLoginModal} setShowLoginModal={setShowLoginModal}
        loginEmail={loginEmail} setLoginEmail={setLoginEmail}
        loginPassword={loginPassword} setLoginPassword={setLoginPassword}
        loginError={loginError} setLoginError={setLoginError}
        loginLoading={loginLoading} onAdminLogin={handleAdminLogin}
        showProductModal={showProductModal} setShowProductModal={setShowProductModal}
        editingProduct={editingProduct} productForm={productForm} setProductForm={setProductForm}
        uploadingImage={uploadingImage} onProductImageUpload={handleProductImageUpload}
        onSaveProduct={handleSaveProduct} categories={categories} onNewCategory={openNewCategoryFromProduct}
        savingProduct={savingProduct}
        showCustomerModal={showCustomerModal} setShowCustomerModal={setShowCustomerModal}
        editingCustomer={editingCustomer} customerForm={customerForm} setCustomerForm={setCustomerForm}
        onSaveCustomer={handleSaveCustomer}
        savingCustomer={savingCustomer}
        showCategoryModal={showCategoryModal} setShowCategoryModal={setShowCategoryModal}
        editingCategory={editingCategory} categoryForm={categoryForm} setCategoryForm={setCategoryForm}
        uploadingCategoryImage={uploadingCategoryImage} onCategoryImageUpload={handleCategoryImageUpload}
        onSaveCategory={handleSaveCategory}
        savingCategory={savingCategory}
        showOrderDetail={showOrderDetail} setShowOrderDetail={setShowOrderDetail} selectedOrder={selectedOrder}
        showCustomerDetail={showCustomerDetail} setShowCustomerDetail={setShowCustomerDetail} selectedCustomer={selectedCustomer}
        lightboxOpen={lightboxOpen} setLightboxOpen={setLightboxOpen} lightboxImages={lightboxImages}
        lightboxIndex={lightboxIndex} setLightboxIndex={setLightboxIndex}
      />
    </div>
  )
}
