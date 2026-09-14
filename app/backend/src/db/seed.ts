import bcrypt from 'bcryptjs';
import { query, pool } from './pool.js';

export async function seed() {
  console.log('Seeding database...');

  const passwordHash = await bcrypt.hash('password123', 10);

  // Create owner user
  const userResult = await query(
    `INSERT INTO users (email, password_hash, name, role, pin_code)
     VALUES ('admin@tsos.dev', $1, 'Admin', 'owner', '1234')
     RETURNING id`,
    [passwordHash]
  );
  const userId = userResult.rows[0].id;

  // Create business
  const bizResult = await query(
    `INSERT INTO businesses (owner_user_id, name)
     VALUES ($1, 'Demo Cafe')
     RETURNING id`,
    [userId]
  );
  const bizId = bizResult.rows[0].id;

  await query(`UPDATE users SET business_id = $1 WHERE id = $2`, [bizId, userId]);

  // Create location
  const locResult = await query(
    `INSERT INTO locations (business_id, name, slug, address, phone)
     VALUES ($1, 'Main Branch', 'main-branch', '123 MG Road, Bangalore', '+919876543210')
     RETURNING id`,
    [bizId]
  );
  const locId = locResult.rows[0].id;

  await query(`INSERT INTO user_locations (user_id, location_id) VALUES ($1, $2)`, [userId, locId]);
  await query(`INSERT INTO location_fee_config (location_id) VALUES ($1)`, [locId]);

  // Create menu categories
  const cats = await query(
    `INSERT INTO menu_categories (location_id, name, sort_order)
     VALUES
       ($1, 'Coffee', 1),
       ($1, 'Tea', 2),
       ($1, 'Snacks', 3),
       ($1, 'Pastries', 4)
     RETURNING id, name`,
    [locId]
  );

  const coffeeCat = cats.rows[0].id;
  const teaCat = cats.rows[1].id;
  const snacksCat = cats.rows[2].id;

  // Create menu items
  const items = await query(
    `INSERT INTO menu_items (location_id, category_id, name, description, price, is_veg, tax_rate_pct)
     VALUES
       ($1, $2, 'Espresso', 'Strong single shot', 120.00, true, 5),
       ($1, $2, 'Cappuccino', 'Espresso with steamed milk', 150.00, true, 5),
       ($1, $2, 'Latte', 'Smooth espresso with milk', 160.00, true, 5),
       ($1, $3, 'Masala Chai', 'Traditional spiced tea', 60.00, true, 5),
       ($1, $3, 'Green Tea', 'Light and refreshing', 50.00, true, 5),
       ($1, $4, 'Samosa', 'Crispy pastry with potato filling', 40.00, true, 5),
       ($1, $4, 'Vada Pav', 'Mumbai street food classic', 50.00, true, 5),
       ($1, $4, 'Sandwich', 'Grilled veg sandwich', 80.00, true, 5)
     RETURNING id, name, price`,
    [locId, coffeeCat, teaCat, snacksCat]
  );

  // Create ingredients
  const ingredients = await query(
    `INSERT INTO ingredients (location_id, name, unit, stock_qty, low_stock_threshold)
     VALUES
       ($1, 'Coffee Beans', 'g', 5000, 500),
       ($1, 'Milk', 'ml', 10000, 1000),
       ($1, 'Sugar', 'g', 3000, 300),
       ($1, 'Tea Leaves', 'g', 2000, 200),
       ($1, 'Samosa Dough', 'g', 4000, 500),
       ($1, 'Potato', 'g', 6000, 1000),
       ($1, 'Bread', 'pcs', 50, 10)
     RETURNING id, name`,
    [locId]
  );

  // Create recipes (map items to ingredients)
  const ingMap = new Map(ingredients.rows.map((r: any) => [r.name, r.id]));
  const itemMap = new Map(items.rows.map((r: any) => [r.name, r.id]));

  const recipeData = [
    [itemMap.get('Espresso'), ingMap.get('Coffee Beans'), 18],
    [itemMap.get('Cappuccino'), ingMap.get('Coffee Beans'), 18],
    [itemMap.get('Cappuccino'), ingMap.get('Milk'), 150],
    [itemMap.get('Latte'), ingMap.get('Coffee Beans'), 18],
    [itemMap.get('Latte'), ingMap.get('Milk'), 200],
    [itemMap.get('Masala Chai'), ingMap.get('Tea Leaves'), 5],
    [itemMap.get('Masala Chai'), ingMap.get('Milk'), 200],
    [itemMap.get('Green Tea'), ingMap.get('Tea Leaves'), 3],
    [itemMap.get('Samosa'), ingMap.get('Samosa Dough'), 100],
    [itemMap.get('Samosa'), ingMap.get('Potato'), 50],
    [itemMap.get('Vada Pav'), ingMap.get('Bread'), 2],
    [itemMap.get('Sandwich'), ingMap.get('Bread'), 2],
  ];

  for (const [itemId, ingredientId, qty] of recipeData) {
    await query(
      `INSERT INTO recipes (menu_item_id, ingredient_id, qty_consumed) VALUES ($1, $2, $3)`,
      [itemId, ingredientId, qty]
    );
  }

  // Create tables
  await query(
    `INSERT INTO dine_tables (location_id, label, qr_token, seats)
     VALUES
       ($1, 'Table 1', 'tbl-001', 4),
       ($1, 'Table 2', 'tbl-002', 4),
       ($1, 'Table 3', 'tbl-003', 2),
       ($1, 'Table 4', 'tbl-004', 6),
       ($1, 'Counter', 'tbl-ctr', 2)
     RETURNING id, label`,
    [locId]
  );

  // Create add-ons
  await query(
    `INSERT INTO addons (location_id, name, price)
     VALUES
       ($1, 'Extra Shot', 30.00),
       ($1, 'Oat Milk', 40.00),
       ($1, 'Whipped Cream', 20.00)
     RETURNING id, name`,
    [locId]
  );

  console.log('Seed complete.');
  console.log('Login: admin@tsos.dev / password123');
  console.log('PIN: 1234');
}

seed()
  .catch(console.error)
  .finally(() => pool.end());
