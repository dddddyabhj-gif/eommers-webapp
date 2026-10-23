export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]
export type PublicationStatus = 'draft' | 'published' | 'archived'
export type AppRole = 'customer' | 'admin'
export type OrderStatus = 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled'
export type PaymentMethod = 'unconfirmed' | 'cod' | 'card' | 'bank_transfer'
export type PaymentStatus = 'pending' | 'authorized' | 'paid' | 'failed' | 'partially_refunded' | 'refunded'
export type InventoryMovementType = 'initial' | 'sale' | 'restock' | 'adjustment' | 'return' | 'correction'
export type NotificationKind = 'order' | 'account' | 'store'

type Table<Row, Required extends keyof Row = never> = {
  Row: Row
  Insert: Pick<Row, Required> & Partial<Omit<Row, Required>>
  Update: Partial<Row>
  Relationships: []
}

type ProfileRow = { id: string; full_name: string | null; phone: string | null; avatar_url: string | null; created_at: string; updated_at: string }
type UserRoleRow = { user_id: string; role: AppRole; assigned_at: string; assigned_by: string | null }
type CategoryRow = { id: string; parent_id: string | null; name: string; slug: string; description: string; eyebrow: string | null; image_url: string | null; is_active: boolean; sort_order: number; seo_title: string | null; seo_description: string | null; created_at: string; updated_at: string }
type ProductRow = { id: string; category_id: string | null; name: string; slug: string; sku: string | null; short_description: string; description: string; price: number; currency: string; specifications: Json; publication_status: PublicationStatus; is_featured: boolean; track_inventory: boolean; weight_grams: number | null; dimensions: Json; seo_title: string | null; seo_description: string | null; created_at: string; updated_at: string }
type ProductImageRow = { id: string; product_id: string; image_url: string | null; storage_path: string | null; alt_text: string; sort_order: number; is_primary: boolean; created_at: string }
type ProductVariantRow = { id: string; product_id: string; option_label: string; option_value: string; sku: string | null; price_override: number | null; attributes: Json; is_active: boolean; sort_order: number; created_at: string; updated_at: string }
type ProductInventoryRow = { id: string; product_id: string; variant_id: string | null; quantity: number; low_stock_threshold: number | null; updated_at: string }
type InventoryMovementRow = { id: string; product_id: string; variant_id: string | null; quantity_delta: number; movement_type: InventoryMovementType; reference_id: string | null; note: string | null; actor_id: string | null; created_at: string }
type CustomerAddressRow = { id: string; user_id: string; recipient_name: string; phone: string; address_line_1: string; address_line_2: string | null; city: string; province: string | null; postal_code: string | null; delivery_instructions: string | null; is_default: boolean; created_at: string; updated_at: string }
type WishlistItemRow = { id: string; user_id: string; product_id: string; variant_id: string | null; added_at: string }
type OrderRow = { id: string; order_number: string; customer_id: string | null; customer_name: string; customer_phone: string; customer_email: string | null; shipping_address_snapshot: Json; customer_note: string | null; currency: string; subtotal: number; delivery_fee: number; discount_amount: number; total: number; order_status: OrderStatus; payment_method: PaymentMethod; payment_status: PaymentStatus; created_at: string; updated_at: string }
type OrderItemRow = { id: string; order_id: string; product_id: string | null; variant_id: string | null; product_name_snapshot: string; sku_snapshot: string | null; variant_snapshot: Json; product_snapshot: Json; quantity: number; unit_price: number; line_total: number; created_at: string }
type PaymentTransactionRow = { id: string; order_id: string; provider: string; provider_reference: string | null; amount: number; currency: string; status: PaymentStatus; safe_metadata: Json; created_at: string; updated_at: string }
type AdminOrderNoteRow = { id: string; order_id: string; created_by: string; note: string; created_at: string }
type NotificationRow = { id: string; user_id: string; kind: NotificationKind; title: string; body: string; related_order_id: string | null; read_at: string | null; created_at: string }
type AdminAuditLogRow = { id: string; actor_id: string | null; action: 'INSERT' | 'UPDATE' | 'DELETE'; entity: string; entity_id: string | null; details: Json; created_at: string }

export interface Database {
  public: {
    Tables: {
      profiles: Table<ProfileRow, 'id'>
      user_roles: Table<UserRoleRow, 'user_id' | 'role'>
      categories: Table<CategoryRow, 'name' | 'slug'>
      products: Table<ProductRow, 'name' | 'slug' | 'price'>
      product_images: Table<ProductImageRow, 'product_id'>
      product_variants: Table<ProductVariantRow, 'product_id' | 'option_label' | 'option_value'>
      product_inventory: Table<ProductInventoryRow, 'product_id'>
      inventory_movements: Table<InventoryMovementRow, 'product_id' | 'quantity_delta' | 'movement_type'>
      customer_addresses: Table<CustomerAddressRow, 'user_id' | 'recipient_name' | 'phone' | 'address_line_1' | 'city'>
      wishlist_items: Table<WishlistItemRow, 'user_id' | 'product_id'>
      orders: Table<OrderRow, 'customer_name' | 'customer_phone' | 'shipping_address_snapshot' | 'subtotal'>
      order_items: Table<OrderItemRow, 'order_id' | 'product_name_snapshot' | 'quantity' | 'unit_price'>
      payment_transactions: Table<PaymentTransactionRow, 'order_id' | 'provider' | 'amount'>
      admin_order_notes: Table<AdminOrderNoteRow, 'order_id' | 'created_by' | 'note'>
      notifications: Table<NotificationRow, 'user_id' | 'title'>
      admin_audit_logs: Table<AdminAuditLogRow, 'action' | 'entity'>
    }
    Views: Record<string, never>
    Functions: {
      current_user_is_admin: { Args: Record<string, never>; Returns: boolean }
      get_public_availability: { Args: { product_ids: string[] }; Returns: { product_id: string; variant_id: string | null; is_available: boolean }[] }
      admin_dashboard_summary: { Args: Record<string, never>; Returns: { total_products: number; published_products: number; active_categories: number; pending_orders: number; open_orders: number; paid_delivered_value: number }[] }
      create_order: { Args: { p_customer_id: string | null; p_customer_name: string; p_customer_phone: string; p_shipping_address: Json; p_items: Json; p_customer_email?: string | null; p_delivery_fee?: number; p_payment_method?: PaymentMethod; p_customer_note?: string | null }; Returns: string }
    }
    Enums: {
      app_role: AppRole
      publication_status: PublicationStatus
      inventory_movement_type: InventoryMovementType
      order_status: OrderStatus
      payment_method: PaymentMethod
      payment_status: PaymentStatus
      notification_kind: NotificationKind
    }
    CompositeTypes: Record<string, never>
  }
}
