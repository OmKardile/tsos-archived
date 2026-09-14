# TSOS — Technical Documentation

> Full-stack POS + Cafe Operations SaaS for the Indian market

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend (Vite)                        │
│  React 19 · TypeScript · Tailwind CSS 4 · Zustand · Socket │
│  Port 5173                                                  │
├─────────────────────────────────────────────────────────────┤
│                        Backend (Express)                     │
│  Node 22 · TypeScript · PostgreSQL 17 · Socket.io · JWT     │
│  Port 3001                                                  │
├─────────────────────────────────────────────────────────────┤
│                      Database (PostgreSQL)                   │
│  23 tables · UUID PKs · JSONB · Timestamps                  │
│  Database: tsos_dev · Port: 5432                             │
├─────────────────────────────────────────────────────────────┤
│                      Mobile (Capacitor)                      │
│  Android · iOS · Push Notifications · Splash Screen          │
├─────────────────────────────────────────────────────────────┤
│                      Desktop (Electron)                      │
│  Counter POS · Kiosk Mode · Receipt Printer · Shortcuts      │
└─────────────────────────────────────────────────────────────┘
```

## Project Structure

```
TSOS/
├── app/
│   ├── backend/                 # Express + TypeScript API
│   │   ├── src/
│   │   │   ├── index.ts         # Server entry, Socket.io, route mounting
│   │   │   ├── db/
│   │   │   │   ├── pool.ts      # PostgreSQL connection pool
│   │   │   │   ├── migrate.ts   # 23-table schema migration
│   │   │   │   └── seed.ts      # Demo data seeder
│   │   │   ├── middleware/
│   │   │   │   ├── auth.ts      # JWT verification, RBAC, location access
│   │   │   │   └── locationScope.ts  # Multi-tenant query helpers
│   │   │   ├── routes/
│   │   │   │   ├── auth.ts      # Signup, login, PIN login, /me
│   │   │   │   ├── menu.ts      # Categories, items, variants, addons
│   │   │   │   ├── locations.ts # CRUD, dashboard summary
│   │   │   │   ├── orders.ts    # CRUD, status flow, fee engine, inventory deduction
│   │   │   │   ├── tables.ts    # CRUD, QR token generation
│   │   │   │   ├── public.ts    # Storefront menu, order placement, tracking
│   │   │   │   ├── inventory.ts # Ingredients, recipes, restock, logs
│   │   │   │   ├── customers.ts # List, detail, loyalty, offers
│   │   │   │   ├── reports.ts   # Summary, sales overview, top items
│   │   │   │   ├── settings.ts  # Fee config, period reset
│   │   │   │   └── notifications.ts  # Push notification endpoints
│   │   │   └── services/
│   │   │       └── firebase.ts  # Firebase Admin SDK init + push helpers
│   │   ├── firebase-adminsdk.json
│   │   └── .env
│   ├── frontend/                # Vite + React + TypeScript SPA
│   │   ├── src/
│   │   │   ├── App.tsx          # Router with all routes
│   │   │   ├── main.tsx         # Entry point, mobile init
│   │   │   ├── lib/
│   │   │   │   ├── api.ts       # Fetch wrapper with JWT
│   │   │   │   ├── store.ts     # Zustand (user, locations, activeLocation)
│   │   │   │   ├── firebase.ts  # Firebase web config
│   │   │   │   └── mobile.ts    # Capacitor init (push, status bar, splash)
│   │   │   ├── layouts/
│   │   │   │   └── DashboardLayout.tsx  # Sidebar nav, location switcher
│   │   │   └── pages/           # All page components
│   │   ├── capacitor.config.json
│   │   ├── android/             # Capacitor Android project
│   │   ├── ios/                 # Capacitor iOS project
│   │   └── vite.config.ts
│   └── electron/                # Electron desktop wrapper
│       ├── main.js              # Main process, window management
│       ├── preload.js           # Context bridge for IPC
│       ├── receipt.html         # Thermal receipt template
│       └── package.json
```

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Frontend | React | 19.2.8 |
| UI | Tailwind CSS | 4.3.3 |
| State | Zustand | 5.0.15 |
| Build | Vite | 8.3.0 |
| Language | TypeScript | 6.0.2 |
| Backend | Express | — |
| Realtime | Socket.io | 4.8.3 |
| Database | PostgreSQL | 17.6 |
| Auth | JWT + bcrypt | — |
| Mobile | Capacitor | 8.x |
| Desktop | Electron | 35.3.0 |
| Push | Firebase Cloud Messaging | 12.19.0 |

## Database Schema (23 Tables)

### Core
- `businesses` — tenant root (owner, name)
- `locations` — per-location config (slug, timezone, address)
- `users` — staff accounts (role, PIN, hashed password)
- `user_locations` — many-to-many user↔location

### Menu
- `menu_categories` — grouped menu sections
- `menu_items` — dishes/products (price, veg, tax rate)
- `menu_item_variants` — size/variant price deltas
- `addons` — optional add-ons with price
- `menu_item_addons` — many-to-many item↔addon

### Inventory
- `ingredients` — stock items (unit, qty, threshold)
- `recipes` — menu_item→ingredient qty mapping
- `inventory_logs` — audit trail (sale/restock/wastage/adjustment)

### Orders
- `dine_tables` — physical tables (QR token, status)
- `orders` — order header (type, status, totals, fee payer)
- `order_items` — line items (qty, unit price, notes)
- `order_item_addons` — addon selections per item
- `payments` — payment records (method, amount, gateway ref)

### Customers
- `customers` — loyalty profiles (points, total orders/spent)
- `loyalty_ledger` — points earn/redeem audit
- `offers` — promotions (percent/flat/BOGO, min order, validity)

### Config
- `location_fee_config` — per-location fee engine config

### Operations
- `shifts` — clock in/out tracking
- `audit_logs` — action audit trail (JSONB metadata)

## API Endpoints

### Auth (`/api/auth`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/signup` | No | Create account + business + location |
| POST | `/login` | No | Email/password login |
| POST | `/pin-login` | No | PIN code login |
| GET | `/me` | Yes | Current user profile |

### Menu (`/api/menu`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/categories` | Yes | List categories |
| POST | `/categories` | Yes | Create category |
| PUT | `/categories/:id` | Yes | Update category |
| DELETE | `/categories/:id` | Yes | Delete category |
| GET | `/items` | Yes | List items with variants/addons |
| POST | `/items` | Yes | Create item |
| PUT | `/items/:id` | Yes | Update item |
| DELETE | `/items/:id` | Yes | Delete item |
| GET | `/addons` | Yes | List addons |
| POST | `/addons` | Yes | Create addon |
| DELETE | `/addons/:id` | Yes | Delete addon |

### Orders (`/api/orders`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | Yes | List orders (filterable) |
| GET | `/:id` | Yes | Order detail |
| POST | `/` | Yes | Create order (triggers fee engine + inventory deduction) |
| PUT | `/:id/status` | Yes | Advance order status |
| POST | `/:id/payment` | Yes | Record payment |

### Tables (`/api/tables`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | Yes | List tables |
| POST | `/` | Yes | Create table |
| DELETE | `/:id` | Yes | Delete table |
| GET | `/:id/qr` | Yes | Generate QR code (PNG) |

### Public (`/api/public`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/storefront/:slug` | No | Menu for public display |
| POST | `/order` | No | Place order (QR/online) |
| GET | `/order/:id` | No | Order status for tracking |

### Inventory (`/api/inventory`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/ingredients` | Yes | List ingredients |
| POST | `/ingredients` | Yes | Create ingredient |
| PUT | `/ingredients/:id` | Yes | Update ingredient |
| DELETE | `/ingredients/:id` | Yes | Delete ingredient |
| POST | `/ingredients/:id/restock` | Yes | Add stock |
| GET | `/recipes` | Yes | List recipes |
| POST | `/recipes` | Yes | Create/update recipe |
| GET | `/alerts` | Yes | Low-stock alerts |

### Customers (`/api/customers`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | Yes | List customers |
| GET | `/:id` | Yes | Customer detail + history |
| GET | `/offers` | Yes | List offers |
| POST | `/offers` | Yes | Create offer |
| PUT | `/offers/:id` | Yes | Update offer |
| DELETE | `/offers/:id` | Yes | Delete offer |

### Reports (`/api/reports`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/summary` | Yes | KPI cards data |
| GET | `/sales-overview` | Yes | Sales by date |
| GET | `/top-items` | Yes | Best sellers |

### Settings (`/api/settings`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/fee-config` | Yes | Fee engine config |
| PUT | `/fee-config` | Yes | Update fee config |
| POST | `/fee-config/reset-period` | Yes | Reset period counter |

### Notifications (`/api/notifications`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/send` | Yes | Send push notification |
| POST | `/order-update` | Yes | Send order status push |

### System
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/health` | No | Database health check |

## Socket.io Events

| Event | Direction | Payload | Description |
|-------|-----------|---------|-------------|
| `join_location` | Client→Server | `locationId` | Join location room |
| `leave_location` | Client→Server | `locationId` | Leave location room |
| `order:created` | Server→Client | `order` | New order placed |
| `order:status` | Server→Client | `{orderId, status}` | Order status changed |
| `inventory:low_stock` | Server→Client | `alert` | Ingredient below threshold |

## Authentication

- **JWT tokens** stored in localStorage
- **Password hashing** via bcrypt
- **PIN login** for quick staff access
- **RBAC roles**: owner > manager > cashier > kitchen
- **Location scoping**: every query filtered by `location_id`

## Fee Engine

```
Per-order fee = location_fee_config.per_order_fee
Fee payer determined by:
  1. If auto-flip enabled AND period_order_count >= threshold → flip payer
  2. Otherwise → default_fee_payer
Total added to grand_total if fee_payer = 'customer'
```

## Environment Variables

```env
# Backend
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/tsos_dev
JWT_SECRET=tsos-jwt-secret-2024
PORT=3001

# Firebase (for push notifications)
# firebase-adminsdk.json in backend root
```

## Dummy Data (All 23 Tables)

### businesses
| id | owner_user_id | name | created_at |
|----|--------------|------|------------|
| uuid-001 | uuid-user-01 | Demo Cafe | 2026-09-14 |

### locations
| id | business_id | name | slug | address | phone | timezone | is_active |
|----|-------------|------|------|---------|-------|----------|-----------|
| uuid-loc-01 | uuid-001 | Main Branch | main-branch | 123 MG Road, Bangalore | +919876543210 | Asia/Kolkata | true |

### users
| id | business_id | name | email | phone | password_hash | pin_code | role | is_active |
|----|-------------|------|-------|-------|---------------|----------|------|-----------|
| uuid-user-01 | uuid-001 | Admin | admin@tsos.dev | — | $2a$10$... | 1234 | owner | true |

### user_locations
| user_id | location_id |
|---------|-------------|
| uuid-user-01 | uuid-loc-01 |

### menu_categories
| id | location_id | name | sort_order | is_active |
|----|-------------|------|------------|-----------|
| uuid-cat-01 | uuid-loc-01 | Coffee | 1 | true |
| uuid-cat-02 | uuid-loc-01 | Tea | 2 | true |
| uuid-cat-03 | uuid-loc-01 | Snacks | 3 | true |
| uuid-cat-04 | uuid-loc-01 | Pastries | 4 | true |

### menu_items
| id | location_id | category_id | name | description | price | is_veg | tax_rate_pct | is_available |
|----|-------------|-------------|------|-------------|-------|--------|--------------|--------------|
| uuid-item-01 | uuid-loc-01 | uuid-cat-01 | Espresso | Strong single shot | 120.00 | true | 5 | true |
| uuid-item-02 | uuid-loc-01 | uuid-cat-01 | Cappuccino | Espresso with steamed milk | 150.00 | true | 5 | true |
| uuid-item-03 | uuid-loc-01 | uuid-cat-01 | Latte | Smooth espresso with milk | 160.00 | true | 5 | true |
| uuid-item-04 | uuid-loc-01 | uuid-cat-02 | Masala Chai | Traditional spiced tea | 60.00 | true | 5 | true |
| uuid-item-05 | uuid-loc-01 | uuid-cat-02 | Green Tea | Light and refreshing | 50.00 | true | 5 | true |
| uuid-item-06 | uuid-loc-01 | uuid-cat-03 | Samosa | Crispy pastry with potato filling | 40.00 | true | 5 | true |
| uuid-item-07 | uuid-loc-01 | uuid-cat-03 | Vada Pav | Mumbai street food classic | 50.00 | true | 5 | true |
| uuid-item-08 | uuid-loc-01 | uuid-cat-03 | Sandwich | Grilled veg sandwich | 80.00 | true | 5 | true |

### menu_item_variants
| id | menu_item_id | name | price_delta |
|----|--------------|------|-------------|
| uuid-var-01 | uuid-item-01 | Single | 0.00 |
| uuid-var-02 | uuid-item-01 | Double | 60.00 |
| uuid-var-03 | uuid-item-02 | Regular | 0.00 |
| uuid-var-04 | uuid-item-02 | Large | 40.00 |

### addons
| id | location_id | name | price |
|----|-------------|------|-------|
| uuid-addon-01 | uuid-loc-01 | Extra Shot | 30.00 |
| uuid-addon-02 | uuid-loc-01 | Oat Milk | 40.00 |
| uuid-addon-03 | uuid-loc-01 | Whipped Cream | 20.00 |

### menu_item_addons
| menu_item_id | addon_id |
|--------------|----------|
| uuid-item-01 | uuid-addon-01 |
| uuid-item-02 | uuid-addon-01 |
| uuid-item-02 | uuid-addon-03 |
| uuid-item-03 | uuid-addon-01 |
| uuid-item-03 | uuid-addon-02 |

### ingredients
| id | location_id | name | unit | stock_qty | low_stock_threshold |
|----|-------------|------|------|-----------|---------------------|
| uuid-ing-01 | uuid-loc-01 | Coffee Beans | g | 5000 | 500 |
| uuid-ing-02 | uuid-loc-01 | Milk | ml | 10000 | 1000 |
| uuid-ing-03 | uuid-loc-01 | Sugar | g | 3000 | 300 |
| uuid-ing-04 | uuid-loc-01 | Tea Leaves | g | 2000 | 200 |
| uuid-ing-05 | uuid-loc-01 | Samosa Dough | g | 4000 | 500 |
| uuid-ing-06 | uuid-loc-01 | Potato | g | 6000 | 1000 |
| uuid-ing-07 | uuid-loc-01 | Bread | pcs | 50 | 10 |

### recipes
| menu_item_id | ingredient_id | qty_consumed |
|--------------|---------------|--------------|
| uuid-item-01 (Espresso) | uuid-ing-01 (Coffee Beans) | 18g |
| uuid-item-02 (Cappuccino) | uuid-ing-01 (Coffee Beans) | 18g |
| uuid-item-02 (Cappuccino) | uuid-ing-02 (Milk) | 150ml |
| uuid-item-03 (Latte) | uuid-ing-01 (Coffee Beans) | 18g |
| uuid-item-03 (Latte) | uuid-ing-02 (Milk) | 200ml |
| uuid-item-04 (Masala Chai) | uuid-ing-04 (Tea Leaves) | 5g |
| uuid-item-04 (Masala Chai) | uuid-ing-02 (Milk) | 200ml |
| uuid-item-05 (Green Tea) | uuid-ing-04 (Tea Leaves) | 3g |
| uuid-item-06 (Samosa) | uuid-ing-05 (Samosa Dough) | 100g |
| uuid-item-06 (Samosa) | uuid-ing-06 (Potato) | 50g |
| uuid-item-07 (Vada Pav) | uuid-ing-07 (Bread) | 2pcs |
| uuid-item-08 (Sandwich) | uuid-ing-07 (Bread) | 2pcs |

### inventory_logs
| id | ingredient_id | change_qty | reason | ref_order_id | created_at |
|----|---------------|------------|--------|--------------|------------|
| uuid-log-01 | uuid-ing-01 | -18 | sale | uuid-order-01 | 2026-09-14 |
| uuid-log-02 | uuid-ing-02 | -150 | sale | uuid-order-01 | 2026-09-14 |
| uuid-log-03 | uuid-ing-01 | 5000 | restock | — | 2026-09-14 |

### dine_tables
| id | location_id | label | qr_token | seats | status |
|----|-------------|-------|----------|-------|--------|
| uuid-tbl-01 | uuid-loc-01 | Table 1 | tbl-001 | 4 | free |
| uuid-tbl-02 | uuid-loc-01 | Table 2 | tbl-002 | 4 | free |
| uuid-tbl-03 | uuid-loc-01 | Table 3 | tbl-003 | 2 | occupied |
| uuid-tbl-04 | uuid-loc-01 | Table 4 | tbl-004 | 6 | free |
| uuid-tbl-05 | uuid-loc-01 | Counter | tbl-ctr | 2 | free |

### orders
| id | location_id | table_id | customer_id | order_type | status | placed_by | subtotal | tax_total | discount_total | platform_fee | fee_payer | grand_total | payment_status | created_at |
|----|-------------|----------|-------------|------------|--------|-----------|----------|-----------|----------------|--------------|-----------|-------------|----------------|------------|
| uuid-order-01 | uuid-loc-01 | uuid-tbl-01 | uuid-cust-01 | dine_in | completed | staff | 270.00 | 13.50 | 0.00 | 1.00 | customer | 284.50 | paid | 2026-09-14 |
| uuid-order-02 | uuid-loc-01 | uuid-tbl-03 | uuid-cust-02 | dine_in | preparing | staff | 110.00 | 5.50 | 0.00 | 1.00 | customer | 116.50 | paid | 2026-09-14 |
| uuid-order-03 | uuid-loc-01 | — | uuid-cust-03 | takeaway | new | staff | 200.00 | 10.00 | 20.00 | 1.00 | cafe | 191.00 | paid | 2026-09-14 |

### order_items
| id | order_id | menu_item_id | variant_id | qty | unit_price | notes |
|----|----------|--------------|------------|-----|------------|-------|
| uuid-oi-01 | uuid-order-01 | uuid-item-02 | uuid-var-03 | 1 | 150.00 | — |
| uuid-oi-02 | uuid-order-01 | uuid-item-06 | — | 3 | 40.00 | — |
| uuid-oi-03 | uuid-order-02 | uuid-item-07 | — | 1 | 50.00 | Extra chutney |
| uuid-oi-04 | uuid-order-02 | uuid-item-04 | — | 1 | 60.00 | Less sugar |
| uuid-oi-05 | uuid-order-03 | uuid-item-01 | uuid-var-02 | 2 | 180.00 | — |

### order_item_addons
| order_item_id | addon_id |
|---------------|----------|
| uuid-oi-01 | uuid-addon-01 |

### payments
| id | order_id | method | amount | status | gateway_ref | created_at |
|----|----------|--------|--------|--------|-------------|------------|
| uuid-pay-01 | uuid-order-01 | upi | 284.50 | success | pay_abc123 | 2026-09-14 |
| uuid-pay-02 | uuid-order-02 | cash | 116.50 | success | — | 2026-09-14 |
| uuid-pay-03 | uuid-order-03 | card | 191.00 | success | pay_xyz789 | 2026-09-14 |

### customers
| id | business_id | name | phone | email | loyalty_points | total_orders | total_spent | created_at |
|----|-------------|------|-------|-------|----------------|--------------|-------------|------------|
| uuid-cust-01 | uuid-001 | Rahul Sharma | +919876543211 | rahul@email.com | 28 | 3 | 850.00 | 2026-09-14 |
| uuid-cust-02 | uuid-001 | Priya Patel | +919876543212 | priya@email.com | 12 | 1 | 116.50 | 2026-09-14 |
| uuid-cust-03 | uuid-001 | Amit Singh | +919876543213 | amit@email.com | 19 | 2 | 391.00 | 2026-09-14 |

### loyalty_ledger
| id | customer_id | order_id | points_delta | reason | created_at |
|----|-------------|----------|--------------|--------|------------|
| uuid-loy-01 | uuid-cust-01 | uuid-order-01 | 28 | earn | 2026-09-14 |
| uuid-loy-02 | uuid-cust-02 | uuid-order-02 | 12 | earn | 2026-09-14 |
| uuid-loy-03 | uuid-cust-03 | uuid-order-03 | 19 | earn | 2026-09-14 |

### offers
| id | location_id | title | type | value | min_order_value | valid_from | valid_to | is_active |
|----|-------------|-------|------|-------|-----------------|------------|----------|-----------|
| uuid-offer-01 | uuid-loc-01 | Welcome Discount | flat | 50.00 | 200.00 | 2026-09-01 | 2026-09-30 | true |
| uuid-offer-02 | uuid-loc-01 | Monsoon Special | percent | 10.00 | 150.00 | 2026-06-01 | 2026-09-30 | true |
| uuid-offer-03 | uuid-loc-01 | Buy 1 Get 1 Coffee | bogo | 150.00 | 0.00 | 2026-09-01 | 2026-09-14 | true |

### location_fee_config
| location_id | monthly_fee | per_order_fee | default_fee_payer | customer_paid_order_limit | period_order_count | period_reset_at |
|-------------|-------------|---------------|-------------------|--------------------------|-------------------|-----------------|
| uuid-loc-01 | 0.00 | 1.00 | customer | 100 | 3 | 2026-09-14 |

### shifts
| id | user_id | location_id | clock_in | clock_out |
|----|---------|-------------|----------|-----------|
| uuid-shift-01 | uuid-user-01 | uuid-loc-01 | 2026-09-14 09:00:00 | 2026-09-14 18:00:00 |

### audit_logs
| id | user_id | location_id | action | entity | entity_id | meta_json | created_at |
|----|---------|-------------|--------|--------|-----------|-----------|------------|
| uuid-audit-01 | uuid-user-01 | uuid-loc-01 | create | order | uuid-order-01 | {"total": 284.50} | 2026-09-14 |
| uuid-audit-02 | uuid-user-01 | uuid-loc-01 | update | order | uuid-order-02 | {"status": "preparing"} | 2026-09-14 |

## Commands

```bash
# Backend
cd app/backend
npm install
npx tsx src/index.ts          # Start dev server

# Frontend
cd app/frontend
npm install
npm run dev                    # Start Vite dev server
npm run build                  # Production build

# Capacitor
cd app/frontend
npx cap sync                   # Sync web assets
npx cap open android           # Open in Android Studio
npx cap open ios               # Open in Xcode

# Electron
cd app/electron
npm install
npm start                      # Run in dev mode
npm run build:win              # Build Windows installer
npm run build:mac              # Build macOS DMG
npm run build:linux            # Build Linux AppImage
```

## Quick Setup Script (PowerShell)

Run this script on a new machine to install, build, and launch everything:

```powershell
# TSOS One-Click Setup
# Run: .\setup.ps1

$ErrorActionPreference = "Stop"
$root = "D:\work\TSOS\app"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   TSOS - Full Setup Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# ---------- Check prerequisites ----------
Write-Host "[1/8] Checking prerequisites..." -ForegroundColor Yellow

try { node -v | Out-Null } catch {
    Write-Host "Node.js not found. Install from https://nodejs.org" -ForegroundColor Red
    exit 1
}

try { psql --version | Out-Null } catch {
    Write-Host "PostgreSQL not found. Install from https://postgresql.org" -ForegroundColor Red
    exit 1
}

Write-Host "  Node.js: $(node -v)" -ForegroundColor Green
Write-Host "  npm: $(npm -v)" -ForegroundColor Green
Write-Host ""

# ---------- Setup PostgreSQL database ----------
Write-Host "[2/8] Setting up PostgreSQL database..." -ForegroundColor Yellow

$dbExists = psql -U postgres -tAc "SELECT 1 FROM pg_database WHERE datname='tsos_dev'" 2>$null
if ($dbExists -ne "1") {
    psql -U postgres -c "CREATE DATABASE tsos_dev;"
    Write-Host "  Database 'tsos_dev' created" -ForegroundColor Green
} else {
    Write-Host "  Database 'tsos_dev' already exists" -ForegroundColor Green
}
Write-Host ""

# ---------- Install backend dependencies ----------
Write-Host "[3/8] Installing backend dependencies..." -ForegroundColor Yellow
Push-Location "$root\backend"
npm install
Pop-Location
Write-Host "  Backend dependencies installed" -ForegroundColor Green
Write-Host ""

# ---------- Install frontend dependencies ----------
Write-Host "[4/8] Installing frontend dependencies..." -ForegroundColor Yellow
Push-Location "$root\frontend"
npm install
Pop-Location
Write-Host "  Frontend dependencies installed" -ForegroundColor Green
Write-Host ""

# ---------- Install electron dependencies ----------
Write-Host "[5/8] Installing Electron dependencies..." -ForegroundColor Yellow
Push-Location "$root\electron"
npm install
Pop-Location
Write-Host "  Electron dependencies installed" -ForegroundColor Green
Write-Host ""

# ---------- Start backend (runs migrations + seeds) ----------
Write-Host "[6/8] Starting backend server (runs migrations)..." -ForegroundColor Yellow
Start-Process -WorkingDirectory "$root\backend" -FilePath "powershell" -ArgumentList "-Command", "npx tsx src/index.ts" -WindowStyle Normal
Write-Host "  Backend starting on http://localhost:3001" -ForegroundColor Green
Write-Host "  Waiting 8s for server to initialize..." -ForegroundColor DarkGray
Start-Sleep -Seconds 8
Write-Host ""

# ---------- Start frontend ----------
Write-Host "[7/8] Starting frontend dev server..." -ForegroundColor Yellow
Start-Process -WorkingDirectory "$root\frontend" -FilePath "powershell" -ArgumentList "-Command", "npm run dev" -WindowStyle Normal
Write-Host "  Frontend starting on http://localhost:5173" -ForegroundColor Green
Write-Host ""

# ---------- Build native apps ----------
Write-Host "[8/8] Building native apps..." -ForegroundColor Yellow

# Build frontend for Capacitor
Push-Location "$root\frontend"
Write-Host "  Building frontend for mobile..." -ForegroundColor DarkGray
npm run build 2>$null
npx cap sync 2>$null
Pop-Location

# Capacitor Android
$capAndroid = "$root\frontend\android"
if (Test-Path $capAndroid) {
    Write-Host "  Capacitor Android project ready" -ForegroundColor Green
}

# Electron Windows
$electronDist = "$root\electron\dist-electron"
if (Test-Path $electronDist) {
    Write-Host "  Electron build ready" -ForegroundColor Green
}
Write-Host ""

# ---------- Open in Explorer ----------
Write-Host "Opening project folders..." -ForegroundColor Yellow
Start-Process explorer "$root\backend\src"
Start-Process explorer "$root\frontend\src"
Start-Process explorer "$root\electron"
if (Test-Path $capAndroid) { Start-Process explorer $capAndroid }
Write-Host ""

# ---------- Done ----------
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   Setup Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Backend API:    http://localhost:3001" -ForegroundColor White
Write-Host "  Frontend:       http://localhost:5173" -ForegroundColor White
Write-Host "  Login:          admin@tsos.dev / password123" -ForegroundColor White
Write-Host "  PIN:            1234" -ForegroundColor White
Write-Host ""
Write-Host "  Open Android:   cd app/frontend && npx cap open android" -ForegroundColor DarkGray
Write-Host "  Open Electron:  cd app/electron && npm start" -ForegroundColor DarkGray
Write-Host ""
Write-Host "Press any key to exit..." -ForegroundColor DarkGray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
```

### What the script does:

| Step | Action |
|------|--------|
| 1 | Checks Node.js and PostgreSQL are installed |
| 2 | Creates `tsos_dev` database if not exists |
| 3 | Installs backend npm dependencies |
| 4 | Installs frontend npm dependencies |
| 5 | Installs Electron dependencies |
| 6 | Starts backend server (auto-runs migrations) |
| 7 | Starts frontend dev server |
| 8 | Builds frontend + syncs Capacitor |
| 9 | Opens source folders in Explorer |

### To run:

```powershell
cd D:\work\TSOS
.\setup.ps1
```

### To run without execution policy restriction:

```powershell
powershell -ExecutionPolicy Bypass -File .\setup.ps1
```
