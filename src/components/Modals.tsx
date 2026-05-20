'use client'

import { useEffect, useRef } from 'react'
import type { Product, Customer, Order, Category } from '@/lib/types'
import { formatPrice } from '@/lib/whatsapp'
import {
  STATUS_MAP,
  type ProductFormData,
  type CustomerFormData,
  type CategoryFormData,
} from '@/lib/shared'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Lock,
  AlertCircle,
  Plus,
  X,
  Phone,
  Mail,
  Calendar,
  StickyNote,
  Upload,
  Image as ImageIcon,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from 'lucide-react'

// ─── Lightbox Keyboard Handler Component ──────────────────────────────
function LightboxKeyboardHandler({ onLeft, onRight, onEscape }: { onLeft: () => void; onRight: () => void; onEscape: () => void }) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') onLeft()
      else if (e.key === 'ArrowRight') onRight()
      else if (e.key === 'Escape') onEscape()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onLeft, onRight, onEscape])
  return null
}

type CustomerWithCount = Customer & { orderCount?: number; orders?: Order[] }

interface ModalsProps {
  // Login
  showLoginModal: boolean
  setShowLoginModal: (v: boolean) => void
  loginEmail: string
  setLoginEmail: (v: string) => void
  loginPassword: string
  setLoginPassword: (v: string) => void
  loginError: string
  setLoginError: (v: string) => void
  loginLoading: boolean
  onAdminLogin: () => void

  // Product
  showProductModal: boolean
  setShowProductModal: (v: boolean) => void
  editingProduct: Product | null
  productForm: ProductFormData
  setProductForm: (v: ProductFormData | ((prev: ProductFormData) => ProductFormData)) => void
  uploadingImage: boolean
  onProductImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void
  onSaveProduct: () => void
  categories: Category[]
  onNewCategory: () => void
  savingProduct: boolean

  // Customer
  showCustomerModal: boolean
  setShowCustomerModal: (v: boolean) => void
  editingCustomer: (Customer & { orderCount?: number }) | null
  customerForm: CustomerFormData
  setCustomerForm: (v: CustomerFormData | ((prev: CustomerFormData) => CustomerFormData)) => void
  onSaveCustomer: () => void
  savingCustomer: boolean

  // Category
  showCategoryModal: boolean
  setShowCategoryModal: (v: boolean) => void
  editingCategory: Category | null
  categoryForm: CategoryFormData
  setCategoryForm: (v: CategoryFormData | ((prev: CategoryFormData) => CategoryFormData)) => void
  uploadingCategoryImage: boolean
  onCategoryImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void
  onSaveCategory: () => void
  savingCategory: boolean

  // Order detail
  showOrderDetail: boolean
  setShowOrderDetail: (v: boolean) => void
  selectedOrder: Order | null

  // Customer detail
  showCustomerDetail: boolean
  setShowCustomerDetail: (v: boolean) => void
  selectedCustomer: CustomerWithCount | null

  // Lightbox
  lightboxOpen: boolean
  setLightboxOpen: (v: boolean) => void
  lightboxImages: string[]
  lightboxIndex: number
  setLightboxIndex: (v: number | ((prev: number) => number)) => void
}

export default function Modals({
  showLoginModal,
  setShowLoginModal,
  loginEmail,
  setLoginEmail,
  loginPassword,
  setLoginPassword,
  loginError,
  setLoginError,
  loginLoading,
  onAdminLogin,
  showProductModal,
  setShowProductModal,
  editingProduct,
  productForm,
  setProductForm,
  uploadingImage,
  onProductImageUpload,
  onSaveProduct,
  categories,
  onNewCategory,
  savingProduct,
  showCustomerModal,
  setShowCustomerModal,
  editingCustomer,
  customerForm,
  setCustomerForm,
  onSaveCustomer,
  savingCustomer,
  showCategoryModal,
  setShowCategoryModal,
  editingCategory,
  categoryForm,
  setCategoryForm,
  uploadingCategoryImage,
  onCategoryImageUpload,
  onSaveCategory,
  savingCategory,
  showOrderDetail,
  setShowOrderDetail,
  selectedOrder,
  showCustomerDetail,
  setShowCustomerDetail,
  selectedCustomer,
  lightboxOpen,
  setLightboxOpen,
  lightboxImages,
  lightboxIndex,
  setLightboxIndex,
}: ModalsProps) {
  const productFileInputRef = useRef<HTMLInputElement>(null)
  const categoryFileInputRef = useRef<HTMLInputElement>(null)

  return (
    <>
      {/* ─── LOGIN MODAL ─────────────────────────────────────────── */}
      <Dialog open={showLoginModal} onOpenChange={setShowLoginModal}>
        <DialogContent className="border-gold/20 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-serif text-xl text-ink">
              <Lock className="size-5 text-gold" />
              Acceso Administrador
            </DialogTitle>
            <DialogDescription>Ingresá tu correo y contraseña para acceder al panel</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="admin-email">Correo electrónico</Label>
              <Input
                id="admin-email"
                type="email"
                placeholder="admin@infinito.com"
                value={loginEmail}
                onChange={(e) => { setLoginEmail(e.target.value); setLoginError('') }}
                onKeyDown={(e) => e.key === 'Enter' && document.getElementById('admin-password')?.focus()}
                className="mt-1.5 border-gold/30"
                disabled={loginLoading}
              />
            </div>
            <div>
              <Label htmlFor="admin-password">Contraseña</Label>
              <Input
                id="admin-password"
                type="password"
                placeholder="••••••••"
                value={loginPassword}
                onChange={(e) => { setLoginPassword(e.target.value); setLoginError('') }}
                onKeyDown={(e) => e.key === 'Enter' && onAdminLogin()}
                className="mt-1.5 border-gold/30"
                disabled={loginLoading}
              />
              {loginError && (
                <p className="mt-1.5 flex items-center gap-1 text-sm text-[#8B3A3A]">
                  <AlertCircle className="size-3.5" />
                  {loginError}
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLoginModal(false)} className="border-gold/30" disabled={loginLoading}>
              Cancelar
            </Button>
            <Button onClick={onAdminLogin} disabled={loginLoading} className="bg-gold text-ink hover:bg-gold-dark min-w-[120px]">
              {loginLoading ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Ingresando...
                </>
              ) : (
                'Ingresar'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── PRODUCT FORM MODAL ──────────────────────────────────── */}
      <Dialog open={showProductModal} onOpenChange={setShowProductModal}>
        <DialogContent className="max-h-[90vh] overflow-y-auto border-gold/20 sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl text-ink">
              {editingProduct ? 'Editar Producto' : 'Agregar Producto'}
            </DialogTitle>
            <DialogDescription>
              {editingProduct ? 'Modificá los datos del producto' : 'Completá los datos del nuevo producto'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div>
              <Label>Nombre *</Label>
              <Input
                value={productForm.name}
                onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                className="mt-1 border-gold/30"
                placeholder="Nombre del producto"
              />
            </div>
            <div>
              <Label>Descripción</Label>
              <Textarea
                value={productForm.description}
                onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                className="mt-1 border-gold/30"
                placeholder="Descripción del producto"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Categoría</Label>
                <div className="mt-1 flex gap-1.5">
                  <Select
                    value={productForm.category}
                    onValueChange={(val) => setProductForm({ ...productForm, category: val })}
                  >
                    <SelectTrigger className="border-gold/30 flex-1">
                      <SelectValue placeholder="Seleccionar..." />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.length > 0 ? (
                        categories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
                        ))
                      ) : (
                        <>
                          <SelectItem value="General">General</SelectItem>
                          <SelectItem value="Joyas">Joyas</SelectItem>
                          <SelectItem value="Perfumes">Perfumes</SelectItem>
                          <SelectItem value="Indumentaria">Indumentaria</SelectItem>
                          <SelectItem value="Accesorios">Accesorios</SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="shrink-0 gap-1 border-gold/30 px-2 hover:bg-gold/10"
                    onClick={onNewCategory}
                    title="Crear nueva categoría"
                  >
                    <Plus className="size-3.5" />
                    <span className="hidden sm:inline text-xs">Nueva</span>
                  </Button>
                </div>
              </div>
              <div>
                <Label>Talle</Label>
                <Input
                  value={productForm.talle}
                  onChange={(e) => setProductForm({ ...productForm, talle: e.target.value })}
                  className="mt-1 border-gold/30"
                  placeholder="S / M / L / Único"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Precio *</Label>
                <Input
                  type="number"
                  value={productForm.price}
                  onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
                  className="mt-1 border-gold/30"
                  placeholder="0"
                />
              </div>
              <div>
                <Label>Costo</Label>
                <Input
                  type="number"
                  value={productForm.costPrice}
                  onChange={(e) => setProductForm({ ...productForm, costPrice: e.target.value })}
                  className="mt-1 border-gold/30"
                  placeholder="0"
                />
              </div>
              <div>
                <Label>Precio promo</Label>
                <Input
                  type="number"
                  value={productForm.promoPrice}
                  onChange={(e) => setProductForm({ ...productForm, promoPrice: e.target.value })}
                  className="mt-1 border-gold/30"
                  placeholder="0"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Stock</Label>
                <Input
                  type="number"
                  value={productForm.stock}
                  onChange={(e) => setProductForm({ ...productForm, stock: e.target.value })}
                  className="mt-1 border-gold/30"
                />
              </div>
            </div>

            {/* Image Upload Section */}
            <div>
              <Label>Imágenes del producto</Label>
              <div className="mt-1 space-y-3">
                {/* Image Thumbnails */}
                {productForm.images.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {productForm.images.map((img, idx) => (
                      <div key={idx} className="relative inline-block">
                        <img
                          src={img}
                          alt={`Imagen ${idx + 1}`}
                          className={`h-20 w-20 rounded-lg border object-cover ${
                            idx === 0 ? 'border-gold ring-2 ring-gold/40' : 'border-gold/20'
                          }`}
                        />
                        {idx === 0 && (
                          <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 rounded bg-gold px-1.5 py-0.5 text-[9px] font-bold text-ink">
                            Principal
                          </span>
                        )}
                        <button
                          onClick={() => {
                            setProductForm((prev: ProductFormData) => {
                              const newImages = prev.images.filter((_, i) => i !== idx)
                              const newImageUrl = idx === 0
                                ? (newImages.length > 0 ? newImages[0] : '')
                                : prev.imageUrl
                              return { ...prev, images: newImages, imageUrl: newImageUrl }
                            })
                          }}
                          className="absolute -right-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full bg-[#8B3A3A] text-white shadow-sm hover:bg-[#6d2d2d]"
                        >
                          <X className="size-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Upload button */}
                <div className="flex items-center gap-2">
                  <input
                    ref={productFileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={onProductImageUpload}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="gap-1.5 border-gold/30"
                    onClick={() => productFileInputRef.current?.click()}
                    disabled={uploadingImage}
                  >
                    {uploadingImage ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Upload className="size-4" />
                    )}
                    {uploadingImage ? 'Subiendo...' : 'Subir imagen'}
                  </Button>
                  <span className="text-xs text-ink-muted">Podés subir varias imágenes</span>
                </div>

                {/* URL Input for single primary image */}
                <div className="flex items-center gap-2">
                  <ImageIcon className="size-4 shrink-0 text-ink-muted" />
                  <Input
                    value={productForm.imageUrl}
                    onChange={(e) => setProductForm({ ...productForm, imageUrl: e.target.value })}
                    className="border-gold/30"
                    placeholder="URL imagen principal: https://... o /uploads/..."
                  />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowProductModal(false)} className="border-gold/30" disabled={savingProduct}>
              Cancelar
            </Button>
            <Button
              onClick={onSaveProduct}
              disabled={savingProduct || uploadingImage}
              className="bg-gold text-ink hover:bg-gold-dark min-w-[140px]"
            >
              {savingProduct ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                editingProduct ? 'Guardar cambios' : 'Crear producto'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── CUSTOMER FORM MODAL ─────────────────────────────────── */}
      <Dialog open={showCustomerModal} onOpenChange={setShowCustomerModal}>
        <DialogContent className="max-h-[90vh] overflow-y-auto border-gold/20 sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl text-ink">
              {editingCustomer ? 'Editar Cliente' : 'Agregar Cliente'}
            </DialogTitle>
            <DialogDescription>
              {editingCustomer ? 'Modificá los datos del cliente' : 'Completá los datos del nuevo cliente'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Nombre *</Label>
                <Input
                  value={customerForm.name}
                  onChange={(e) => setCustomerForm({ ...customerForm, name: e.target.value })}
                  className="mt-1 border-gold/30"
                  placeholder="Nombre completo"
                />
              </div>
              <div>
                <Label>Teléfono *</Label>
                <Input
                  value={customerForm.phone}
                  onChange={(e) => setCustomerForm({ ...customerForm, phone: e.target.value })}
                  className="mt-1 border-gold/30"
                  placeholder="3804XXXXXX"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={customerForm.email}
                  onChange={(e) => setCustomerForm({ ...customerForm, email: e.target.value })}
                  className="mt-1 border-gold/30"
                  placeholder="email@ejemplo.com"
                />
              </div>
              <div>
                <Label>Dirección</Label>
                <Input
                  value={customerForm.address}
                  onChange={(e) => setCustomerForm({ ...customerForm, address: e.target.value })}
                  className="mt-1 border-gold/30"
                  placeholder="Dirección"
                />
              </div>
            </div>
            <div>
              <Label>Tags</Label>
              <Input
                value={customerForm.tags}
                onChange={(e) => setCustomerForm({ ...customerForm, tags: e.target.value })}
                className="mt-1 border-gold/30"
                placeholder="VIP, Nuevo, Frecuente (separados por coma)"
              />
            </div>
            <div>
              <Label>Notas</Label>
              <Textarea
                value={customerForm.notes}
                onChange={(e) => setCustomerForm({ ...customerForm, notes: e.target.value })}
                className="mt-1 border-gold/30"
                placeholder="Notas sobre el cliente..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCustomerModal(false)} className="border-gold/30" disabled={savingCustomer}>
              Cancelar
            </Button>
            <Button
              onClick={onSaveCustomer}
              disabled={savingCustomer}
              className="bg-gold text-ink hover:bg-gold-dark min-w-[140px]"
            >
              {savingCustomer ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                editingCustomer ? 'Guardar cambios' : 'Crear cliente'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── CATEGORY FORM MODAL ─────────────────────────────────── */}
      <Dialog open={showCategoryModal} onOpenChange={setShowCategoryModal}>
        <DialogContent className="max-h-[90vh] overflow-y-auto border-gold/20 sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl text-ink">
              {editingCategory ? 'Editar Categoría' : 'Agregar Categoría'}
            </DialogTitle>
            <DialogDescription>
              {editingCategory ? 'Modificá los datos de la categoría' : 'Completá los datos de la nueva categoría'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div>
              <Label>Nombre *</Label>
              <Input
                value={categoryForm.name}
                onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                className="mt-1 border-gold/30"
                placeholder="Nombre de la categoría"
              />
            </div>
            <div>
              <Label>Descripción</Label>
              <Textarea
                value={categoryForm.description}
                onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                className="mt-1 border-gold/30"
                placeholder="Descripción de la categoría"
                rows={2}
              />
            </div>
            <div>
              <Label>Orden</Label>
              <Input
                type="number"
                value={categoryForm.sortOrder}
                onChange={(e) => setCategoryForm({ ...categoryForm, sortOrder: parseInt(e.target.value) || 0 })}
                className="mt-1 border-gold/30"
                placeholder="0"
              />
              <p className="mt-1 text-xs text-ink-muted">Las categorías se ordenan de menor a mayor</p>
            </div>

            {/* Category Image Upload */}
            <div>
              <Label>Imagen de la categoría</Label>
              <div className="mt-1 space-y-3">
                {/* Image Preview */}
                {categoryForm.imageUrl && (
                  <div className="relative inline-block">
                    <img
                      src={categoryForm.imageUrl}
                      alt="Preview"
                      className="h-32 w-32 rounded-lg border border-gold/20 object-cover"
                    />
                    <button
                      onClick={() => setCategoryForm({ ...categoryForm, imageUrl: '' })}
                      className="absolute -right-2 -top-2 flex size-6 items-center justify-center rounded-full bg-[#8B3A3A] text-white shadow-sm hover:bg-[#6d2d2d]"
                    >
                      <X className="size-3" />
                    </button>
                  </div>
                )}

                {/* Upload button */}
                <div className="flex items-center gap-2">
                  <input
                    ref={categoryFileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={onCategoryImageUpload}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="gap-1.5 border-gold/30"
                    onClick={() => categoryFileInputRef.current?.click()}
                    disabled={uploadingCategoryImage}
                  >
                    {uploadingCategoryImage ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Upload className="size-4" />
                    )}
                    {uploadingCategoryImage ? 'Subiendo...' : 'Subir imagen'}
                  </Button>
                  <span className="text-xs text-ink-muted">o pegá una URL:</span>
                </div>

                {/* URL Input */}
                <div className="flex items-center gap-2">
                  <ImageIcon className="size-4 shrink-0 text-ink-muted" />
                  <Input
                    value={categoryForm.imageUrl}
                    onChange={(e) => setCategoryForm({ ...categoryForm, imageUrl: e.target.value })}
                    className="border-gold/30"
                    placeholder="https://... o /uploads/..."
                  />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCategoryModal(false)} className="border-gold/30" disabled={savingCategory}>
              Cancelar
            </Button>
            <Button
              onClick={onSaveCategory}
              disabled={savingCategory || uploadingCategoryImage}
              className="bg-gold text-ink hover:bg-gold-dark min-w-[140px]"
            >
              {savingCategory ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                editingCategory ? 'Guardar cambios' : 'Crear categoría'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── ORDER DETAIL MODAL ──────────────────────────────────── */}
      <Dialog open={showOrderDetail} onOpenChange={setShowOrderDetail}>
        <DialogContent className="max-h-[90vh] overflow-y-auto border-gold/20 sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl text-ink">
              Detalle del Pedido
            </DialogTitle>
            <DialogDescription>
              Pedido del {selectedOrder && new Date(selectedOrder.createdAt).toLocaleDateString('es-AR', {
                day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
              })}
            </DialogDescription>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              {/* Customer info */}
              <div className="rounded-lg bg-secondary p-3">
                <p className="font-serif font-semibold text-ink">{selectedOrder.customerName || 'Sin nombre'}</p>
                {selectedOrder.customerPhone && (
                  <p className="text-sm text-ink-muted flex items-center gap-1.5 mt-1">
                    <Phone className="size-3" /> {selectedOrder.customerPhone}
                  </p>
                )}
                {selectedOrder.notes && (
                  <p className="text-sm text-ink-muted flex items-center gap-1.5 mt-1">
                    <StickyNote className="size-3" /> {selectedOrder.notes}
                  </p>
                )}
              </div>

              {/* Status */}
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-ink-muted">Estado:</span>
                <Badge className={`border ${STATUS_MAP[selectedOrder.status]?.color || ''}`}>
                  {STATUS_MAP[selectedOrder.status]?.label || selectedOrder.status}
                </Badge>
              </div>

              {/* Items */}
              <div>
                <h4 className="mb-2 text-sm font-semibold text-ink">Artículos</h4>
                <div className="space-y-2">
                  {selectedOrder.items?.map((item) => (
                    <div key={item.id} className="flex items-center justify-between rounded-md border border-gold/10 p-2.5">
                      <div>
                        <p className="text-sm font-medium text-ink">{item.name}</p>
                        {item.talle && <p className="text-xs text-ink-muted">Talle: {item.talle}</p>}
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-ink">{item.quantity}x {formatPrice(item.price)}</p>
                        <p className="text-xs text-ink-muted">{formatPrice(item.price * item.quantity)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <Separator className="bg-gold/20" />

              {/* Total */}
              <div className="flex items-center justify-between">
                <span className="font-serif text-lg text-ink-muted">Total</span>
                <span className="font-sans text-xl font-bold text-ink">{formatPrice(selectedOrder.total)}</span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ─── CUSTOMER DETAIL MODAL ───────────────────────────────── */}
      <Dialog open={showCustomerDetail} onOpenChange={setShowCustomerDetail}>
        <DialogContent className="max-h-[90vh] overflow-y-auto border-gold/20 sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl text-ink">
              Detalle del Cliente
            </DialogTitle>
          </DialogHeader>
          {selectedCustomer && (
            <div className="space-y-4">
              <div>
                <p className="font-serif text-xl font-bold text-ink">{selectedCustomer.name}</p>
                <div className="mt-2 space-y-1.5">
                  <p className="flex items-center gap-2 text-sm text-ink-muted">
                    <Phone className="size-4" /> {selectedCustomer.phone}
                  </p>
                  {selectedCustomer.email && (
                    <p className="flex items-center gap-2 text-sm text-ink-muted">
                      <Mail className="size-4" /> {selectedCustomer.email}
                    </p>
                  )}
                  {selectedCustomer.address && (
                    <p className="text-sm text-ink-muted">{selectedCustomer.address}</p>
                  )}
                </div>
              </div>

              {/* Tags */}
              {selectedCustomer.tags && (
                <div className="flex flex-wrap gap-1">
                  {selectedCustomer.tags.split(',').map((tag: string) => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      className={`text-xs ${
                        tag.trim().toLowerCase() === 'vip' ? 'bg-gold/20 text-gold-dark' :
                        tag.trim().toLowerCase() === 'nuevo' ? 'bg-[#4A7C59]/10 text-[#4A7C59]' :
                        tag.trim().toLowerCase() === 'frecuente' ? 'bg-blue-50 text-blue-700' : ''
                      }`}
                    >
                      {tag.trim()}
                    </Badge>
                  ))}
                </div>
              )}

              {/* Notes */}
              {selectedCustomer.notes && (
                <div className="rounded-lg bg-secondary p-3">
                  <p className="text-xs font-medium uppercase tracking-wider text-ink-muted mb-1">Notas</p>
                  <p className="text-sm text-ink">{selectedCustomer.notes}</p>
                </div>
              )}

              {/* Stats */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-secondary p-3 text-center">
                  <p className="font-serif text-2xl font-bold text-ink">{selectedCustomer.orderCount || 0}</p>
                  <p className="text-xs text-ink-muted">Pedidos</p>
                </div>
                <div className="rounded-lg bg-secondary p-3 text-center">
                  <p className="font-serif text-sm font-medium text-ink">
                    {new Date(selectedCustomer.createdAt).toLocaleDateString('es-AR')}
                  </p>
                  <p className="text-xs text-ink-muted">Cliente desde</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ─── IMAGE LIGHTBOX MODAL ──────────────────────────────────── */}
      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent className="z-[100] max-w-4xl border-none bg-black/95 p-0 sm:max-w-5xl">
          <button
            onClick={() => setLightboxOpen(false)}
            className="absolute right-3 top-3 z-10 flex size-9 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition-colors hover:bg-white/20"
            aria-label="Cerrar"
          >
            <X className="size-5" />
          </button>

          {/* Image counter */}
          {lightboxImages.length > 1 && (
            <div className="absolute left-3 top-3 z-10 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm">
              {lightboxIndex + 1} / {lightboxImages.length}
            </div>
          )}

          <div className="relative flex min-h-[50vh] items-center justify-center sm:min-h-[70vh]">
            {lightboxImages.length > 0 && (
              <img
                src={lightboxImages[lightboxIndex]}
                alt={`Imagen ${lightboxIndex + 1}`}
                className="max-h-[80vh] max-w-full rounded-lg object-contain"
              />
            )}

            {/* Left Arrow */}
            {lightboxImages.length > 1 && (
              <button
                onClick={() =>
                  setLightboxIndex((prev: number) => (prev - 1 + lightboxImages.length) % lightboxImages.length)
                }
                className="absolute left-2 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition-colors hover:bg-white/20 sm:size-12"
                aria-label="Imagen anterior"
              >
                <ChevronLeft className="size-6" />
              </button>
            )}

            {/* Right Arrow */}
            {lightboxImages.length > 1 && (
              <button
                onClick={() =>
                  setLightboxIndex((prev: number) => (prev + 1) % lightboxImages.length)
                }
                className="absolute right-2 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition-colors hover:bg-white/20 sm:size-12"
                aria-label="Siguiente imagen"
              >
                <ChevronRight className="size-6" />
              </button>
            )}
          </div>

          {/* Dot indicators */}
          {lightboxImages.length > 1 && (
            <div className="flex justify-center gap-2 pb-4 pt-2">
              {lightboxImages.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setLightboxIndex(idx)}
                  className={`size-2 rounded-full transition-colors ${
                    idx === lightboxIndex ? 'bg-white' : 'bg-white/40'
                  }`}
                  aria-label={`Ir a imagen ${idx + 1}`}
                />
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Keyboard navigation for lightbox */}
      {lightboxOpen && (
        <LightboxKeyboardHandler
          onLeft={() => setLightboxIndex((prev: number) => (prev - 1 + lightboxImages.length) % lightboxImages.length)}
          onRight={() => setLightboxIndex((prev: number) => (prev + 1) % lightboxImages.length)}
          onEscape={() => setLightboxOpen(false)}
        />
      )}
    </>
  )
}
