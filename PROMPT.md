# TSOS — Build From Scratch

## What You're Building

TSOS is a point-of-sale and cafe operations platform for small-to-medium cafes and restaurants in India. Think of it as a simpler, India-focused alternative to Toast or Square for Restaurants — but free to use with a per-order fee model.

The product has four surfaces: a web app (React), a native Android app (Kotlin/Compose), a native Windows desktop app (WPF), and two marketing landing pages. The backend is **Supabase** — Auth, PostgreSQL, and Realtime. There is no custom server.

## The Product

### Core Idea
Cafe owners sign up, configure their menu, and start taking orders. Staff use the POS to create orders. The kitchen sees orders on a KDS (Kitchen Display System) in real time. Customers can scan a QR code at their table to order directly. Inventory tracks ingredients and auto-deducts when orders complete. A loyalty system rewards repeat customers.

### Business Model
- **Free to use** — ₹0/month subscription
- **Per-order fee** — ₹1 per order (configurable), paid by customer or absorbed by the cafe
- **Auto-flip** — after a configurable number of orders, the fee payer switches automatically (e.g., first 100 orders: cafe pays, after that: customer pays)

### User Roles
- **Owner** — full access, settings, reports
- **Manager** — manage menu, orders, inventory, staff
- **Cashier** — process orders and payments
- **Kitchen** — view/update order status on KDS

### Order Flow
1. Staff creates order at POS (or customer scans QR)
2. Order appears on KDS immediately (real-time)
3. Kitchen marks as preparing → ready
4. Staff serves → completed
5. On completion: inventory auto-deducts, loyalty points earned, table freed, fee engine updated

### Key Features
- **POS** — grid menu with category filter, cart, order type (dine-in/takeaway/delivery), payment methods (cash/UPI/card), discount, platform fee
- **KDS** — 3-column layout (New | Preparing | Ready), real-time, elapsed time tracking, tap to advance status
- **Menu Management** — categories, items, variants (Small/Medium/Large), addons (extra cheese, etc.), veg/non-veg toggle, tax rates
- **Inventory** — ingredients with units (g/kg/ml/l/pcs), recipes linking menu items to ingredients, auto-deduct on order completion, low stock alerts, restock with logging
- **Tables** — CRUD, QR code per table linking to public storefront, auto-free on order completion
- **Customers** — profiles, loyalty points (1 point per ₹10 spent), redemption, order history
- **Offers** — percent/flat/BOGO, min order value, validity dates
- **Reports** — KPI cards, sales by date, top items
- **Settings** — fee config per location (per-order fee, fee payer, auto-flip threshold)
- **Storefront** — public QR ordering page (no auth), customer browses menu, adds to cart, places order
- **Order Tracking** — customer sees order status after placing

## Tech Stack

| Layer | Tech | Notes |
|-------|------|-------|
| Backend | **Supabase** | Auth (GoTrue), PostgreSQL, Realtime, RLS |
| Web | React 19, TypeScript, Vite, Tailwind CSS v4, Zustand | |
| Android | Kotlin, Jetpack Compose, Material 3, Hilt, Retrofit, Gson, KSP | |
| Windows | C# WPF, .NET 9 | |
| Marketing | Static HTML | 2 versions |

## Design System

The visual identity is warm and premium — cream backgrounds, orange accents, clean typography. Not cold/techy like most SaaS. Think warm bakery vibes.

### Color Tokens

| Token | Value | Use |
|-------|-------|-----|
| Background | `#FFF9F2` | Page background |
| Surface | `#FFFFFF` | Cards, panels |
| Surface Secondary | `#F5F0EB` | Hover states, secondary surfaces |
| Divider | `#E9E0D6` | Borders, separators |
| Action | `#F97316` | Primary buttons, active states, links |
| Action Hover | `#EA580C` | Button hover |
| Action Soft | `#FFF1E6` | Light orange backgrounds (badges, tags) |
| Completed | `#17803D` | Success states, completed orders |
| Completed Soft | `#E8F5EC` | Light green backgrounds |
| Attention | `#B45309` | Warnings, pending states |
| Attention Soft | `#FFF4E5` | Light amber backgrounds |
| Destructive | `#B42318` | Delete, errors |
| Destructive Soft | `#FEF2F2` | Light red backgrounds |
| Info | `#2563EB` | Informational |
| Info Soft | `#EFF6FF` | Light blue backgrounds |
| Accent | `#7C3AED` | Premium features, highlights |
| Accent Soft | `#F5F3FF` | Light purple backgrounds |
| Text Primary | `#1C1917` | Headings, main text |
| Text Secondary | `#57534E` | Descriptions, labels |
| Text Muted | `#A8A29E` | Placeholders, hints |

### Typography
- **Font**: Inter (400, 500, 600, 700, 800)
- **Grid**: 4pt base
- **Radius**: 8pt (sm), 12pt (md), 16pt (lg)

### Platform Implementation
- **Web**: Tailwind v4 `@theme` block in CSS
- **Android**: Kotlin `Color()` constants in `Theme.kt`, plus legacy aliases (Slate900, Emerald500, etc.) for any code referencing old names
- **Windows**: XAML `SolidColorBrush` resources in `App.xaml`

## Database Schema

23 tables in PostgreSQL. UUID primary keys throughout.

### Multi-Tenancy
`businesses` → `locations` → `user_locations`. Every data table has a `location_id` column. Users are assigned to specific locations. All queries are scoped to the active location.

### Core Tables
- `businesses` — tenant root (owner_user_id, name)
- `locations` — per-location config (business_id, name, slug, address, phone)
- `profiles` — user accounts extending Supabase auth.users (id = auth.users.id, email, name, role, business_id, pin_code, is_active)
- `user_locations` — many-to-many user↔location

### Menu
- `menu_categories` — grouped sections (location_id, name, sort_order)
- `menu_items` — products (location_id, category_id, name, description, price, image_url, is_veg, is_available, tax_rate_pct)
- `menu_item_variants` — size options (menu_item_id, name, price_delta)
- `addons` — optional extras (location_id, name, price)
- `menu_item_addons` — many-to-many item↔addon

### Inventory
- `ingredients` — stock items (location_id, name, unit, stock_qty, low_stock_threshold)
- `recipes` — menu_item→ingredient mapping (menu_item_id, ingredient_id, qty_consumed)
- `inventory_logs` — audit trail (ingredient_id, change_qty, reason, ref_order_id)

### Orders
- `dine_tables` — physical tables (location_id, label, qr_token, seats, status: free/occupied/reserved)
- `orders` — header (location_id, table_id, customer_id, order_type, status, placed_by, subtotal, tax_total, discount_total, platform_fee, fee_payer, grand_total, payment_status)
- `order_items` — line items (order_id, menu_item_id, variant_id, qty, unit_price, notes)
- `order_item_addons` — addon selections per item
- `payments` — payment records (order_id, method, amount, status)

### Customers & Loyalty
- `customers` — profiles (business_id, name, phone, email, loyalty_points, total_orders, total_spent)
- `loyalty_ledger` — points audit (customer_id, points_delta, reason)
- `offers` — promotions (location_id, title, type, value, min_order_value, valid_from, valid_to, is_active)

### Config
- `location_fee_config` — fee engine settings (location_id, monthly_fee, per_order_fee, default_fee_payer, customer_paid_order_limit, period_order_count)

### Additional
- `shifts` — clock in/out tracking
- `audit_logs` — action audit trail

Full SQL schema and seed data are in `documentation.md` and `readme.md` in the repo root. Recreate it exactly.

## Supabase Specifics

### Auth
- `supabase.auth.signUp()` — creates user in auth.users. A database trigger or Edge Function should create the corresponding `profiles` row (profiles.id = auth.users.id).
- `supabase.auth.signInWithPassword()` — email login
- PIN login — query `profiles` table where email + pin_code match. This needs service role key (Edge Function) or can be done client-side if you accept the tradeoff for a POS app.
- JWT from Supabase Auth replaces custom middleware.

### RLS
Every table needs Row Level Security. The pattern: extract `user_id` from JWT, check `user_locations` for the relevant `location_id`. This replaces the custom middleware in the Express version.

### Realtime
Subscribe to `orders` table changes filtered by `location_id`. This powers the KDS and order tracking. Use `supabase.channel()` with `postgres_changes` events.

### API Access
Web uses `@supabase/supabase-js` client directly. Android and Windows use the Supabase REST API (`https://{project}.supabase.co/rest/v1/{table}`) with `apikey` header and `Authorization: Bearer {token}`.

## Navigation

### Web
Sidebar: `Today` (Overview) | `Orders` | `New Sale` (POS) | `Stock` (Inventory) | `More` ▼ (Menu, Tables, Customers, Offers, Reports, Settings)

### Android
Drawer or bottom nav: Dashboard, POS, Orders, KDS, Menu, More (Inventory, Tables, Customers, Reports, Settings)

### Windows
Left sidebar: Dashboard, POS, Orders, KDS, Menu, Inventory, Tables, Reports, Settings

## Marketing Pages

Two standalone HTML files, no build step.

### Version 1 (Original)
Animated gradient background (cream tones), hero "POS + Cafe Ops. ₹0/month", floating POS mockup, bento feature grid (POS, KDS, QR, Inventory, Loyalty, Multi-Location), 3-step how it works, pricing (Starter ₹0+₹1/order, Growth ₹0+₹0.50/order), testimonials, FAQ accordion, dark footer.

### Version 2 (Redesign)
Stripe/Linear aesthetic, hero "Good food deserves better tools", tablet mockup with floating labels, stats bar (500+ cafes, 2M+ orders, 99.9% uptime, 4.8/5 rating), logo strip, "The TSOS Way" section, 6-card features grid, multi-device section, testimonial CTA on dark overlay, 3-tier pricing with monthly/yearly toggle, footer with columns.

## Seed Data

Demo credentials: `admin@tsos.dev` / `password123` / PIN `1234`

Seed with:
- 1 business, 1 location (slug: `demo-cafe`, name: "Demo Cafe")
- 4 categories: Coffee, Tea, Snacks, Pastries
- ~7 menu items across categories (Espresso ₹120, Cappuccino ₹150, Latte ₹160, Green Tea ₹50, Samosa ₹40, Vada Pav ₹50, Sandwich ₹80)
- Variants: Espresso Single/Double, Cappuccino Regular/Large
- Addons: Extra Shot ₹30, Oat Milk ₹40, Whipped Cream ₹20
- 7 ingredients: Coffee Beans (5000g), Milk (10000ml), Sugar (3000g), Tea Leaves (2000g), Samosa Dough (4000g), Potato (6000g), Bread (50pcs)
- Recipes linking items to ingredients (e.g., Cappuccino = 18g coffee + 150ml milk)
- 4 tables with QR tokens
- Sample orders in various statuses
- 3 sample customers with loyalty points

## Project Structure

```
tsos/
├── design-tokens.json
├── documentation.md
├── readme.md
├── app/
│   ├── frontend/          # React + Vite + Tailwind
│   │   ├── src/
│   │   │   ├── App.tsx    # Routes: / → /login, /dashboard → app
│   │   │   ├── index.css  # Tailwind @theme block
│   │   │   ├── lib/       # supabase.ts, store.ts, api.ts, socket.ts
│   │   │   ├── layouts/   # DashboardLayout.tsx
│   │   │   └── pages/     # 14 pages
│   │   └── vite.config.ts
│   ├── android-native/    # Kotlin + Compose
│   │   ├── build.bat      # Use this, not gradlew directly
│   │   └── app/src/main/java/com/tsos/app/
│   │       ├── data/      # api/, repository/
│   │       ├── di/        # Hilt modules
│   │       └── ui/        # 14 screen packages + theme/
│   ├── native-windows/    # WPF .NET 9
│   │   ├── App.xaml       # Design tokens as XAML resources
│   │   ├── Models/
│   │   ├── Services/
│   │   └── Views/         # 10 views
│   └── marketing/
│       ├── index.html
│       └── index2.html
```

## Deployment

- **Web frontend**: Vite build → `dist/` → Render/Vercel/Netlify static site
- **Supabase**: Create project, run schema migrations, set env vars, configure RLS, enable realtime on orders
- **Android**: `build.bat` in `app/android-native` (JAVA_HOME must point to JDK 24 at `C:\Program Files\Java\jdk-24`)
- **Windows**: `dotnet build` or Visual Studio
- **Backend URL**: All clients point to `https://{project-ref}.supabase.co`

## What This Project IS

- A real product for Indian cafes, not a demo
- Multi-platform: web, Android, Windows desktop
- Design-forward: warm, premium aesthetic, not generic Bootstrap
- Business-logic-heavy: fee engine, inventory deduction, loyalty, multi-tenant
- Real-time: KDS and order tracking depend on instant updates
- Self-contained: one codebase, all platforms, shared design tokens

## What This Project IS NOT

- Not a starter template
- Not a toy CRUD app
- Not platform-agnostic — it has opinions about Indian payment methods (UPI), Indian food items (Samosa, Vada Pav, Chai), Indian pricing (₹)
- Not designed for thousands of concurrent users — it's for individual cafe locations

## Reference Material

The repo at `D:\work\TSOS` contains the full reference implementation. Use it to understand:
- Exact database schema and seed data (`documentation.md`, `readme.md`)
- Exact API endpoints and their behavior (`app/backend/src/routes/`)
- Exact UI layout and components (`app/frontend/src/`)
- Exact Android screens and navigation (`app/android-native/app/src/main/java/com/tsos/app/`)
- Exact Windows views (`app/native-windows/Views/`)
- Exact design tokens and their implementation across platforms (`design-tokens.json`, `index.css`, `Theme.kt`, `App.xaml`)
- Exact marketing pages (`app/marketing/`)
