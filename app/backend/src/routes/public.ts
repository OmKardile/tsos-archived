import { Router, Response, Request } from 'express';
import { z } from 'zod';
import { query, pool } from '../db/pool.js';

const router = Router();

// Get menu for a location (public, no auth)
router.get('/:locationSlug/menu', async (req: Request, res: Response) => {
  const { locationSlug } = req.params;

  const locResult = await query(
    `SELECT id, name, slug FROM locations WHERE slug = $1 AND is_active = true`,
    [locationSlug]
  );

  if (locResult.rows.length === 0) {
    return res.status(404).json({ error: 'Location not found' });
  }

  const location = locResult.rows[0];

  const categories = await query(
    `SELECT id, name FROM menu_categories
     WHERE location_id = $1 AND is_active = true
     ORDER BY sort_order, name`,
    [location.id]
  );

  const items = await query(
    `SELECT mi.id, mi.name, mi.description, mi.price, mi.is_veg, mi.tax_rate_pct, mi.image_url,
            mc.name as category_name,
            COALESCE(
              json_agg(DISTINCT jsonb_build_object('id', mv.id, 'name', mv.name, 'priceDelta', mv.price_delta))
              FILTER (WHERE mv.id IS NOT NULL), '[]'
            ) as variants,
            COALESCE(
              json_agg(DISTINCT jsonb_build_object('id', a.id, 'name', a.name, 'price', a.price))
              FILTER (WHERE a.id IS NOT NULL), '[]'
            ) as addons
     FROM menu_items mi
     LEFT JOIN menu_categories mc ON mc.id = mi.category_id
     LEFT JOIN menu_item_variants mv ON mv.menu_item_id = mi.id
     LEFT JOIN menu_item_addons mia ON mia.menu_item_id = mi.id
     LEFT JOIN addons a ON a.id = mia.addon_id
     WHERE mi.location_id = $1 AND mi.is_available = true
     GROUP BY mi.id, mc.name
     ORDER BY mi.sort_order, mi.name`,
    [location.id]
  );

  res.json({
    location: { id: location.id, name: location.name, slug: location.slug },
    categories: categories.rows,
    items: items.rows,
  });
});

// Place order from public storefront (QR or online)
const placeOrderSchema = z.object({
  tableId: z.string().uuid().nullable().optional(),
  orderType: z.enum(['dine_in', 'takeaway', 'delivery']),
  customerPhone: z.string().min(10),
  customerName: z.string().optional(),
  items: z.array(z.object({
    menuItemId: z.string().uuid(),
    variantId: z.string().uuid().nullable().optional(),
    qty: z.number().int().positive(),
    notes: z.string().optional(),
    addonIds: z.array(z.string().uuid()).optional(),
  })).min(1),
});

router.post('/:locationSlug/orders', async (req: Request, res: Response) => {
  const { locationSlug } = req.params;

  const locResult = await query(
    `SELECT id FROM locations WHERE slug = $1 AND is_active = true`,
    [locationSlug]
  );

  if (locResult.rows.length === 0) {
    return res.status(404).json({ error: 'Location not found' });
  }

  const locationId = locResult.rows[0].id;

  try {
    const body = placeOrderSchema.parse(req.body);

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Find or create customer
      let customerResult = await client.query(
        `SELECT id FROM customers WHERE phone = $1 AND business_id = (
          SELECT business_id FROM locations WHERE id = $2
        )`,
        [body.customerPhone, locationId]
      );

      let customerId: string;
      if (customerResult.rows.length === 0) {
        const newCustomer = await client.query(
          `INSERT INTO customers (business_id, phone, name)
           VALUES ((SELECT business_id FROM locations WHERE id = $1), $2, $3)
           RETURNING id`,
          [locationId, body.customerPhone, body.customerName || null]
        );
        customerId = newCustomer.rows[0].id;
      } else {
        customerId = customerResult.rows[0].id;
      }

      // Fetch menu items to compute prices server-side
      const itemIds = body.items.map(i => i.menuItemId);
      const menuResult = await client.query(
        `SELECT id, price, tax_rate_pct, name FROM menu_items WHERE id = ANY($1::uuid[])`,
        [itemIds]
      );
      const menuMap = new Map(menuResult.rows.map(r => [r.id, r]));

      let subtotal = 0;
      let taxTotal = 0;
      const orderItems: any[] = [];

      for (const item of body.items) {
        const menuItem = menuMap.get(item.menuItemId);
        if (!menuItem) {
          throw new Error(`Menu item ${item.menuItemId} not found`);
        }

        let unitPrice = Number(menuItem.price);

        if (item.variantId) {
          const varResult = await client.query(
            `SELECT price_delta FROM menu_item_variants WHERE id = $1`,
            [item.variantId]
          );
          if (varResult.rows.length > 0) {
            unitPrice += Number(varResult.rows[0].price_delta);
          }
        }

        const itemTotal = unitPrice * item.qty;
        const itemTax = itemTotal * (Number(menuItem.tax_rate_pct) / 100);
        subtotal += itemTotal;
        taxTotal += itemTax;

        orderItems.push({
          menuItemId: item.menuItemId,
          variantId: item.variantId || null,
          qty: item.qty,
          unitPrice,
          notes: item.notes || null,
          addonIds: item.addonIds || [],
        });
      }

      // Get fee config
      const feeResult = await client.query(
        `SELECT * FROM location_fee_config WHERE location_id = $1`,
        [locationId]
      );
      const feeConfig = feeResult.rows[0];
      let platformFee = 0;
      let feePayer = 'customer';

      if (feeConfig) {
        const shouldChargeFee = feeConfig.customer_paid_order_limit === null ||
          feeConfig.period_order_count < feeConfig.customer_paid_order_limit;

        if (shouldChargeFee) {
          platformFee = Number(feeConfig.per_order_fee);
          feePayer = feeConfig.default_fee_payer;
        }
      }

      const grandTotal = subtotal + taxTotal +
        (feePayer === 'customer' ? platformFee : 0);

      const placedBy = body.tableId ? 'customer_qr' : 'customer_online';

      const orderResult = await client.query(
        `INSERT INTO orders (location_id, table_id, customer_id, order_type, status, placed_by,
          subtotal, tax_total, platform_fee, fee_payer, grand_total, payment_status)
         VALUES ($1, $2, $3, $4, 'new', $5, $6, $7, $8, $9, $10, 'unpaid')
         RETURNING *`,
        [
          locationId, body.tableId || null, customerId, body.orderType, placedBy,
          subtotal, taxTotal, platformFee, feePayer, grandTotal,
        ]
      );
      const order = orderResult.rows[0];

      // Insert order items
      for (const item of orderItems) {
        const oiResult = await client.query(
          `INSERT INTO order_items (order_id, menu_item_id, variant_id, qty, unit_price, notes)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING id`,
          [order.id, item.menuItemId, item.variantId, item.qty, item.unitPrice, item.notes]
        );
        const oiId = oiResult.rows[0].id;

        for (const addonId of item.addonIds) {
          await client.query(
            `INSERT INTO order_item_addons (order_item_id, addon_id) VALUES ($1, $2)`,
            [oiId, addonId]
          );
        }
      }

      // Update fee config counter
      if (feeConfig && feePayer === 'customer') {
        await client.query(
          `UPDATE location_fee_config SET period_order_count = period_order_count + 1 WHERE location_id = $1`,
          [locationId]
        );
      }

      // Update table status
      if (body.tableId) {
        await client.query(
          `UPDATE dine_tables SET status = 'occupied' WHERE id = $1`,
          [body.tableId]
        );
      }

      await client.query('COMMIT');

      // Emit real-time event
      const io = req.app.get('io');
      if (io) {
        io.to(`location:${locationId}`).emit('order:created', { order });
      }

      res.status(201).json({
        orderId: order.id,
        grandTotal: order.grand_total,
        status: order.status,
      });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: err.errors });
    }
    console.error('Public order error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Track order status (public)
router.get('/:locationSlug/orders/:orderId/status', async (req: Request, res: Response) => {
  const { orderId } = req.params;

  const result = await query(
    `SELECT id, status, order_type, grand_total, payment_status, created_at, updated_at
     FROM orders WHERE id = $1`,
    [orderId]
  );

  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'Order not found' });
  }

  const order = result.rows[0];
  const items = await query(
    `SELECT oi.qty, mi.name, oi.unit_price
     FROM order_items oi
     JOIN menu_items mi ON mi.id = oi.menu_item_id
     WHERE oi.order_id = $1`,
    [orderId]
  );

  res.json({
    ...order,
    items: items.rows,
  });
});

export default router;
