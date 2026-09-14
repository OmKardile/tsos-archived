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
