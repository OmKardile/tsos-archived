export type Role = 'owner' | 'manager' | 'cashier' | 'kitchen';
export type OrderType = 'dine_in' | 'takeaway' | 'delivery';
export type OrderStatus = 'new' | 'preparing' | 'ready' | 'served' | 'completed' | 'cancelled';
export type PaymentMethod = 'cash' | 'upi' | 'card';
export type PaymentStatus = 'unpaid' | 'paid' | 'refunded';
export type FeePayer = 'customer' | 'cafe';
export type TableStatus = 'free' | 'occupied' | 'reserved';
export type OfferType = 'flat' | 'percent' | 'bogo';
export type InventoryReason = 'sale' | 'restock' | 'wastage' | 'adjustment';
export type IngredientUnit = 'g' | 'kg' | 'ml' | 'l' | 'pcs';

export interface Business { id: string; owner_user_id: string; name: string; created_at: string; }
export interface Location { id: string; business_id: string; name: string; slug: string; address: string | null; phone: string | null; timezone: string; is_active: boolean; created_at: string; }
export interface Profile { id: string; email: string; name: string | null; role: Role; business_id: string | null; pin_code: string | null; is_active: boolean; created_at: string; }
export interface UserLocation { user_id: string; location_id: string; created_at: string; }
export interface MenuCategory { id: string; location_id: string; name: string; sort_order: number; is_active: boolean; }
export interface MenuItem { id: string; location_id: string; category_id: string | null; name: string; description: string | null; price: number; image_url: string | null; is_veg: boolean; is_available: boolean; tax_rate_pct: number; created_at: string; }
export interface MenuItemVariant { id: string; menu_item_id: string; name: string; price_delta: number; }
export interface Addon { id: string; location_id: string; name: string; price: number; }
export interface MenuItemAddon { menu_item_id: string; addon_id: string; }
export interface Ingredient { id: string; location_id: string; name: string; unit: IngredientUnit; stock_qty: number; low_stock_threshold: number; }
export interface Recipe { id: string; menu_item_id: string; ingredient_id: string; qty_consumed: number; }
export interface InventoryLog { id: string; ingredient_id: string; change_qty: number; reason: InventoryReason; ref_order_id: string | null; created_at: string; }
export interface DineTable { id: string; location_id: string; label: string; qr_token: string; seats: number; status: TableStatus; }
export interface Order { id: string; location_id: string; table_id: string | null; customer_id: string | null; order_type: OrderType; status: OrderStatus; placed_by: string | null; subtotal: number; tax_total: number; discount_total: number; platform_fee: number; fee_payer: FeePayer; grand_total: number; payment_status: PaymentStatus; created_at: string; }
export interface OrderItem { id: string; order_id: string; menu_item_id: string; variant_id: string | null; qty: number; unit_price: number; notes: string | null; }
export interface OrderItemAddon { id: string; order_item_id: string; addon_id: string; price: number; }
export interface Payment { id: string; order_id: string; method: PaymentMethod; amount: number; status: string; gateway_ref: string | null; created_at: string; }
export interface Customer { id: string; business_id: string; name: string | null; phone: string; email: string | null; loyalty_points: number; total_orders: number; total_spent: number; created_at: string; }
export interface LoyaltyLedger { id: string; customer_id: string; order_id: string | null; points_delta: number; reason: string; created_at: string; }
export interface Offer { id: string; location_id: string; title: string; type: OfferType; value: number; min_order_value: number; valid_from: string; valid_to: string; is_active: boolean; }
export interface LocationFeeConfig { location_id: string; monthly_fee: number; per_order_fee: number; default_fee_payer: FeePayer; customer_paid_order_limit: number; period_order_count: number; period_reset_at: string | null; }
export interface Shift { id: string; user_id: string; location_id: string; clock_in: string; clock_out: string | null; }
export interface AuditLog { id: string; user_id: string | null; location_id: string | null; action: string; entity: string; entity_id: string | null; meta_json: Record<string, unknown> | null; created_at: string; }

export const ORDER_FLOW: OrderStatus[] = ['new', 'preparing', 'ready', 'served', 'completed'];
export const NEXT_STATUS: Record<OrderStatus, OrderStatus | null> = {
  new: 'preparing', preparing: 'ready', ready: 'served', served: 'completed', completed: null, cancelled: null,
};

export const LOYALTY = { earnPerRs: 10, pointValueRs: 1, minRedemptionOrderRs: 100 } as const;

export function formatINR(n: number): string {
  return `₹${Number(n ?? 0).toFixed(2)}`;
}
