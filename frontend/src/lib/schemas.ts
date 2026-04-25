import { z } from 'zod'

export const productSchema = z.object({
  name:        z.string().min(2, 'Name must be at least 2 characters'),
  price:       z.string().refine(v => !isNaN(parseFloat(v)) && parseFloat(v) > 0, 'Enter a valid price'),
  stock_qty:   z.string().refine(v => !isNaN(parseInt(v)) && parseInt(v) >= 0, 'Enter a valid quantity'),
  sku:         z.string().optional(),
  category_id: z.string().optional(),
  description: z.string().optional(),
  is_featured: z.boolean(),
})

export type ProductFormValues = z.infer<typeof productSchema>

export const riderSchema = z.object({
  full_name:     z.string().min(2, 'Full name is required'),
  email:         z.string().email('Enter a valid email'),
  phone:         z.string().optional(),
  password:      z.string().min(6, 'Password must be at least 6 characters'),
  vehicle_type:  z.enum(['motorcycle', 'bicycle', 'car', 'van']),
  license_plate: z.string().optional(),
})

export type RiderFormValues = z.infer<typeof riderSchema>

export const promotionSchema = z.object({
  title:      z.string().min(2, 'Title is required'),
  image_url:  z.string().url('Enter a valid URL').optional().or(z.literal('')),
  link_url:   z.string().optional(),
  starts_at:  z.string().optional(),
  ends_at:    z.string().optional(),
  sort_order: z.string().refine(v => !isNaN(parseInt(v)), 'Must be a number'),
  active:     z.boolean(),
}).refine(
  data => !data.ends_at || !data.starts_at || data.ends_at >= data.starts_at,
  { message: 'End date must be after start date', path: ['ends_at'] }
)

export type PromotionFormValues = z.infer<typeof promotionSchema>

export const discountSchema = z.object({
  code:        z.string().min(3, 'Code must be at least 3 characters').max(20, 'Max 20 characters').regex(/^[A-Z0-9]+$/, 'Only uppercase letters and numbers'),
  type:        z.enum(['percent', 'fixed']),
  value:       z.string().refine(v => !isNaN(parseFloat(v)) && parseFloat(v) > 0, 'Enter a valid value'),
  usage_limit: z.string().optional(),
  starts_at:   z.string().optional(),
  expires_at:  z.string().optional(),
  active:      z.boolean(),
}).refine(
  data => {
    if (data.type === 'percent') {
      const v = parseFloat(data.value)
      return v > 0 && v <= 100
    }
    return true
  },
  { message: 'Percentage must be between 1 and 100', path: ['value'] }
)

export type DiscountFormValues = z.infer<typeof discountSchema>

export const categorySchema = z.object({
  name:       z.string().min(2, 'Name is required'),
  slug:       z.string().min(2, 'Slug is required').regex(/^[a-z0-9-]+$/, 'Only lowercase letters, numbers, hyphens'),
  icon:       z.string().min(1, 'Icon is required'),
  color_hex:  z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Enter a valid hex color e.g. #E07830'),
  sort_order: z.string().refine(v => !isNaN(parseInt(v)), 'Must be a number'),
})

export type CategoryFormValues = z.infer<typeof categorySchema>
