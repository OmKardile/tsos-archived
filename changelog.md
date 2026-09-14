# Changelog

All notable changes to TSOS are documented here.

## [1.0.0] — 2026-09-14

### Added

#### Phase 1: Foundation
- PostgreSQL database with 23 tables
- Express + TypeScript backend server
- JWT authentication (email/password + PIN login)
- RBAC middleware (owner, manager, cashier, kitchen roles)
- Multi-tenant location scoping
- Business and location CRUD
- Menu categories and items CRUD
- Menu variants and addons
- React + Vite + Tailwind CSS frontend
- Login and signup pages
- Dashboard shell with sidebar navigation
- KPI overview cards

#### Phase 2: POS & Orders
- POS screen with item grid and cart
- Checkout flow with payment methods (cash, UPI, card)
- Discount support
- Order creation with server-side price recomputation
- Fee engine integration (customer/cafe faced)
- Inventory auto-deduction on order completion
- Low-stock Socket.io alerts
- Orders list page with status filters
- Kitchen Display System (KDS) with 3-column view
- Tap-to-advance order status
- Socket.io real-time updates across all pages

#### Phase 3: Tables & Storefront
- Table management with CRUD operations
- QR code generation for tables
- Public storefront (`/order/:locationSlug`)
- QR table ordering (`/order/:slug/table/:id`)
- Order tracking page with live Socket.io updates

#### Phase 4: Inventory
- Ingredient CRUD with units (g, kg, ml, l, pcs)
- Low-stock threshold configuration
- Recipe mapping (menu items → ingredients)
- Auto-deduct on order completion
- Restock flow with logging
- Inventory logs (sale, restock, wastage, adjustment)
- Low-stock alert banner

#### Phase 5: Customers & Reports
- Customer list (auto-created from orders)
- Customer detail with order history
- Loyalty points system (earn/redeem)
- Offers (flat, percent, BOGO with min order + date range)
- Reports dashboard (KPI cards, sales chart, top items)

#### Phase 6: Fee Engine & Settings
- Per-order fee configuration
- Customer-faced vs Cafe-faced toggle
- Auto-flip threshold (after N orders, auto-switch payer)
- Period order counter with reset
- Settings UI for fee configuration

#### Phase 7: Firebase Integration
- Firebase Admin SDK initialization
- Push notification endpoints
- Firebase web config for Capacitor

#### Phase 12: Capacitor Mobile
- Capacitor initialization (Android + iOS)
- Push notification registration
- Status bar styling
- Splash screen configuration
- Back button handling

#### Phase 15: Electron Desktop
- Electron main process with window management
- Secure IPC via preload script
- Kiosk mode toggle
- Receipt printer integration
- Keyboard shortcuts (Ctrl+1-4 for navigation)
- Window state persistence
- Build scripts for Windows (NSIS), macOS (DMG), Linux (AppImage)

### Technical Details

- **Database**: PostgreSQL 17.6 with 23 tables
- **Backend**: Express + TypeScript, port 3001
- **Frontend**: Vite + React 19 + Tailwind CSS 4, port 5173
- **Realtime**: Socket.io for order updates and inventory alerts
- **Auth**: JWT tokens with bcrypt password hashing
- **Mobile**: Capacitor 8 with push notifications
- **Desktop**: Electron 35.3.0 with kiosk mode
- **Push**: Firebase Cloud Messaging

### Database Schema

- `businesses` — tenant root
- `locations` — per-location config
- `users` — staff accounts with roles
- `user_locations` — many-to-many user↔location
- `menu_categories` — menu sections
- `menu_items` — dishes/products
- `menu_item_variants` — size/variant options
- `addons` — optional add-ons
- `menu_item_addons` — item↔addon mapping
- `ingredients` — stock items
- `recipes` — menu_item→ingredient mapping
- `inventory_logs` — audit trail
- `dine_tables` — physical tables
- `orders` — order header
- `order_items` — line items
- `order_item_addons` — addon selections
- `payments` — payment records
- `customers` — loyalty profiles
- `loyalty_ledger` — points audit
- `offers` — promotions
- `location_fee_config` — fee engine config
- `shifts` — clock in/out
- `audit_logs` — action audit

### API Endpoints

- Auth: signup, login, PIN login, /me
- Menu: categories, items, variants, addons CRUD
- Orders: create, status, payment, fee engine
- Tables: CRUD, QR generation
- Public: storefront, order placement, tracking
- Inventory: ingredients, recipes, restock, logs
- Customers: list, detail, loyalty, offers
- Reports: summary, sales, top items
- Settings: fee config, period reset
- Notifications: push endpoints

### Known Limitations

- Razorpay integration requires test keys (not yet connected)
- WhatsApp notifications require BSP account (not yet connected)
- Electron build requires code signing for distribution
- Capacitor build requires Android Studio / Xcode

---

*Version 1.0.0 — Full-stack POS + Cafe Operations SaaS*
