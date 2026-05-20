import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Real product data from Supabase migration
const baseProducts = [
  {
    name: 'Collar May - Blanco',
    description: null,
    category: 'Collar',
    costPrice: 3200,
    price: 10900,
    promoPrice: null,
    talle: '45cm',
    stock: 1,
  },
  {
    name: 'Collar Sabine',
    description: null,
    category: 'Collar',
    costPrice: 2560,
    price: 8900,
    promoPrice: null,
    talle: '45cm',
    stock: 2,
  },
  {
    name: 'Collar Sury',
    description: null,
    category: 'Collar',
    costPrice: 2560,
    price: 8900,
    promoPrice: null,
    talle: '45cm',
    stock: 2,
  },
  {
    name: 'Collar Moani Flor - Rosado',
    description: null,
    category: 'Collar',
    costPrice: 1760,
    price: 8200,
    promoPrice: null,
    talle: '45cm',
    stock: 1,
  },
  {
    name: 'Anillo Crepen - Talle 18',
    description: null,
    category: 'Anillo',
    costPrice: 2400,
    price: 6400,
    promoPrice: null,
    talle: '18',
    stock: 1,
  },
  {
    name: 'Anillo Crepen - Talle 17',
    description: null,
    category: 'Anillo',
    costPrice: 2400,
    price: 6400,
    promoPrice: null,
    talle: '17',
    stock: 1,
  },
  {
    name: 'Anillo Mini Corazoncito - Piedritas Blanco',
    description: null,
    category: 'Anillo',
    costPrice: 2080,
    price: 6400,
    promoPrice: null,
    talle: '17',
    stock: 1,
  },
  {
    name: 'Anillo Goty - Talle 18',
    description: null,
    category: 'Anillo',
    costPrice: 2720,
    price: 6400,
    promoPrice: null,
    talle: '18',
    stock: 1,
  },
  {
    name: 'Anillo Mariposa Eliora - Talle 18',
    description: null,
    category: 'Anillo',
    costPrice: 2480,
    price: 6400,
    promoPrice: null,
    talle: '18',
    stock: 1,
  },
  {
    name: 'Anillo Mariposa Eliora - Talle 17',
    description: null,
    category: 'Anillo',
    costPrice: 2480,
    price: 6400,
    promoPrice: null,
    talle: '17',
    stock: 1,
  },
  {
    name: 'Anillo Gami',
    description: null,
    category: 'Anillo',
    costPrice: 2560,
    price: 6400,
    promoPrice: null,
    talle: '17',
    stock: 1,
  },
  {
    name: 'Argollas Dorado Leia',
    description: null,
    category: 'Aro',
    costPrice: 2900,
    price: 6700,
    promoPrice: null,
    talle: '14mm',
    stock: 1,
  },
  {
    name: 'Aros Anna',
    description: null,
    category: 'Aro',
    costPrice: 1980,
    price: 5700,
    promoPrice: null,
    talle: '1.5cm',
    stock: 2,
  },
  {
    name: 'Argollas Motivo Mariposas',
    description: null,
    category: 'Aro',
    costPrice: 2720,
    price: 6700,
    promoPrice: null,
    talle: '10mm',
    stock: 1,
  },
  {
    name: 'Aros Mencía',
    description: null,
    category: 'Aro',
    costPrice: 3150,
    price: 7200,
    promoPrice: null,
    talle: '2.5cm',
    stock: 1,
  },
  {
    name: 'Argollas Pau',
    description: null,
    category: 'Aro',
    costPrice: 1920,
    price: 5700,
    promoPrice: null,
    talle: '10mm',
    stock: 1,
  },
  {
    name: 'Aros Dorado Nurie',
    description: null,
    category: 'Aro',
    costPrice: 2070,
    price: 5900,
    promoPrice: null,
    talle: '22mm',
    stock: 1,
  },
  {
    name: 'Argollas Margot Doradas',
    description: null,
    category: 'Aro',
    costPrice: 980,
    price: 3900,
    promoPrice: null,
    talle: '18mm',
    stock: 2,
  },
]

const customProducts = [
  {
    name: 'Black Opium Yves Saint Laurent',
    description: 'Extracto Importado',
    category: 'Perfumes de Mujer',
    costPrice: 26000,
    price: 60000,
    promoPrice: 56000,
    talle: '100ml',
    stock: 1,
  },
  {
    name: 'Polo Blue - Extracto Importado',
    description: 'Extracto Importado 100ml',
    category: 'Perfumes de Hombre',
    costPrice: 26000,
    price: 60000,
    promoPrice: 56000,
    talle: '100ml',
    stock: 1,
  },
  {
    name: 'Eros Versace - Extracto Importado',
    description: 'Extracto Importado 100ml',
    category: 'Perfumes de Hombre',
    costPrice: 26000,
    price: 60000,
    promoPrice: 56000,
    talle: '100ml',
    stock: 1,
  },
  {
    name: 'Camiseta Seleccion Argentina',
    description: 'Camiseta Selección Argentina Suplente 2026 Mundial\nLogos Termos Sellados\nCalidad: Top Quality',
    category: 'Indumentaria Selección',
    costPrice: 28000,
    price: 52000,
    promoPrice: 44900,
    talle: 'S - XXL',
    stock: 1,
  },
  {
    name: 'Campera Selección Argentina',
    description: 'Campera Selección Argentina Mundial 2026\nCalidad: Top Quality\nConsulta Stock',
    category: 'Indumentaria Selección',
    costPrice: 30000,
    price: 62000,
    promoPrice: 55000,
    talle: 'S - XXL',
    stock: 1,
  },
]

// POST /api/migrate - Delete all existing products and insert real Supabase data
export async function POST() {
  try {
    // Delete in correct order to respect foreign key constraints
    await db.orderItem.deleteMany()
    await db.order.deleteMany()
    await db.product.deleteMany()

    const allProducts = [...baseProducts, ...customProducts]
    const createdProducts = []

    for (const productData of allProducts) {
      const product = await db.product.create({
        data: {
          name: productData.name,
          description: productData.description || null,
          category: productData.category,
          costPrice: productData.costPrice,
          price: productData.price,
          promoPrice: productData.promoPrice || null,
          imageUrl: null,
          stock: productData.stock,
          talle: productData.talle,
          active: true,
        },
      })

      createdProducts.push({
        id: product.id,
        name: product.name,
        category: product.category,
        price: product.price,
        costPrice: product.costPrice,
        promoPrice: product.promoPrice,
        stock: product.stock,
        talle: product.talle,
      })
    }

    return NextResponse.json({
      message: `Successfully migrated ${createdProducts.length} products (${baseProducts.length} base + ${customProducts.length} custom)`,
      products: createdProducts,
    }, { status: 201 })
  } catch (error) {
    console.error('Error migrating products:', error)
    return NextResponse.json(
      { error: 'Failed to migrate products' },
      { status: 500 }
    )
  }
}
