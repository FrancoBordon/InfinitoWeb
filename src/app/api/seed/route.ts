import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Inline hash function - simplified djb2 (same as auth route)
function simpleHash(str: string): string {
  let h = 5381
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) + h + str.charCodeAt(i)) & 0xffffffff
  }
  return (h >>> 0).toString(16).padStart(8, '0')
}

function hashPassword(password: string, salt: string): string {
  return simpleHash(salt + ':' + password)
}

function generateSalt(): string {
  const chars = '0123456789abcdef'
  let result = ''
  for (let i = 0; i < 32; i++) {
    result += chars[Math.floor(Math.random() * chars.length)]
  }
  return result
}

// Sample categories for a gift shop (regalería)
const sampleCategories = [
  { name: 'Joyas', description: 'Anillos, collares, pulseras y aros', sortOrder: 1 },
  { name: 'Perfumes de Mujer', description: 'Fragancias femeninas elegantes', sortOrder: 2 },
  { name: 'Perfumes de Hombre', description: 'Fragancias masculinas sofisticadas', sortOrder: 3 },
  { name: 'Indumentaria', description: 'Remeras, camisas, bufandas y más', sortOrder: 4 },
  { name: 'Accesorios', description: 'Carteras, billeteras, anteojos y cinturones', sortOrder: 5 },
]

function generateImages(imageUrl: string | null): string[] {
  if (!imageUrl) return []
  const lastDot = imageUrl.lastIndexOf('.')
  if (lastDot === -1) return [imageUrl]
  const base = imageUrl.substring(0, lastDot)
  const ext = imageUrl.substring(lastDot)
  return [imageUrl, `${base}-2${ext}`, `${base}-3${ext}`]
}

const sampleProducts = [
  { name: 'Anillo Sol Dorado', description: 'Elegante anillo con diseño de sol en dorado, ajustable y brillante.', category: 'Joyas', price: 12500, costPrice: 5500, promoPrice: 9900, imageUrl: '/uploads/anillo-sol.png', stock: 8, talle: 'Ajustable' },
  { name: 'Collar Corazón Plata', description: 'Collar con dije de corazón en plata 925, cadena de 45cm.', category: 'Joyas', price: 18900, costPrice: 8000, promoPrice: null, imageUrl: '/uploads/collar-corazon.png', stock: 5, talle: '45cm' },
  { name: 'Pulsera Perlas Naturales', description: 'Pulsera de perlas naturales con cierre de plata.', category: 'Joyas', price: 22500, costPrice: 10000, promoPrice: 17500, imageUrl: '/uploads/pulsera-perlas.png', stock: 3, talle: '19cm' },
  { name: 'Aros Colgantes Estrella', description: 'Aros colgantes con diseño de estrella en plateado.', category: 'Joyas', price: 8500, costPrice: 3200, promoPrice: null, imageUrl: '/uploads/aros-estrella.png', stock: 15, talle: null },
  { name: 'Anillo Infinito', description: 'Anillo de infinito en acero quirúrgico. Ajustable.', category: 'Joyas', price: 7200, costPrice: 2800, promoPrice: null, imageUrl: '/uploads/anillo-infinito.png', stock: 12, talle: 'Ajustable' },
  { name: 'Perfume Dama - Flor de Lis', description: 'Perfume femenino con notas de jazmín, rosa y vainilla. 50ml.', category: 'Perfumes de Mujer', price: 35000, costPrice: 15000, promoPrice: 28900, imageUrl: '/uploads/perfume-dama-flor.png', stock: 10, talle: '50ml' },
  { name: 'Perfume Dama - Dulce Primavera', description: 'Perfume fresco y floral. 30ml.', category: 'Perfumes de Mujer', price: 19500, costPrice: 8000, promoPrice: 15900, imageUrl: '/uploads/perfume-dama-primavera.png', stock: 14, talle: '30ml' },
  { name: 'Perfume Caballero - Bosque Noir', description: 'Perfume masculino con notas de cedro y cuero. 75ml.', category: 'Perfumes de Hombre', price: 42000, costPrice: 18000, promoPrice: null, imageUrl: '/uploads/perfume-caballero-bosque.png', stock: 7, talle: '75ml' },
  { name: 'Perfume Caballero - Aqua Marine', description: 'Perfume acuático y fresco. 50ml.', category: 'Perfumes de Hombre', price: 38000, costPrice: 16000, promoPrice: null, imageUrl: '/uploads/perfume-caballero-aqua.png', stock: 6, talle: '50ml' },
  { name: 'Remera Estampada Floral', description: 'Remera de algodón con estampado floral.', category: 'Indumentaria', price: 15000, costPrice: 6000, promoPrice: null, imageUrl: '/uploads/remera-floral.png', stock: 20, talle: 'S/M/L/XL' },
  { name: 'Camisa Lino Natural', description: 'Camisa de lino natural, fresca y elegante.', category: 'Indumentaria', price: 28000, costPrice: 12000, promoPrice: 22900, imageUrl: '/uploads/camisa-lino.png', stock: 8, talle: 'S/M/L' },
  { name: 'Bufanda Pura Lana', description: 'Bufanda de pura lana merino.', category: 'Indumentaria', price: 18500, costPrice: 7500, promoPrice: null, imageUrl: '/uploads/bufanda-lana.png', stock: 12, talle: 'Único' },
  { name: 'Remera Básica Algodón Premium', description: 'Remera básica de algodón premium.', category: 'Indumentaria', price: 9800, costPrice: 4000, promoPrice: null, imageUrl: '/uploads/remera-basica.png', stock: 25, talle: 'S/M/L/XL' },
  { name: 'Cartera Cuero Elegante', description: 'Cartera de cuero genuino con compartimentos múltiples.', category: 'Accesorios', price: 55000, costPrice: 25000, promoPrice: 44900, imageUrl: '/uploads/cartera-cuero.png', stock: 4, talle: null },
  { name: 'Billetera Caballero Cuero', description: 'Billetera de cuero legítimo para caballero.', category: 'Accesorios', price: 22000, costPrice: 9000, promoPrice: null, imageUrl: '/uploads/billetera-cuero.png', stock: 9, talle: null },
  { name: 'Anteojos de Sol Clásicos', description: 'Anteojos de sol con protección UV400.', category: 'Accesorios', price: 16000, costPrice: 6500, promoPrice: 12900, imageUrl: '/uploads/anteojos-sol.png', stock: 11, talle: null },
  { name: 'Cinturón Cuero con Hebilla', description: 'Cinturón de cuero genuino con hebilla metálica.', category: 'Accesorios', price: 14000, costPrice: 5500, promoPrice: null, imageUrl: '/uploads/cinturon-cuero.png', stock: 16, talle: 'S/M/L' },
  { name: 'Gorra Deportiva Logo Bordado', description: 'Gorra deportiva con logo bordado y cierre regulable.', category: 'Accesorios', price: 8500, costPrice: 3500, promoPrice: 6900, imageUrl: '/uploads/gorra-deportiva.png', stock: 0, talle: 'Ajustable' },
]

export async function POST() {
  try {
    await db.orderItem.deleteMany()
    await db.order.deleteMany()
    await db.product.deleteMany()
    await db.category.deleteMany()

    const createdCategories = []
    for (const catData of sampleCategories) {
      const category = await db.category.create({ data: catData })
      createdCategories.push(category)
    }

    const createdProducts = []
    for (const productData of sampleProducts) {
      const images = generateImages(productData.imageUrl)
      const product = await db.product.create({
        data: {
          name: productData.name,
          description: productData.description,
          category: productData.category,
          price: productData.price,
          costPrice: productData.costPrice,
          promoPrice: productData.promoPrice,
          imageUrl: productData.imageUrl || null,
          images: JSON.stringify(images),
          stock: productData.stock,
          talle: productData.talle,
          active: true,
        },
      })
      createdProducts.push(product)
    }

    // Create default admin if none exists
    const existingAdmins = await db.admin.count()
    if (existingAdmins === 0) {
      const salt = generateSalt()
      const hash = hashPassword('infinito2025', salt)
      await db.admin.create({
        data: {
          email: 'admin@infinito.com',
          password: `${salt}:${hash}`,
          name: 'Admin',
        },
      })
    }

    return NextResponse.json({
      ok: true,
      message: `Seeded ${createdCategories.length} categories, ${createdProducts.length} products`,
    })
  } catch (error) {
    console.error('Error seeding database:', error)
    return NextResponse.json({ ok: false, error: 'Failed to seed database' })
  }
}
