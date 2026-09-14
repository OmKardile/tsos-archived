import { Router, Response } from 'express';
import { z } from 'zod';
import { query, pool } from '../db/pool.js';
import { AuthRequest, authMiddleware, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);

const createOrderSchema = z.object({
  locationId: z.string().uuid(),
  tableId: z.string().uuid().nullable().optional(),
  orderType: z.enum(['dine_in', 'takeaway', 'delivery']),
  placedBy: z.enum(['staff', 'customer_qr', 'customer_online']),
  items: z.array(z.object({
    menuItemId: z.string().uuid(),
    variantId: z.string().uuid().nullable().optional(),
    qty: z.number().int().positive(),
    notes: z.string().optional(),
    addonIds: z.array(z.string().uuid()).optional(),
  })).min(1),
  discountTotal: z.number().min(0).optional(),
  paymentMethod: z.enum(['cash', 'upi', 'card', 'razorpay']).optional(),
});

router.get('/', async (req: AuthRequest, res: Response) => {
  const locationId = req.query.locationId as string;
  const status = req.query.status as string;
  const type = req.query.type as string;

  if (!locationId || !req.user!.location_ids.includes(locationId)) {
    return res.status(400).json({ error: 'Valid locationId required' });
  }

  let where = 'o.location_id = $1';
  const params: unknown[] = [locationId];
  let i = 2;

  if (status) {
    where += ` AND o.status = $${i++}`;
    params.push(status);
  }
  if (type) {
    where += ` AND o.order_type = $${i++}`;
    params.push(type);
  }

  const result = await query(
    `SELECT o.*,
            json_agg(json_build_object(
              'id', oi.id,
              'name', mi.name,
              'qty', oi.qty,
              'unitPrice', oi.unit_price,
              'notes', oi.notes
            )) as items,
            dt.label as table_label
     FROM orders o
     LEFT JOIN order_items oi ON oi.order_id = o.id
     LEFT JOIN menu_items mi ON mi.id = oi.menu_item_id
     LEFT JOIN dine_tables dt ON dt.id = o.table_id
     WHERE ${where}
     GROUP BY o.id, dt.label
     ORDER BY o.created_at DESC
     LIMIT 100`,
    params
  );

  res.json(result.rows);
});

router.get('/:id', async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  const result = await query(
    `SELECT o.*,
            json_agg(json_build_object(
              'id', oi.id,
              'name', mi.name,
              'qty', oi.qty,
              'unitPrice', oi.unit_price,
              'notes', oi.notes,
              'addons', (
                SELECT json_agg(json_build_object('id', a.id, 'name', a.name, 'price', a.price))
                FROM order_item_addons oia
                JOIN addons a ON a.id = oia.addon_id
                WHERE oia.order_item_id = oi.id
              )
            )) as items,
            dt.label as table_label,
            p.method as payment_method,
            p.status as payment_status
     FROM orders o
     LEFT JOIN order_items oi ON oi.order_id = o.id
     LEFT JOIN menu_items mi ON mi.id = oi.menu_item_id
     LEFT JOIN dine_tables dt ON dt.id = o.table_id
     LEFT JOIN payments p ON p.order_id = o.id
     WHERE o.id = $1
     GROUP BY o.id, dt.label, p.method, p.status`,
    [id]
  );

  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'Order not found' });
  }

  res.json(result.rows[0]);
});

router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const body = createOrderSchema.parse(req.body);

    if (!req.user!.location_ids.includes(body.locationId)) {
      return res.status(403).json({ error: 'No access to this location' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

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

        // Apply variant price delta
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

      const discountTotal = body.discountTotal || 0;

      // Get fee config
      const feeResult = await client.query(
        `SELECT * FROM location_fee_config WHERE location_id = $1`,
        [body.locationId]
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

      const grandTotal = subtotal + taxTotal - discountTotal +
        (feePayer === 'customer' ? platformFee : 0);

      // Create order
      const orderResult = await client.query(
        `INSERT INTO orders (location_id, table_id, order_type, status, placed_by,
          subtotal, tax_total, discount_total, platform_fee, fee_payer, grand_total, payment_status)
         VALUES ($1, $2, $3, 'new', $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING *`,
        [
          body.locationId, body.tableId || null, body.orderType, body.placedBy,
          subtotal, taxTotal, discountTotal, platformFee, feePayer, grandTotal,
          body.paymentMethod ? 'paid' : 'unpaid',
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

        // Insert addons
        for (const addonId of item.addonIds) {
          await client.query(
            `INSERT INTO order_item_addons (order_item_id, addon_id) VALUES ($1, $2)`,
            [oiId, addonId]
          );
        }
      }

      // Create payment record if paid
      if (body.paymentMethod) {
        await client.query(
          `INSERT INTO payments (order_id, method, amount, status)
           VALUES ($1, $2, $3, 'success')`,
          [order.id, body.paymentMethod, grandTotal]
        );
      }

      // Update fee config counter
      if (feeConfig && feePayer === 'customer') {
        await client.query(
          `UPDATE location_fee_config
           SET period_order_count = period_order_count + 1
           WHERE location_id = $1`,
          [body.locationId]
        );
      }

      // Update table status if dine_in
      if (body.tableId && body.orderType === 'dine_in') {
        await client.query(
          `UPDATE dine_tables SET status = 'occupied' WHERE id = $1`,
          [body.tableId]
        );
      }

      await client.query('COMMIT');

      // Emit real-time event
      const io = req.app.get('io');
      if (io) {
        io.to(`location:${body.locationId}`).emit('order:created', { order });
      }

      res.status(201).json(order);
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
    console.error('Create order error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.patch('/:id/status', async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;

  const validStatuses = ['new', 'preparing', 'ready', 'served', 'completed', 'cancelled'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  const result = await query(
    `UPDATE orders SET status = $1, updated_at = now() WHERE id = $2
     RETURNING *`,
    [status, id]
  );

  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'Order not found' });
  }

  const order = result.rows[0];

  // Free table if order completed or cancelled
  if ((status === 'completed' || status === 'cancelled') && order.table_id) {
    await query(
      `UPDATE dine_tables SET status = 'free' WHERE id = $1`,
      [order.table_id]
    );
  }

  // Deduct inventory on completion
  if (status === 'completed') {
    const items = await query(
      `SELECT oi.menu_item_id, oi.qty, r.ingredient_id, r.qty_consumed
       FROM order_items oi
       JOIN recipes r ON r.menu_item_id = oi.menu_item_id
       WHERE oi.order_id = $1`,
      [id]
    );

    for (const row of items.rows) {
      const deduction = Number(row.qty) * Number(row.qty_consumed);
      await query(
        `UPDATE ingredients SET stock_qty = stock_qty - $1 WHERE id = $2`,
        [deduction, row.ingredient_id]
      );
      await query(
        `INSERT INTO inventory_logs (ingredient_id, change_qty, reason, ref_order_id)
         VALUES ($1, $2, 'sale', $3)`,
        [row.ingredient_id, -deduction, id]
      );

      // Check low stock
      const ing = await query(
        `SELECT id, name, stock_qty, low_stock_threshold FROM ingredients WHERE id = $1`,
        [row.ingredient_id]
      );
      if (ing.rows.length > 0 && ing.rows[0].stock_qty <= ing.rows[0].low_stock_threshold) {
        const io = req.app.get('io');
        if (io) {
          io.to(`location:${order.location_id}`).emit('inventory:low_stock', {
            ingredientId: row.ingredient_id,
            name: ing.rows[0].name,
            stockQty: ing.rows[0].stock_qty,
          });
        }
      }
    }
  }

  // Emit status change
  const io = req.app.get('io');
  if (io) {
    io.to(`location:${order.location_id}`).emit('order:status_changed', {
      orderId: id,
      status,
    });
  }

  res.json(order);
});

router.patch('/:id/payment', async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { method, amount } = req.body;

  const result = await query(
    `INSERT INTO payments (order_id, method, amount, status)
     VALUES ($1, $2, $3, 'success')
     RETURNING *`,
    [id, method, amount]
  );

  await query(
    `UPDATE orders SET payment_status = 'paid', updated_at = now() WHERE id = $1`,
    [id]
  );

  const io = req.app.get('io');
  if (io) {
    const order = await query(`SELECT location_id FROM orders WHERE id = $1`, [id]);
    if (order.rows.length > 0) {
      io.to(`location:${order.rows[0].location_id}`).emit('order:payment_updated', {
        orderId: id,
        paymentStatus: 'paid',
      });
    }
  }

  res.json(result.rows[0]);
});

export default router;
