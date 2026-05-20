export interface Category {
  id: string
  name: string
  description: string | null
  imageUrl: string | null
  active: boolean
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export interface Product {
  id: string
  name: string
  description: string | null
  category: string
  price: number
  costPrice: number
  promoPrice: number | null
  imageUrl: string | null
  images: string[] // JSON array of image URLs parsed from the DB string
  stock: number
  talle: string | null
  active: boolean
  createdAt: string
  updatedAt: string
}

export interface Customer {
  id: string
  name: string
  phone: string
  email: string | null
  address: string | null
  notes: string | null
  tags: string | null
  createdAt: string
  updatedAt: string
  orders?: Order[]
}

export interface Order {
  id: string
  customerId: string | null
  customerName: string | null
  customerPhone: string | null
  total: number
  status: string
  notes: string | null
  source: string
  createdAt: string
  updatedAt: string
  items?: OrderItem[]
  customer?: Customer
}

export interface OrderItem {
  id: string
  orderId: string
  productId: string | null
  name: string
  price: number
  quantity: number
  talle: string | null
}

export interface CartItem {
  product: Product
  quantity: number
}
