# TSOS — Business Documentation

> POS + Cafe Operations SaaS for the Indian market

## Overview

TSOS is a cloud-based point-of-sale and cafe operations platform designed for the Indian market. It provides a complete solution for managing orders, inventory, customers, and staff across multiple locations.

## Core Value Proposition

- **₹0/month + ₹1/order** — Pay only when you transact
- **QR Ordering** — Customers scan and order from their table
- **Kitchen Display** — Real-time order management for kitchen staff
- **Inventory Tracking** — Auto-deduct ingredients on order completion
- **Loyalty Program** — Points system for repeat customers
- **Multi-Location** — Manage multiple cafes from one account

## Business Model

### Pricing
- **Monthly Fee**: ₹0 (free to use)
- **Per-Order Fee**: ₹1 per order (configurable)
- **Fee Payer**: Customer or Cafe (configurable per location)
- **Auto-Flip**: After N orders, automatically switch fee payer

### Fee Engine Logic
```
1. Check location's fee config
2. If auto-flip enabled AND period_order_count >= threshold:
   → Flip fee payer (customer ↔ cafe)
3. If fee_payer = 'customer':
   → Add per_order_fee to grand_total
4. If fee_payer = 'cafe':
   → Absorb fee (no charge to customer)
5. Increment period_order_count
```

## User Roles

| Role | Permissions |
|------|------------|
| **Owner** | Full access to all features, settings, and reports |
| **Manager** | Manage menu, orders, inventory, customers, staff |
| **Cashier** | Process orders, payments, view reports |
| **Kitchen** | View and update order status on KDS |

## Order Flow

### 1. Order Placement
```
Staff creates order (POS)     → Order status: 'new'
Customer scans QR (table)     → Order status: 'new'
Customer orders online        → Order status: 'new'
```

### 2. Order Processing
```
Kitchen sees order (KDS)      → Status: 'preparing'
Kitchen marks ready           → Status: 'ready'
Staff serves customer         → Status: 'served'
Staff marks completed         → Status: 'completed'
```

### 3. Payment
```
Payment recorded              → payment_status: 'paid'
Supports: Cash, UPI, Card
```

### 4. Post-Completion
```
Inventory auto-deducted       → stock_qty reduced
Low-stock alert triggered     → Socket.io notification
Loyalty points earned         → points added to customer
Period order count incremented → fee engine updated
```

## Inventory Management

### Ingredients
- Units: g, kg, ml, l, pcs
- Stock quantity tracking
- Low-stock threshold alerts
- Restock with logging

### Recipes
- Link menu items to ingredients
- Define quantity consumed per order
- Auto-deduct on order completion

### Stock Deduction
```
When order completed:
  For each order_item:
    For each recipe (menu_item → ingredient):
      ingredient.stock_qty -= recipe.qty_consumed * order_item.qty
      Log: inventory_logs (reason: 'sale')
    If stock_qty < low_stock_threshold:
      Emit: inventory:low_stock alert
```

### Restock
```
POST /api/inventory/ingredients/:id/restock
  → Increase stock_qty
  → Log: inventory_logs (reason: 'restock')
```

## Multi-Location

### Location Switcher
- Dashboard shows all accessible locations
- Switch active location via sidebar
- All queries scoped to active location

### Data Isolation
- Every query filtered by `location_id`
- Users assigned to specific locations
- Menu, orders, inventory all per-location

## QR Ordering

### Table QR Codes
- Each table has unique QR token
- QR encodes: `/order/{locationSlug}/table/{tableId}`
- Customer scans → sees menu → places order
- Order linked to table automatically

### Public Storefront
- `/order/{locationSlug}` — Menu display
- Menu items filtered by availability
- Cart with quantity and notes
- Checkout with payment method selection

## Customer Loyalty

### Points System
- Earn: 1 point per ₹10 spent (configurable)
- Redeem: 1 point = ₹1 discount
- Minimum order for redemption: ₹100

### Customer Profile
- Auto-created from phone number
- Tracks total orders and spending
- Loyalty points balance
- Order history

## Offers & Promotions

### Offer Types
| Type | Description | Example |
|------|------------|---------|
| **Flat** | Fixed discount | ₹50 off on ₹500+ |
| **Percent** | Percentage discount | 10% off on ₹300+ |
| **BOGO** | Buy one get one | Buy 1 Get 1 Free |

### Offer Rules
- Minimum order value
- Valid from/to dates
- Active/inactive toggle
- Location-specific

## Kitchen Display System (KDS)

### Layout
```
┌─────────────┬─────────────┬─────────────┐
│    NEW      │  PREPARING  │    READY    │
├─────────────┼─────────────┼─────────────┤
│  Order 1    │  Order 3    │  Order 5    │
│  Order 2    │  Order 4    │             │
└─────────────┴─────────────┴─────────────┘
```

### Interactions
- Tap order → Advance status (new → preparing → ready → served)
- Real-time updates via Socket.io
- Color-coded status indicators

## Reports & Analytics

### KPI Cards
- Total Orders
- Total Revenue (₹)
- Pending Orders
- Active Customers

### Sales Overview
- Daily sales chart (bar graph)
- Revenue trends

### Top Items
- Best-selling menu items
- Quantity sold and revenue

## Settings

### Fee Configuration
- Monthly fee (₹)
- Per-order fee (₹)
- Default fee payer (customer/cafe)
- Auto-flip threshold (orders)
- Period order count

### Period Reset
- Reset period order count
- Manual or automatic reset

## Mobile App (Capacitor)

### Features
- Push notifications for order updates
- Splash screen with branding
- Status bar styling
- Back button handling

### Platforms
- Android (via Android Studio)
- iOS (via Xcode)

## Desktop App (Electron)

### Features
- Full-screen kiosk mode
- Receipt printer integration
- Keyboard shortcuts
- Window state persistence

### Shortcuts
| Shortcut | Action |
|----------|--------|
| Ctrl+1 | Go to POS |
| Ctrl+2 | Go to Orders |
| Ctrl+3 | Go to KDS |
| Ctrl+4 | Go to Menu |
| Ctrl+, | Go to Settings |

## Notifications

### Push Notifications (Firebase)
- Order status updates
- Low-stock alerts
- Custom notifications

### Socket.io Events
- Real-time order updates
- Inventory alerts
- KDS synchronization

## Data Security

### Authentication
- JWT tokens with expiration
- bcrypt password hashing
- PIN code login for staff

### Authorization
- Role-based access control (RBAC)
- Location-based data scoping
- Menu/order/inventory isolation

### Audit Trail
- All mutations logged to `audit_logs`
- User, location, action, entity, metadata
- Immutable audit record

## Deployment

### Backend
- Node.js 22+
- PostgreSQL 17+
- Firebase project (for push)

### Frontend
- Vite build → `dist/`
- Capacitor sync → `android/`, `ios/`
- Electron build → `dist-electron/`

### Environment
```env
DATABASE_URL=postgresql://user:pass@localhost:5432/tsos_dev
JWT_SECRET=your-secret-key
PORT=3001
```

## Demo Account

- **Email**: admin@tsos.dev
- **Password**: password123
- **PIN**: 1234
- **Location**: Demo Cafe

---

*TSOS — Built for Indian cafes*
