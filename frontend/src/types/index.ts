export type OrderStatus = 'pending' | 'confirmed' | 'packed' | 'shipped' | 'out_for_delivery' | 'delivered' | 'cancelled'
export type UserRole   = 'customer' | 'staff' | 'admin' | 'rider'
export type UserStatus = 'active' | 'suspended'
export type ProductStatus = 'active' | 'draft' | 'archived'
export type DiscountType  = 'percent' | 'fixed'

export interface CategoryOut {
  id: string
  name: string
  slug: string
  icon: string | null
  color_hex: string | null
  sort_order: number
  parent_id: string | null
  children?: CategoryOut[]
}

export interface ProductOut {
  id: string
  name: string
  slug: string
  price: number
  stock_qty: number
  category_id: string | null
  category: CategoryOut | null
  status: ProductStatus
  is_featured: boolean
  sku: string | null
  images: string[]
}

export interface ProductDetailOut extends ProductOut {
  description: string | null
  created_at: string
  updated_at: string
}

export interface PaginationMeta {
  page: number
  per_page: number
  total: number
  total_pages: number
}

export interface ProductListOut {
  items: ProductOut[]
  meta: PaginationMeta
}

export interface CartItemOut {
  item_id: string
  product_id: string
  product: ProductOut
  quantity: number
  subtotal: number
}

export interface CartOut {
  items: CartItemOut[]
  total: number
  item_count: number
}

export interface OrderItemOut {
  id: string
  product_id: string | null
  product_name: string
  unit_price: number
  quantity: number
  subtotal: number
}

export interface OrderOut {
  id: string
  status: OrderStatus
  subtotal: number
  discount: number
  total: number
  notes: string | null
  placed_at: string
  status_updated_at: string
  items: OrderItemOut[]
}

export interface OrderSummaryOut {
  id: string
  status: OrderStatus
  total: number
  item_count: number
  placed_at: string
}

export interface PromotionOut {
  id: string
  title: string
  image_url: string | null
  link_url: string | null
  starts_at: string | null
  ends_at: string | null
  active: boolean
  sort_order: number
}

export interface UserOut {
  id: string
  email: string
  full_name: string
  phone: string | null
  role: UserRole
  status: UserStatus
  created_at: string
}

export interface TokenOut {
  access_token: string
  refresh_token: string
  user: UserOut
}

export interface AddressOut {
  id: string
  label: string
  full_address: string
  city: string
  postal_code: string | null
  phone: string | null
  lat: number | null
  lng: number | null
  is_default: boolean
}

export interface WishlistItemOut {
  product_id: string
  product: ProductOut
  created_at: string
}

// ─── Delivery tracking ──────────────────────────────────────────────────────

export interface OrderEvent {
  id: string
  status: string
  note: string | null
  lat: number | null
  lng: number | null
  created_at: string
}

export interface RiderCard {
  id: string
  name: string
  phone: string | null
  vehicle_type: string
  license_plate: string | null
  current_lat: number | null
  current_lng: number | null
  last_location_at: string | null
  rating: number | null
}

export interface TrackingOut {
  order_id: string
  status: string
  estimated_delivery_at: string | null
  rider: RiderCard | null
  events: OrderEvent[]
}

export interface NotificationOut {
  id: string
  type: string
  title: string
  body: string
  data: Record<string, string>
  read: boolean
  created_at: string
}

export interface RiderOut {
  id: string
  user_id: string
  name: string
  email: string
  phone: string | null
  vehicle_type: string
  license_plate: string | null
  is_available: boolean
  is_active: boolean
  current_lat: number | null
  current_lng: number | null
  last_location_at: string | null
  rating: number | null
  total_deliveries: number
  active_delivery_id: string | null
}

export interface DeliveryOut {
  id: string
  order_id: string
  rider_id: string | null
  rider_name: string | null
  customer_name: string
  delivery_address: string
  order_status: string
  assigned_at: string | null
  picked_up_at: string | null
  out_for_delivery_at: string | null
  delivered_at: string | null
  estimated_delivery_at: string | null
  rider_lat: number | null
  rider_lng: number | null
  rating: number | null
}

export interface MapRiderOut {
  rider_id: string
  name: string
  lat: number
  lng: number
  last_updated: string
  is_available: boolean
  active_order_id: string | null
}
