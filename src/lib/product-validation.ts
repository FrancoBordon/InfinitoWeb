import { z } from 'zod'

const optionalText = z.string().max(5000).nullable().optional()
const productFields = {
  name: z.string().trim().min(1).max(200),
  description: optionalText,
  category: z.string().trim().min(1).max(100),
  price: z.number().finite().nonnegative(),
  costPrice: z.number().finite().nonnegative().optional(),
  promoPrice: z.number().finite().nonnegative().nullable().optional(),
  imageUrl: z.string().max(2048).nullable().optional(),
  images: z.array(z.string().max(2048)).max(20).optional(),
  stock: z.number().int().min(0).max(1_000_000).optional(),
  talle: z.string().max(100).nullable().optional(),
}

export const createProductSchema = z.object(productFields).strict()
export const updateProductSchema = z.object({
  name: productFields.name.optional(),
  description: productFields.description,
  category: productFields.category.optional(),
  price: productFields.price.optional(),
  costPrice: productFields.costPrice,
  promoPrice: productFields.promoPrice,
  imageUrl: productFields.imageUrl,
  images: productFields.images,
  stock: productFields.stock,
  talle: productFields.talle,
  active: z.boolean().optional(),
}).strict().refine((value) => Object.keys(value).length > 0, 'At least one field is required')
