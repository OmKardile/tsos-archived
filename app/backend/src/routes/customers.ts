import { Router, Response } from 'express';
import { z } from 'zod';
import { query } from '../db/pool.js';
import { AuthRequest, authMiddleware, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);

// Customers
router.get('/', async (req: AuthRequest, res: Response) => {
  const locationId = req.query.locationId as string;

  let where = 'c.business_id = $1';
  const params: unknown[] = [req.user!.business_id];
  let i = 2;

  if (locationId) {
    where += ` AND EXISTS (
      SELECT 1 FROM orders o WHERE o.customer_id = c.id AND o.location_id = $${i++}
    )`;
    params.push(locationId);
  }

  const result = await query(
    `SELECT c.id, c.name, c.phone, c.email, c.loyalty_points, c.total_orders, c.total_spent, c.created_at
     FROM customers c
     WHERE ${where}
     ORDER BY c.total_spent DESC
     LIMIT 100`,
    params
  );
  res.json(result.rows);
});

router.get('/:id', async (req: AuthRequest, res: Response) => {
  const result = await query(
    `SELECT * FROM customers WHERE id = $1`,
    [req.params.id]
  );
  if (result.rows.length === 0) return res.status(404).json({ error: 'Customer not found' });

  const orders = await query(
    `SELECT id, status, grand_total, created_at
     FROM orders WHERE customer_id = $1
     ORDER BY created_at DESC LIMIT 10`,
    [req.params.id]
  );

  res.json({ ...result.rows[0], recentOrders: orders.rows });
});

// Loyalty redemption
router.post('/:id/loyalty/redeem', requireRole('owner', 'manager'), async (req: AuthRequest, res: Response) => {
  const { points } = req.body;
  const { id } = req.params;

  const customer = await query(`SELECT loyalty_points FROM customers WHERE id = $1`, [id]);
  if (customer.rows.length === 0) return res.status(404).json({ error: 'Customer not found' });

  if (customer.rows[0].loyalty_points < points) {
    return res.status(400).json({ error: 'Insufficient points' });
  }

  await query(`UPDATE customers SET loyalty_points = loyalty_points - $1 WHERE id = $2`, [points, id]);
  await query(
    `INSERT INTO loyalty_ledger (customer_id, points_delta, reason) VALUES ($1, $2, 'redeem')`,
    [id, -points]
  );

  res.json({ success: true, remainingPoints: customer.rows[0].loyalty_points - points });
});

// Offers
router.get('/offers/list', async (req: AuthRequest, res: Response) => {
  const locationId = req.query.locationId as string;
  if (!locationId || !req.user!.location_ids.includes(locationId)) {
    return res.status(400).json({ error: 'Valid locationId required' });
  }

  const result = await query(
    `SELECT * FROM offers WHERE location_id = $1 ORDER BY valid_from DESC`,
    [locationId]
  );
  res.json(result.rows);
});

const offerSchema = z.object({
  title: z.string().min(1),
  type: z.enum(['percent', 'flat', 'bogo']),
  value: z.number().min(0),
  minOrderValue: z.number().min(0).optional(),
  validFrom: z.string().optional(),
  validTo: z.string().optional(),
});

router.post('/offers', requireRole('owner', 'manager'), async (req: AuthRequest, res: Response) => {
  const locationId = req.body.locationId as string;
  if (!locationId || !req.user!.location_ids.includes(locationId)) {
    return res.status(400).json({ error: 'Valid locationId required' });
  }

  try {
    const body = offerSchema.parse(req.body);
    const result = await query(
      `INSERT INTO offers (location_id, title, type, value, min_order_value, valid_from, valid_to)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [locationId, body.title, body.type, body.value, body.minOrderValue ?? 0, body.validFrom || null, body.validTo || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: err.errors });
    }
    throw err;
  }
});

router.patch('/offers/:id', requireRole('owner', 'manager'), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { title, type, value, minOrderValue, validFrom, validTo, isActive } = req.body;

  const sets: string[] = [];
  const params: unknown[] = [];
  let i = 1;

  if (title !== undefined) { sets.push(`title = $${i++}`); params.push(title); }
  if (type !== undefined) { sets.push(`type = $${i++}`); params.push(type); }
  if (value !== undefined) { sets.push(`value = $${i++}`); params.push(value); }
  if (minOrderValue !== undefined) { sets.push(`min_order_value = $${i++}`); params.push(minOrderValue); }
  if (validFrom !== undefined) { sets.push(`valid_from = $${i++}`); params.push(validFrom); }
  if (validTo !== undefined) { sets.push(`valid_to = $${i++}`); params.push(validTo); }
  if (isActive !== undefined) { sets.push(`is_active = $${i++}`); params.push(isActive); }

  if (sets.length === 0) return res.status(400).json({ error: 'No fields to update' });

  params.push(id);
  const result = await query(
    `UPDATE offers SET ${sets.join(', ')} WHERE id = $${i} RETURNING *`,
    params
  );
  if (result.rows.length === 0) return res.status(404).json({ error: 'Offer not found' });
  res.json(result.rows[0]);
});

export default router;
