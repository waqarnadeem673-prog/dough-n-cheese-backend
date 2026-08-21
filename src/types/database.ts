// ==============================================================================
// Dough N Cheese — Supabase Database Types
// Matches schema in supabase/migrations/20260820_initial_schema.sql
// ==============================================================================

export type AdminRole = 'OWNER' | 'ADMIN' | 'MANAGER' | 'EDITOR';

export type AdminProfile = {
  id: string;
  user_id: string;
  name: string;
  role: AdminRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type DatabaseCategory = {
  id: string;
  name: string;
  slug: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type DatabaseProduct = {
  id: string;
  category_id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  is_popular: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type DatabaseProductPriceOption = {
  id: string;
  product_id: string;
  label: string;
  price: number;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type DatabaseProductVariant = {
  id: string;
  product_id: string;
  name: string;
  display_order: number;
  is_required: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type DatabaseProductVariantOption = {
  id: string;
  variant_id: string;
  name: string;
  price_modifier: number;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type DatabaseBranch = {
  id: string;
  name: string;
  slug: string;
  city: string;
  address: string;
  phone: string;
  whatsapp_number: string;
  google_maps_url: string | null;
  opening_time: string;
  closing_time: string;
  days_open: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type DiscountType = 'PERCENTAGE' | 'FIXED_AMOUNT';
export type DiscountScope = 'ALL_PRODUCTS' | 'SELECTED_CATEGORIES' | 'SELECTED_PRODUCTS';

export type DatabaseDiscount = {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  discount_type: DiscountType;
  discount_value: number;
  scope: DiscountScope;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
  updated_at: string;
};

export type DatabaseRestaurantSettings = {
  id: string;
  is_singleton: boolean;
  restaurant_name: string;
  tagline: string | null;
  logo_url: string | null;
  hero_image_url: string | null;
  delivery_image_url: string | null;
  menu_pdf_url: string | null;
  instagram_url: string | null;
  tiktok_url: string | null;
  facebook_url: string | null;
  extra_data: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type OrderStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'PREPARING'
  | 'OUT_FOR_DELIVERY'
  | 'COMPLETED'
  | 'CANCELLED';

export type DatabaseOrder = {
  id: string;
  branch_id: string;
  customer_name: string;
  customer_phone: string;
  status: OrderStatus;
  subtotal: number;
  discount_amount: number;
  total: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type DatabaseOrderItem = {
  id: string;
  order_id: string;
  product_id: string | null;
  product_name_snapshot: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  selected_size: string | null;
  selected_variants: Record<string, unknown>;
  created_at: string;
};
