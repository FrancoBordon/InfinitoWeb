'use client'

import { useState, useMemo } from 'react'
import type { Product, Customer, Order, Category } from '@/lib/types'
import { formatPrice } from '@/lib/whatsapp'
import { STATUS_MAP, getGradient } from '@/lib/shared'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Package,
  Users,
  ClipboardList,
  Layers,
  Plus,
  Minus,
  Trash2,
  Edit,
  Eye,
  Search,
  UserPlus,
  Phone,
  Mail,
  Calendar,
  ArrowUp,
  ArrowDown,
  FolderOpen,
} from 'lucide-react'

type CustomerWithCount = Customer & { orderCount?: number }

interface AdminSectionProps {
  products: Product[]
  customers: CustomerWithCount[]
  ordersData: { orders: Order[]; total: number }
  categories: Category[]
  productsLoading: boolean
  customersLoading: boolean
  ordersLoading: boolean
  categoriesLoading: boolean
  fetchAllProducts: () => void
  fetchCustomers: (search?: string) => void
  fetchOrders: (status?: string) => void
  fetchCategories: () => void
  onEditProduct: (product: Product) => void
  onNewProduct: () => void
  onDeleteProduct: (id: string) => void
  onEditCustomer: (customer: CustomerWithCount) => void
  onNewCustomer: () => void
  onDeleteCustomer: (id: string) => void
  onViewCustomer: (customer: CustomerWithCount) => void
  onEditCategory: (category: Category) => void
  onNewCategory: () => void
  onDeleteCategory: (id: string) => void
  onCategorySortOrder: (category: Category, direction: 'up' | 'down') => void
  onViewOrder: (order: Order) => void
  onOrderStatusChange: (orderId: string, newStatus: string) => void
}

export default function AdminSection({
  products,
  customers,
  ordersData,
  categories,
  productsLoading,
  customersLoading,
  ordersLoading,
  categoriesLoading,
  fetchAllProducts,
  fetchCustomers,
  fetchOrders,
  fetchCategories,
  onEditProduct,
  onNewProduct,
  onDeleteProduct,
  onEditCustomer,
  onNewCustomer,
  onDeleteCustomer,
  onViewCustomer,
  onEditCategory,
  onNewCategory,
  onDeleteCategory,
  onCategorySortOrder,
  onViewOrder,
  onOrderStatusChange,
}: AdminSectionProps) {
  const [adminTab, setAdminTab] = useState<'stock' | 'clientes' | 'pedidos' | 'categorias'>('stock')
  const [customerSearch, setCustomerSearch] = useState('')
  const [orderStatusFilter, setOrderStatusFilter] = useState('all')
  const [adminCategoryFilter, setAdminCategoryFilter] = useState('Todos')

  // ─── Computed Values ─────────────────────────────────────────────
  const activeProducts = useMemo(() => products.filter((p) => p.active !== false), [products])

  const adminFilteredProducts = useMemo(() => {
    const base = adminCategoryFilter === 'Todos' ? activeProducts : activeProducts.filter((p) => p.category === adminCategoryFilter)
    return base
  }, [activeProducts, adminCategoryFilter])

  const adminCategories = useMemo(() => {
    const cats = [...new Set(activeProducts.map((p) => p.category))]
    return ['Todos', ...cats]
  }, [activeProducts])

  const stockStats = useMemo(() => {
    const total = activeProducts.length
    const inStock = activeProducts.filter((p) => p.stock > 0).length
    const outOfStock = activeProducts.filter((p) => p.stock === 0).length
    const totalValue = activeProducts.reduce((sum, p) => sum + p.price * p.stock, 0)
    return { total, inStock, outOfStock, totalValue }
  }, [activeProducts])

  const customerStats = useMemo(() => {
    const total = customers.length
    const thisMonth = customers.filter((c) => {
      const d = new Date(c.createdAt)
      const now = new Date()
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    }).length
    const withOrders = customers.filter((c) => c.orderCount && c.orderCount > 0).length
    return { total, thisMonth, withOrders }
  }, [customers])

  const orderStats = useMemo(() => {
    const ords = ordersData.orders
    const total = ordersData.total
    const pending = ords.filter((o) => o.status === 'pending').length
    const delivered = ords.filter((o) => o.status === 'delivered').length
    return { total, pending, delivered }
  }, [ordersData])

  // ─── Trigger fetches when tab/filter changes ──────────────────
  // Note: These are handled by the parent via effects, but we also
  // need to trigger customer/order fetches when search/filter changes
  const handleCustomerSearch = (value: string) => {
    setCustomerSearch(value)
    fetchCustomers(value)
  }

  const handleOrderStatusFilter = (value: string) => {
    setOrderStatusFilter(value)
    fetchOrders(value)
  }

  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-6">
      {/* Admin Tabs */}
      <div className="mb-6 flex gap-1 rounded-lg bg-secondary p-1">
        {([
          { key: 'stock' as const, label: 'Stock', icon: Package },
          { key: 'clientes' as const, label: 'Clientes', icon: Users },
          { key: 'pedidos' as const, label: 'Pedidos', icon: ClipboardList },
          { key: 'categorias' as const, label: 'Categorías', icon: Layers },
        ] as const).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setAdminTab(tab.key)}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-all ${
              adminTab === tab.key
                ? 'bg-card text-ink shadow-sm'
                : 'text-ink-muted hover:text-ink'
            }`}
          >
            <tab.icon className="size-4" />
            <span className="hidden sm:inline">{tab.label}</span>
            <span className="sm:hidden text-xs">{tab.label.slice(0, 5)}</span>
          </button>
        ))}
      </div>

      {/* ─── ADMIN: STOCK ──────────────────────────────────── */}
      {adminTab === 'stock' && (
        <div>
          {/* Summary Cards */}
          <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Card className="border-gold/15">
              <CardContent className="p-4">
                <p className="text-xs font-medium uppercase tracking-wider text-ink-muted">Total productos</p>
                <p className="font-serif text-2xl font-bold text-ink">{stockStats.total}</p>
              </CardContent>
            </Card>
            <Card className="border-gold/15">
              <CardContent className="p-4">
                <p className="text-xs font-medium uppercase tracking-wider text-ink-muted">En stock</p>
                <p className="font-serif text-2xl font-bold text-[#4A7C59]">{stockStats.inStock}</p>
              </CardContent>
            </Card>
            <Card className="border-gold/15">
              <CardContent className="p-4">
                <p className="text-xs font-medium uppercase tracking-wider text-ink-muted">Sin stock</p>
                <p className="font-serif text-2xl font-bold text-[#8B3A3A]">{stockStats.outOfStock}</p>
              </CardContent>
            </Card>
            <Card className="border-gold/15">
              <CardContent className="p-4">
                <p className="text-xs font-medium uppercase tracking-wider text-ink-muted">Valor total</p>
                <p className="font-sans text-lg font-bold text-ink">{formatPrice(stockStats.totalValue)}</p>
              </CardContent>
            </Card>
          </div>

          {/* Filter + Add */}
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              {adminCategories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setAdminCategoryFilter(cat)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-all ${
                    adminCategoryFilter === cat
                      ? 'bg-gold text-ink'
                      : 'bg-secondary text-ink-muted hover:bg-gold-light/40'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
            <Button onClick={onNewProduct} className="gap-1.5 bg-gold text-ink hover:bg-gold-dark" size="sm">
              <Plus className="size-4" />
              Agregar producto
            </Button>
          </div>

          {/* Product Table */}
          <div className="overflow-x-auto rounded-xl border border-gold/15 bg-card">
            <Table>
              <TableHeader>
                <TableRow className="border-gold/15 hover:bg-transparent">
                  <TableHead className="text-ink-muted">Producto</TableHead>
                  <TableHead className="text-ink-muted">Categoría</TableHead>
                  <TableHead className="text-right text-ink-muted">Precio</TableHead>
                  <TableHead className="text-right text-ink-muted">Costo</TableHead>
                  <TableHead className="text-right text-ink-muted">Margen</TableHead>
                  <TableHead className="text-center text-ink-muted">Stock</TableHead>
                  <TableHead className="text-right text-ink-muted">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {adminFilteredProducts.map((product) => {
                  const costPrice = product.costPrice ?? 0
                  const margin = product.price - costPrice
                  const marginPct = product.price > 0 ? Math.round((margin / product.price) * 100) : 0
                  return (
                    <TableRow key={product.id} className="border-gold/10">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="size-10 shrink-0 overflow-hidden rounded-md">
                            {product.imageUrl ? (
                              <img src={product.imageUrl} alt={product.name} className="size-full object-cover" />
                            ) : (
                              <div className={`flex size-full items-center justify-center bg-gradient-to-br ${getGradient(product.name)}`}>
                                <span className="text-xs font-bold text-white/70">{product.name.charAt(0)}</span>
                              </div>
                            )}
                          </div>
                          <div>
                            <p className="font-serif text-sm font-semibold text-ink">{product.name}</p>
                            {product.talle && <p className="text-[11px] text-ink-muted">Talle: {product.talle}</p>}
                            {product.promoPrice && (
                              <p className="text-[11px] font-medium text-[#8B3A3A]">Promo: {formatPrice(product.promoPrice)}</p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-[11px]">{product.category}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-sans text-sm font-medium text-ink">
                        {formatPrice(product.price)}
                      </TableCell>
                      <TableCell className="text-right font-sans text-sm text-ink-muted">
                        {formatPrice(costPrice)}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={`text-sm font-medium ${marginPct >= 50 ? 'text-[#4A7C59]' : marginPct >= 30 ? 'text-ink' : 'text-[#8B3A3A]'}`}>
                          {marginPct}%
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={async () => {
                              await fetch(`/api/products/${product.id}`, {
                                method: 'PUT',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ stock: Math.max(0, product.stock - 1) }),
                              })
                              fetchAllProducts()
                            }}
                            className="flex size-6 items-center justify-center rounded border border-gold/30 text-ink-muted hover:bg-gold/10"
                          >
                            <Minus className="size-3" />
                          </button>
                          <span className={`w-8 text-center text-sm font-semibold ${product.stock === 0 ? 'text-[#8B3A3A]' : 'text-ink'}`}>
                            {product.stock}
                          </span>
                          <button
                            onClick={async () => {
                              await fetch(`/api/products/${product.id}`, {
                                method: 'PUT',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ stock: product.stock + 1 }),
                              })
                              fetchAllProducts()
                            }}
                            className="flex size-6 items-center justify-center rounded border border-gold/30 text-ink-muted hover:bg-gold/10"
                          >
                            <Plus className="size-3" />
                          </button>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 text-ink-muted hover:text-gold"
                            onClick={() => onEditProduct(product)}
                          >
                            <Edit className="size-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 text-ink-muted hover:text-[#8B3A3A]"
                            onClick={() => onDeleteProduct(product.id)}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
                {adminFilteredProducts.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="py-12 text-center text-ink-muted">
                      No hay productos
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* ─── ADMIN: CLIENTES ───────────────────────────────── */}
      {adminTab === 'clientes' && (
        <div>
          {/* Summary Cards */}
          <div className="mb-6 grid grid-cols-3 gap-3">
            <Card className="border-gold/15">
              <CardContent className="p-4">
                <p className="text-xs font-medium uppercase tracking-wider text-ink-muted">Total clientes</p>
                <p className="font-serif text-2xl font-bold text-ink">{customerStats.total}</p>
              </CardContent>
            </Card>
            <Card className="border-gold/15">
              <CardContent className="p-4">
                <p className="text-xs font-medium uppercase tracking-wider text-ink-muted">Nuevos este mes</p>
                <p className="font-serif text-2xl font-bold text-gold">{customerStats.thisMonth}</p>
              </CardContent>
            </Card>
            <Card className="border-gold/15">
              <CardContent className="p-4">
                <p className="text-xs font-medium uppercase tracking-wider text-ink-muted">Con pedidos</p>
                <p className="font-serif text-2xl font-bold text-[#4A7C59]">{customerStats.withOrders}</p>
              </CardContent>
            </Card>
          </div>

          {/* Search + Add */}
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-muted" />
              <Input
                placeholder="Buscar clientes..."
                value={customerSearch}
                onChange={(e) => handleCustomerSearch(e.target.value)}
                className="border-gold/30 bg-white pl-10"
              />
            </div>
            <Button onClick={onNewCustomer} className="gap-1.5 bg-gold text-ink hover:bg-gold-dark" size="sm">
              <UserPlus className="size-4" />
              Agregar cliente
            </Button>
          </div>

          {/* Customer List */}
          {customersLoading ? (
            <div className="flex justify-center py-12">
              <div className="size-8 animate-spin rounded-full border-2 border-gold border-t-transparent" />
            </div>
          ) : customers.length === 0 ? (
            <div className="py-12 text-center text-ink-muted">
              <Users className="mx-auto mb-3 size-12 text-gold/30" />
              <p className="font-serif text-lg">No hay clientes</p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {customers.map((customer) => {
                const tagsList = customer.tags ? customer.tags.split(',').map(t => t.trim()).filter(Boolean) : []
                return (
                  <Card key={customer.id} className="border-gold/15 transition-all hover:shadow-md">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-serif text-base font-semibold text-ink truncate">{customer.name}</p>
                          <div className="mt-1.5 space-y-1">
                            <div className="flex items-center gap-1.5 text-xs text-ink-muted">
                              <Phone className="size-3" />
                              {customer.phone}
                            </div>
                            {customer.email && (
                              <div className="flex items-center gap-1.5 text-xs text-ink-muted">
                                <Mail className="size-3" />
                                <span className="truncate">{customer.email}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7 text-ink-muted hover:text-gold"
                            onClick={() => onViewCustomer(customer)}
                          >
                            <Eye className="size-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7 text-ink-muted hover:text-gold"
                            onClick={() => onEditCustomer(customer)}
                          >
                            <Edit className="size-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7 text-ink-muted hover:text-[#8B3A3A]"
                            onClick={() => onDeleteCustomer(customer.id)}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </div>

                      {/* Tags */}
                      {tagsList.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {tagsList.map((tag) => (
                            <Badge
                              key={tag}
                              variant="secondary"
                              className={`text-[10px] ${
                                tag.toLowerCase() === 'vip' ? 'bg-gold/20 text-gold-dark' :
                                tag.toLowerCase() === 'nuevo' ? 'bg-[#4A7C59]/10 text-[#4A7C59]' :
                                tag.toLowerCase() === 'frecuente' ? 'bg-blue-50 text-blue-700' :
                                ''
                              }`}
                            >
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}

                      {/* Footer */}
                      <div className="mt-3 flex items-center justify-between text-[11px] text-ink-muted">
                        <span className="flex items-center gap-1">
                          <ClipboardList className="size-3" />
                          {customer.orderCount || 0} pedidos
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="size-3" />
                          {new Date(customer.createdAt).toLocaleDateString('es-AR')}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ─── ADMIN: PEDIDOS ────────────────────────────────── */}
      {adminTab === 'pedidos' && (
        <div>
          {/* Summary Cards */}
          <div className="mb-6 grid grid-cols-3 gap-3">
            <Card className="border-gold/15">
              <CardContent className="p-4">
                <p className="text-xs font-medium uppercase tracking-wider text-ink-muted">Total pedidos</p>
                <p className="font-serif text-2xl font-bold text-ink">{orderStats.total}</p>
              </CardContent>
            </Card>
            <Card className="border-gold/15">
              <CardContent className="p-4">
                <p className="text-xs font-medium uppercase tracking-wider text-ink-muted">Pendientes</p>
                <p className="font-serif text-2xl font-bold text-yellow-700">{orderStats.pending}</p>
              </CardContent>
            </Card>
            <Card className="border-gold/15">
              <CardContent className="p-4">
                <p className="text-xs font-medium uppercase tracking-wider text-ink-muted">Entregados</p>
                <p className="font-serif text-2xl font-bold text-[#4A7C59]">{orderStats.delivered}</p>
              </CardContent>
            </Card>
          </div>

          {/* Filter */}
          <div className="mb-4">
            <Select value={orderStatusFilter} onValueChange={handleOrderStatusFilter}>
              <SelectTrigger className="w-48 border-gold/30 bg-white">
                <SelectValue placeholder="Filtrar por estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="pending">Pendiente</SelectItem>
                <SelectItem value="confirmed">Confirmado</SelectItem>
                <SelectItem value="shipped">Enviado</SelectItem>
                <SelectItem value="delivered">Entregado</SelectItem>
                <SelectItem value="cancelled">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Orders */}
          {ordersLoading ? (
            <div className="flex justify-center py-12">
              <div className="size-8 animate-spin rounded-full border-2 border-gold border-t-transparent" />
            </div>
          ) : ordersData.orders.length === 0 ? (
            <div className="py-12 text-center text-ink-muted">
              <ClipboardList className="mx-auto mb-3 size-12 text-gold/30" />
              <p className="font-serif text-lg">No hay pedidos</p>
            </div>
          ) : (
            <div className="space-y-3">
              {ordersData.orders.map((order) => {
                const statusInfo = STATUS_MAP[order.status] || STATUS_MAP.pending
                const statusOptions = order.status === 'pending'
                  ? [['pending', 'Pendiente'], ['confirmed', 'Confirmado'], ['cancelled', 'Cancelado']]
                  : order.status === 'confirmed'
                    ? [['confirmed', 'Confirmado'], ['shipped', 'Enviado'], ['cancelled', 'Cancelado']]
                    : order.status === 'shipped'
                      ? [['shipped', 'Enviado'], ['delivered', 'Entregado']]
                      : order.status === 'delivered'
                        ? [['delivered', 'Entregado']]
                        : [['cancelled', 'Cancelado']]
                return (
                  <Card key={order.id} className="border-gold/15 transition-all hover:shadow-md">
                    <CardContent className="p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-serif text-base font-semibold text-ink">
                              {order.customerName || 'Cliente sin nombre'}
                            </span>
                            <Badge className={`text-[11px] border ${statusInfo.color}`}>
                              {statusInfo.label}
                            </Badge>
                          </div>
                          <div className="space-y-0.5 text-xs text-ink-muted">
                            <p className="flex items-center gap-1.5">
                              <Calendar className="size-3" />
                              {new Date(order.createdAt).toLocaleDateString('es-AR', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </p>
                            {order.customerPhone && (
                              <p className="flex items-center gap-1.5">
                                <Phone className="size-3" />
                                {order.customerPhone}
                              </p>
                            )}
                            <p className="text-sm font-medium text-ink">
                              {order.items?.length || 0} artículo{(order.items?.length || 0) !== 1 ? 's' : ''}
                              {order.items && order.items.length > 0 && (
                                <span className="text-ink-muted">
                                  {' — '}
                                  {order.items.map((item) => `${item.quantity}x ${item.name}`).join(', ')}
                                </span>
                              )}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <span className="font-sans text-lg font-bold text-ink">
                            {formatPrice(order.total)}
                          </span>
                          <div className="flex items-center gap-1">
                            <Select
                              value={order.status}
                              onValueChange={(val) => onOrderStatusChange(order.id, val)}
                            >
                              <SelectTrigger size="sm" className="w-32 border-gold/30">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {statusOptions.map(([value, label]) => (
                                  <SelectItem key={value} value={value}>{label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8 text-ink-muted hover:text-gold"
                              onClick={() => onViewOrder(order)}
                            >
                              <Eye className="size-3.5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ─── ADMIN: CATEGORÍAS ─────────────────────────────── */}
      {adminTab === 'categorias' && (
        <div>
          {/* Header + Add */}
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="font-serif text-xl font-bold text-ink">Gestión de Categorías</h2>
              <p className="text-sm text-ink-muted">{categories.length} categorías activas</p>
            </div>
            <Button onClick={onNewCategory} className="gap-1.5 bg-gold text-ink hover:bg-gold-dark" size="sm">
              <Plus className="size-4" />
              Agregar categoría
            </Button>
          </div>

          {/* Loading */}
          {categoriesLoading ? (
            <div className="flex justify-center py-12">
              <div className="size-8 animate-spin rounded-full border-2 border-gold border-t-transparent" />
            </div>
          ) : categories.length === 0 ? (
            <div className="py-12 text-center text-ink-muted">
              <FolderOpen className="mx-auto mb-3 size-12 text-gold/30" />
              <p className="font-serif text-lg">No hay categorías</p>
              <p className="mt-1 text-sm">Creá la primera categoría para organizar tus productos</p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {categories.map((category) => {
                const productCount = activeProducts.filter((p) => p.category === category.name).length
                return (
                  <Card key={category.id} className="border-gold/15 transition-all hover:shadow-md">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        {/* Category Image */}
                        <div className="size-16 shrink-0 overflow-hidden rounded-lg border border-gold/10">
                          {category.imageUrl ? (
                            <img src={category.imageUrl} alt={category.name} className="size-full object-cover" />
                          ) : (
                            <div className="flex size-full items-center justify-center bg-gradient-to-br from-gold/20 to-gold-light/30">
                              <FolderOpen className="size-6 text-gold/50" />
                            </div>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="font-serif text-base font-semibold text-ink">{category.name}</p>
                              {category.description && (
                                <p className="mt-0.5 text-xs text-ink-muted line-clamp-2">{category.description}</p>
                              )}
                            </div>
                            <div className="flex items-center gap-0.5 shrink-0">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-7 text-ink-muted/50 hover:text-gold"
                                onClick={() => onCategorySortOrder(category, 'up')}
                                disabled={category.sortOrder <= 0}
                              >
                                <ArrowUp className="size-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-7 text-ink-muted/50 hover:text-gold"
                                onClick={() => onCategorySortOrder(category, 'down')}
                              >
                                <ArrowDown className="size-3" />
                              </Button>
                            </div>
                          </div>

                          <div className="mt-2 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary" className="text-[10px]">
                                {productCount} producto{productCount !== 1 ? 's' : ''}
                              </Badge>
                              <span className="text-[10px] text-ink-muted">Orden: {category.sortOrder}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-7 text-ink-muted hover:text-gold"
                                onClick={() => onEditCategory(category)}
                              >
                                <Edit className="size-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-7 text-ink-muted hover:text-[#8B3A3A]"
                                onClick={() => onDeleteCategory(category.id)}
                              >
                                <Trash2 className="size-3.5" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      )}
    </section>
  )
}
