# TSOS — Project Manager Testing Guide

> Step-by-step, chart-wise checklist for verifying the entire product before launch.

---

## How to Use This Document

- Go section by section. Do not skip ahead.
- Mark each check: Pass / Fail / Pending / N/A
- Log failures in the Notes column with exact steps to reproduce.
- Sign off each section before moving to the next.

---

## 1. Authentication

### 1.1 Email Signup

| # | Test | Expected Result | Status | Notes |
|---|------|-----------------|--------|-------|
| 1.1.1 | Navigate to /signup | Signup form loads with email, password, name, business name fields | | |
| 1.1.2 | Submit with valid data | Account created, redirected to dashboard | | |
| 1.1.3 | Submit with existing email | Error: "Email already in use" | | |
| 1.1.4 | Submit with weak password | Error message shown | | |
| 1.1.5 | Submit with empty fields | Validation errors shown | | |

### 1.2 Email Login

| # | Test | Expected Result | Status | Notes |
|---|------|-----------------|--------|-------|
| 1.2.1 | Navigate to /login | Login form loads | | |
| 1.2.2 | Login with admin@tsos.dev / password123 | Redirected to dashboard | | |
| 1.2.3 | Login with wrong password | Error: "Invalid credentials" | | |
| 1.2.4 | Login with non-existent email | Error: "Invalid credentials" (not "user not found") | | |
| 1.2.5 | Refresh page while logged in | Session persists, no redirect to login | | |
| 1.2.6 | Clear localStorage | Redirected to login | | |

### 1.3 PIN Login

| # | Test | Expected Result | Status | Notes |
|---|------|-----------------|--------|-------|
| 1.3.1 | Enter PIN 1234 on PIN login screen | Logged in as admin | | |
| 1.3.2 | Enter wrong PIN | Error message | | |
| 1.3.3 | Enter non-numeric PIN | Validation error | | |

### 1.4 Role-Based Access

| # | Test | Expected Result | Status | Notes |
|---|------|-----------------|--------|-------|
| 1.4.1 | Login as owner | Full access to all features | | |
| 1.4.2 | Login as kitchen role | Can only see KDS, restricted from Settings/Reports | | |
| 1.4.3 | Kitchen user tries to access /settings URL directly | Redirected or shown "Access Denied" | | |

---

## 2. Dashboard (Overview)

| # | Test | Expected Result | Status | Notes |
|---|------|-----------------|--------|-------|
| 2.1 | Load dashboard | 4 KPI cards visible: Total Orders, Revenue, Pending Orders, Active Customers | | |
| 2.2 | Click "Today" | Data filters to today | | |
| 2.3 | Click "Week" | Data filters to this week | | |
| 2.4 | Click "Month" | Data filters to this month | | |
| 2.5 | Verify % change indicator | Shows change vs previous period | | |
| 2.6 | Recent orders feed | Shows latest orders with status badges | | |
| 2.7 | Empty state (no orders) | Shows zero values, no crashes | | |
| 2.8 | Dashboard loads with 0 orders | All cards show 0, no NaN or undefined | | |

---

## 3. Point of Sale (POS)

### 3.1 Menu Display

| # | Test | Expected Result | Status | Notes |
|---|------|-----------------|--------|-------|
| 3.1.1 | Open POS page | Menu items displayed in grid | | |
| 3.1.2 | Category filter tabs visible | All active categories shown | | |
| 3.1.3 | Click a category tab | Only items in that category shown | | |
| 3.1.4 | Click "All" tab | All items shown | | |
| 3.1.5 | Unavailable items | Greyed out or hidden, cannot be added to cart | | |
| 3.1.6 | Item shows price | Price displayed in INR format | | |
| 3.1.7 | Veg/Non-veg indicator | Green/red dot or icon visible | | |

### 3.2 Cart

| # | Test | Expected Result | Status | Notes |
|---|------|-----------------|--------|-------|
| 3.2.1 | Add item to cart | Item appears in cart with qty 1 | | |
| 3.2.2 | Add same item again | Qty increments to 2 | | |
| 3.2.3 | Increase qty via + button | Qty increases, subtotal updates | | |
| 3.2.4 | Decrease qty via - button | Qty decreases, subtotal updates | | |
| 3.2.5 | Remove item (qty 0) | Item removed from cart | | |
| 3.2.6 | Add item with variant | Variant name shown (e.g., "Large") | | |
| 3.2.7 | Add item with addon | Addon shown under item, price included | | |
| 3.2.8 | Cart subtotal calculation | Sum of (price x qty) for all items | | |
| 3.2.9 | Tax calculation | Tax applied per item's tax_rate_pct | | |
| 3.2.10 | Cart persists while switching categories | Items remain in cart | | |

### 3.3 Order Placement

| # | Test | Expected Result | Status | Notes |
|---|------|-----------------|--------|-------|
| 3.3.1 | Select order type: Dine-in | Order type set | | |
| 3.3.2 | Select order type: Takeaway | Order type set | | |
| 3.3.3 | Select order type: Delivery | Order type set | | |
| 3.3.4 | For Dine-in: select a table | Table assigned to order | | |
| 3.3.5 | Enter discount amount | Discount subtracted from subtotal | | |
| 3.3.6 | Verify platform fee | 1 INR fee added (or configurable amount) | | |
| 3.3.7 | Fee payer = customer | Fee added to grand total | | |
| 3.3.8 | Fee payer = cafe | Fee NOT added to grand total | | |
| 3.3.9 | Place order with Cash payment | Order created, status = "new", payment recorded | | |
| 3.3.10 | Place order with UPI payment | Order created, payment recorded | | |
| 3.3.11 | Place order with Card payment | Order created, payment recorded | | |
| 3.3.12 | Grand total = subtotal + tax - discount + platform_fee | Math is correct | | |
| 3.3.13 | Cart clears after order placed | Cart empty, ready for next order | | |
| 3.3.14 | Order appears on Orders page | New order visible in list | | |
| 3.3.15 | Order appears on KDS | New order shows in "NEW" column | | |
| 3.3.16 | For Dine-in: table status changes to "occupied" | Table marked occupied | | |

---

## 4. Orders Page

| # | Test | Expected Result | Status | Notes |
|---|------|-----------------|--------|-------|
| 4.1 | View orders list | All orders for current location shown | | |
| 4.2 | Filter: All | Shows all orders | | |
| 4.3 | Filter: New | Only "new" status orders | | |
| 4.4 | Filter: Preparing | Only "preparing" status orders | | |
| 4.5 | Filter: Ready | Only "ready" status orders | | |
| 4.6 | Filter: Served | Only "served" status orders | | |
| 4.7 | Status badge colors | New=blue, Preparing=amber, Ready=green, Served=green, Completed=gray | | |
| 4.8 | Click "Next" on new order | Status changes to "preparing" | | |
| 4.9 | Click "Next" on preparing order | Status changes to "ready" | | |
| 4.10 | Click "Next" on ready order | Status changes to "served" | | |
| 4.11 | Click "Next" on served order | Status changes to "completed" | | |
| 4.12 | Completed order: inventory deducted | Check ingredients stock_qty reduced | | |
| 4.13 | Completed order: table freed | Table status returns to "free" | | |
| 4.14 | Completed order: loyalty points added | Customer's loyalty_points increased | | |
| 4.15 | Order with items + addons | All items and addons shown in order detail | | |

---

## 5. Kitchen Display System (KDS)

| # | Test | Expected Result | Status | Notes |
|---|------|-----------------|--------|-------|
| 5.1 | Open KDS | 3-column layout: NEW, PREPARING, READY | | |
| 5.2 | New order placed at POS | Appears instantly in NEW column | | |
| 5.3 | Tap order in NEW column | Moves to PREPARING column | | |
| 5.4 | Tap order in PREPARING column | Moves to READY column | | |
| 5.5 | Tap order in READY column | Marked as served, removed from board | | |
| 5.6 | Elapsed time shown | Time since order placed displayed | | |
| 5.7 | Order > 10 minutes old | Red highlight or warning indicator | | |
| 5.8 | Multiple orders | Each order displayed as separate card | | |
| 5.9 | Real-time sync (2 devices) | Order placed on one device appears on KDS instantly | | |
| 5.10 | Order notes visible | Kitchen notes shown on order card | | |

---

## 6. Menu Management

| # | Test | Expected Result | Status | Notes |
|---|------|-----------------|--------|-------|
| 6.1 | View categories list | All categories shown with sort order | | |
| 6.2 | Create new category | Category appears in list | | |
| 6.3 | Edit category name | Name updated | | |
| 6.4 | Delete category | Category removed (only if no items linked) | | |
| 6.5 | View menu items | All items shown with price, category, veg status | | |
| 6.6 | Create new item | Item appears in list | | |
| 6.7 | Edit item (name, price, description) | Changes saved | | |
| 6.8 | Toggle item availability | Item shows as unavailable in POS | | |
| 6.9 | Delete item | Item removed | | |
| 6.10 | Add variant to item | Variant shown (e.g., "Large +40") | | |
| 6.11 | Add addon to item | Addon linked and shown in POS | | |
| 6.12 | Set veg/non-veg | Correct indicator shown | | |
| 6.13 | Set tax rate | Tax applied correctly in POS | | |

---

## 7. Inventory

### 7.1 Ingredients

| # | Test | Expected Result | Status | Notes |
|---|------|-----------------|--------|-------|
| 7.1.1 | View ingredients list | All ingredients with stock qty and unit | | |
| 7.1.2 | Create new ingredient | Appears in list | | |
| 7.1.3 | Edit ingredient (name, threshold) | Changes saved | | |
| 7.1.4 | Delete ingredient | Removed from list | | |

### 7.2 Recipes

| # | Test | Expected Result | Status | Notes |
|---|------|-----------------|--------|-------|
| 7.2.1 | Link menu item to ingredient | Recipe created | | |
| 7.2.2 | Set qty_consumed | Correct quantity shown | | |
| 7.2.3 | One item links to multiple ingredients | All linked | | |
| 7.2.4 | Delete recipe | Link removed | | |

### 7.3 Stock Deduction

| # | Test | Expected Result | Status | Notes |
|---|------|-----------------|--------|-------|
| 7.3.1 | Complete an order | Ingredient stock reduced by qty_consumed x order_qty | | |
| 7.3.2 | Check inventory_logs | Log entry with reason="sale" created | | |
| 7.3.3 | Stock drops below threshold | Low stock alert triggered | | |
| 7.3.4 | Restock ingredient | Stock increases, log entry with reason="restock" | | |
| 7.3.5 | Restock via API | POST /api/inventory/restock with ingredientId and qty | | |

---

## 8. Tables

| # | Test | Expected Result | Status | Notes |
|---|------|-----------------|--------|-------|
| 8.1 | View tables list | All tables with status (free/occupied/reserved) | | |
| 8.2 | Create new table | Table appears in list | | |
| 8.3 | Edit table (label, seats) | Changes saved | | |
| 8.4 | Delete table | Removed from list | | |
| 8.5 | Table QR code | QR generated, links to storefront | | |
| 8.6 | Table auto-occupied on order | Status changes when order placed | | |
| 8.7 | Table auto-freed on completion | Status returns to "free" when order completed | | |

---

## 9. Customers and Loyalty

| # | Test | Expected Result | Status | Notes |
|---|------|-----------------|--------|-------|
| 9.1 | View customer list | All customers with points, orders, spent | | |
| 9.2 | Customer detail view | Order history shown | | |
| 9.3 | Loyalty points earned | 1 point per 10 INR spent (or configured rate) | | |
| 9.4 | Loyalty points redeemed | Points deducted, discount applied | | |
| 9.5 | Loyalty ledger | All earn/redeem transactions logged | | |

---

## 10. Offers / Promotions

| # | Test | Expected Result | Status | Notes |
|---|------|-----------------|--------|-------|
| 10.1 | View offers list | All offers shown | | |
| 10.2 | Create percent offer (10% off 300+) | Offer created | | |
| 10.3 | Create flat offer (50 off 500+) | Offer created | | |
| 10.4 | Create BOGO offer | Offer created | | |
| 10.5 | Toggle offer active/inactive | Inactive offers not shown in storefront | | |
| 10.6 | Offer validity dates | Expired offers not applied | | |
| 10.7 | Min order value | Offer not applied if order below threshold | | |

---

## 11. Reports

| # | Test | Expected Result | Status | Notes |
|---|------|-----------------|--------|-------|
| 11.1 | Summary KPIs | Total orders, revenue, pending, customers | | |
| 11.2 | Sales overview chart | Daily sales data displayed | | |
| 11.3 | Top items | Best-selling items listed by quantity | | |
| 11.4 | Period filter (Today/Week/Month) | Data updates correctly | | |
| 11.5 | Empty state | Shows zeros, no crashes | | |

---

## 12. Settings

| # | Test | Expected Result | Status | Notes |
|---|------|-----------------|--------|-------|
| 12.1 | View fee config | Monthly fee, per-order fee, fee payer shown | | |
| 12.2 | Update per-order fee | Fee changed, reflected in next order | | |
| 12.3 | Change fee payer | Next order respects new payer setting | | |
| 12.4 | Update auto-flip threshold | Threshold saved | | |
| 12.5 | Reset period counter | period_order_count resets to 0 | | |

---

## 13. Public Storefront (QR Ordering)

| # | Test | Expected Result | Status | Notes |
|---|------|-----------------|--------|-------|
| 13.1 | Open storefront URL | Menu displayed, no login required | | |
| 13.2 | Browse categories | Category filter works | | |
| 13.3 | Add items to cart | Cart updates | | |
| 13.4 | Select table (from QR) | Table auto-assigned | | |
| 13.5 | Place order | Order created with status "new", placed_by = "customer_qr" | | |
| 13.6 | Order tracking page | Customer sees order status in real time | | |
| 13.7 | Unavailable items hidden | Only available items shown | | |

---

## 14. Cross-Platform Parity

Test each feature on ALL three platforms: Web, Android, Windows.

### 14.1 Design Consistency

| # | Test | Web | Android | Windows | Notes |
|---|------|-----|---------|---------|-------|
| 14.1.1 | Background color #FFF9F2 | | | | |
| 14.1.2 | Action color #F97316 (orange) | | | | |
| 14.1.3 | Card/surface color #FFFFFF | | | | |
| 14.1.4 | Divider color #E9E0D6 | | | | |
| 14.1.5 | Text primary #1C1917 | | | | |
| 14.1.6 | Completed green #17803D | | | | |
| 14.1.7 | Attention amber #B45309 | | | | |
| 14.1.8 | Destructive red #B42318 | | | | |
| 14.1.9 | Font: Inter | | | | |
| 14.1.10 | Border radius 8/12/16pt | | | | |

### 14.2 Feature Parity

| # | Feature | Web | Android | Windows | Notes |
|---|---------|-----|---------|---------|-------|
| 14.2.1 | Dashboard with KPIs | | | | |
| 14.2.2 | POS with cart | | | | |
| 14.2.3 | Orders list with status flow | | | | |
| 14.2.4 | KDS with 3 columns | | | | |
| 14.2.5 | Menu CRUD | | | | |
| 14.2.6 | Inventory + recipes | | | | |
| 14.2.7 | Tables + QR | | | | |
| 14.2.8 | Customers + loyalty | | | | |
| 14.2.9 | Offers | | | | |
| 14.2.10 | Reports | | | | |
| 14.2.11 | Settings | | | | |

---

## 15. API Endpoint Verification

Verify every endpoint responds correctly.

### Auth

| # | Method | Endpoint | Auth | Expected | Status |
|---|--------|----------|------|----------|--------|
| 15.1 | POST | /api/auth/signup | No | 201 + user + token | |
| 15.2 | POST | /api/auth/login | No | 200 + user + token | |
| 15.3 | POST | /api/auth/pin-login | No | 200 + user + token | |
| 15.4 | GET | /api/auth/me | Yes | 200 + profile | |

### Menu

| # | Method | Endpoint | Auth | Expected | Status |
|---|--------|----------|------|----------|--------|
| 15.5 | GET | /api/menu/categories | Yes | 200 + array | |
| 15.6 | POST | /api/menu/categories | Yes | 201 | |
| 15.7 | PUT | /api/menu/categories/:id | Yes | 200 | |
| 15.8 | DELETE | /api/menu/categories/:id | Yes | 200 | |
| 15.9 | GET | /api/menu/items | Yes | 200 + array with variants/addons | |
| 15.10 | POST | /api/menu/items | Yes | 201 | |
| 15.11 | PUT | /api/menu/items/:id | Yes | 200 | |
| 15.12 | DELETE | /api/menu/items/:id | Yes | 200 | |

### Orders

| # | Method | Endpoint | Auth | Expected | Status |
|---|--------|----------|------|----------|--------|
| 15.13 | GET | /api/orders | Yes | 200 + array | |
| 15.14 | POST | /api/orders | Yes | 201 | |
| 15.15 | PUT | /api/orders/:id/status | Yes | 200 | |
| 15.16 | POST | /api/orders/:id/payment | Yes | 200 | |

### Tables

| # | Method | Endpoint | Auth | Expected | Status |
|---|--------|----------|------|----------|--------|
| 15.17 | GET | /api/tables | Yes | 200 + array | |
| 15.18 | POST | /api/tables | Yes | 201 | |
| 15.19 | DELETE | /api/tables/:id | Yes | 200 | |

### Inventory

| # | Method | Endpoint | Auth | Expected | Status |
|---|--------|----------|------|----------|--------|
| 15.20 | GET | /api/inventory/ingredients | Yes | 200 + array | |
| 15.21 | POST | /api/inventory/ingredients | Yes | 201 | |
| 15.22 | PUT | /api/inventory/ingredients/:id | Yes | 200 | |
| 15.23 | DELETE | /api/inventory/ingredients/:id | Yes | 200 | |
| 15.24 | POST | /api/inventory/restock | Yes | 200 | |
| 15.25 | GET | /api/inventory/low-stock | Yes | 200 + array | |

### Customers

| # | Method | Endpoint | Auth | Expected | Status |
|---|--------|----------|------|----------|--------|
| 15.26 | GET | /api/customers | Yes | 200 + array | |
| 15.27 | GET | /api/customers/:id | Yes | 200 + detail | |

### Reports

| # | Method | Endpoint | Auth | Expected | Status |
|---|--------|----------|------|----------|--------|
| 15.28 | GET | /api/reports/summary | Yes | 200 + KPIs | |
| 15.29 | GET | /api/reports/sales-overview | Yes | 200 + chart data | |
| 15.30 | GET | /api/reports/top-items | Yes | 200 + array | |

### Settings

| # | Method | Endpoint | Auth | Expected | Status |
|---|--------|----------|------|----------|--------|
| 15.31 | GET | /api/settings | Yes | 200 + fee config | |
| 15.32 | PUT | /api/settings | Yes | 200 | |

### Public

| # | Method | Endpoint | Auth | Expected | Status |
|---|--------|----------|------|----------|--------|
| 15.33 | GET | /api/public/storefront/:slug | No | 200 + menu | |
| 15.34 | POST | /api/public/order | No | 201 | |
| 15.35 | GET | /api/public/order/:id | No | 200 + status | |

### System

| # | Method | Endpoint | Auth | Expected | Status |
|---|--------|----------|------|----------|--------|
| 15.36 | GET | /api/health | No | 200 + db status | |

---

## 16. Business Logic Verification

These are critical correctness checks.

| # | Scenario | Steps | Expected | Status | Notes |
|---|----------|-------|----------|--------|-------|
| 16.1 | Fee engine: customer pays | Create order when fee_payer = customer | platform_fee added to grand_total | | |
| 16.2 | Fee engine: cafe pays | Create order when fee_payer = cafe | platform_fee NOT added to grand_total | | |
| 16.3 | Fee auto-flip | Set threshold=2, create 3rd order | Fee payer switches after threshold | | |
| 16.4 | Inventory deduction | Complete order with recipe-linked items | stock_qty reduced correctly | | |
| 16.5 | Multi-ingredient deduction | Order has item with 2 ingredients | Both ingredients reduced | | |
| 16.6 | Low stock alert | Reduce stock below threshold | Alert generated | | |
| 16.7 | Table auto-free | Complete dine-in order | Table status = "free" | | |
| 16.8 | Loyalty earn | Complete order for customer | Points added = grand_total / 10 | | |
| 16.9 | Loyalty redeem | Apply loyalty points at checkout | Discount applied, points deducted | | |
| 16.10 | Tax calculation | Item priced 100 with 5% tax | tax = 5.00 | | |
| 16.11 | Variant pricing | Item base 100, variant delta +40 | Price = 140 | | |
| 16.12 | Addon pricing | Item 100, addon 30 | Total includes addon price | | |
| 16.13 | Discount application | Subtotal 200, discount 50 | Grand total reduced by 50 | | |
| 16.14 | Multi-location isolation | User with location A cannot query location B data | Data properly scoped | | |

---

## 17. Error Handling and Edge Cases

| # | Test | Expected Result | Status | Notes |
|---|------|-----------------|--------|-------|
| 17.1 | Network disconnection | Graceful error message, no crash | | |
| 17.2 | Submit order with empty cart | Cannot submit, error shown | | |
| 17.3 | Submit order with 0 amount | Cannot submit | | |
| 17.4 | Concurrent orders (2 users same item) | Both succeed, stock deducted for both | | |
| 17.5 | Delete category with items | Prevented or items unlinked first | | |
| 17.6 | Delete ingredient used in recipe | Prevented or recipe deleted first | | |
| 17.7 | Very long menu item name | Truncated or wrapped, no layout break | | |
| 17.8 | Very large discount | Cannot exceed subtotal | | |
| 17.9 | Negative stock after deduction | Stock floors at 0 or shows warning | | |
| 17.10 | Duplicate signup | Handled gracefully, not a 500 error | | |

---

## 18. Performance

| # | Test | Expected Result | Status | Notes |
|---|------|-----------------|--------|-------|
| 18.1 | Dashboard load time | < 3 seconds on 3G | | |
| 18.2 | POS menu load | < 2 seconds | | |
| 18.3 | Order creation | < 2 seconds | | |
| 18.4 | KDS real-time update | < 1 second latency | | |
| 18.5 | Android cold start | < 5 seconds to interactive | | |
| 18.6 | Windows cold start | < 3 seconds | | |
| 18.7 | Frontend bundle size | < 500KB gzipped | | |
| 18.8 | API response time (p95) | < 500ms | | |

---

## 19. Security

| # | Test | Expected Result | Status | Notes |
|---|------|-----------------|--------|-------|
| 19.1 | Access protected route without token | 401 Unauthorized | | |
| 19.2 | Access with expired token | 401, redirected to login | | |
| 19.3 | User A cannot see User B's location data | RLS blocks cross-location access | | |
| 19.4 | SQL injection in search fields | Input sanitized, no injection | | |
| 19.5 | Password stored as hash | Cannot retrieve plaintext password | | |
| 19.6 | PIN not exposed in API responses | PIN not in /me response | | |
| 19.7 | Public storefront cannot access admin endpoints | 403 or 401 | | |

---

## 20. Deployment Verification

| # | Test | Expected Result | Status | Notes |
|---|------|-----------------|--------|-------|
| 20.1 | Frontend deployed and accessible | URL loads without error | | |
| 20.2 | Backend/Supabase reachable | /api/health returns 200 | | |
| 20.3 | Login works in production | Can log in with demo credentials | | |
| 20.4 | Orders flow end-to-end in production | Create order -> KDS -> Complete | | |
| 20.5 | Android APK installs and runs | No crash on launch | | |
| 20.6 | Android connects to production backend | API calls succeed | | |
| 20.7 | Windows app builds and runs | No crash on launch | | |
| 20.8 | Marketing page loads | Both versions render correctly | | |
| 20.9 | SSL certificate valid | HTTPS, no browser warnings | | |
| 20.10 | CORS configured correctly | Frontend domain allowed | | |

---

## 21. Marketing Pages

### Version 1 (Original)

| # | Test | Expected Result | Status | Notes |
|---|------|-----------------|--------|-------|
| 21.1 | Hero section loads | Animated gradient, headline visible | | |
| 21.2 | Feature bento grid | All 6 features displayed | | |
| 21.3 | Pricing section | Starter and Growth tiers shown | | |
| 21.4 | FAQ accordion | Opens/closes correctly | | |
| 21.5 | Footer | Links and branding visible | | |
| 21.6 | Mobile responsive | Layout adapts to small screen | | |

### Version 2 (Redesign)

| # | Test | Expected Result | Status | Notes |
|---|------|-----------------|--------|-------|
| 21.7 | Hero with tablet mockup | Mockup visible, headline "Good food deserves better tools" | | |
| 21.8 | Stats bar | 500+ cafes, 2M+ orders, 99.9% uptime, 4.8/5 rating | | |
| 21.9 | Logo strip | Brand logos visible | | |
| 21.10 | 6-card features grid | All cards render | | |
| 21.11 | Pricing with toggle | Monthly/Yearly toggle switches prices | | |
| 21.12 | Footer columns | All sections visible | | |
| 21.13 | Mobile responsive | Layout adapts | | |

---

## Sign-Off

| Section | Tester | Date | Status |
|---------|--------|------|--------|
| 1. Authentication | | | |
| 2. Dashboard | | | |
| 3. POS | | | |
| 4. Orders | | | |
| 5. KDS | | | |
| 6. Menu Management | | | |
| 7. Inventory | | | |
| 8. Tables | | | |
| 9. Customers | | | |
| 10. Offers | | | |
| 11. Reports | | | |
| 12. Settings | | | |
| 13. Storefront | | | |
| 14. Cross-Platform | | | |
| 15. API Endpoints | | | |
| 16. Business Logic | | | |
| 17. Error Handling | | | |
| 18. Performance | | | |
| 19. Security | | | |
| 20. Deployment | | | |
| 21. Marketing Pages | | | |

**Total Checks: 250+**

**Pass Rate Target: 100% for sections 1-16, 95%+ for sections 17-21**
