import { Router, Response } from 'express';
import { z } from 'zod';
import { query } from '../db/pool.js';
import { AuthRequest, authMiddleware, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);

router.get('/', async (req: AuthRequest, res: Response) => {
  const result = await query(
    `SELECT l.id, l.name, l.slug, l.address, l.phone, l.is_active, l.created_at
     FROM locations l
     JOIN user_locations ul ON ul.location_id = l.id
     WHERE ul.user_id = $1 AND l.is_active = true
     ORDER BY l.name`,
    [req.user!.id]
  );
  res.json(result.rows);
});

router.get('/:id/dashboard-summary', async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string;
  if (!req.user!.location_ids.includes(id)) {
    return res.status(403).json({ error: 'No access to this location' });
  }

  const range = (req.query.range as string) || 'today';
  let interval: string;
  let prevInterval: string;

  switch (range) {
    case 'week':
      interval = "now() - interval '7 days'";
      prevInterval = "now() - interval '14 days'";
      break;
    case 'month':
      interval = "now() - interval '30 days'";
      prevInterval = "now() - interval '60 days'";
      break;
    default:
      interval = "current_date";
      prevInterval = "current_date - interval '1 day'";
  }

  const result = await query(
    `SELECT
       (SELECT COUNT(*) FROM orders WHERE location_id = $1 AND created_at >= ${interval}) as total_orders,
       (SELECT COUNT(*) FROM orders WHERE location_id = $1 AND created_at >= ${prevInterval} AND created_at < ${interval}) as prev_orders,
       (SELECT COALESCE(SUM(grand_total), 0) FROM orders WHERE location_id = $1 AND created_at >= ${interval} AND payment_status = 'paid') as total_revenue,
       (SELECT COALESCE(SUM(grand_total), 0) FROM orders WHERE location_id = $1 AND created_at >= ${prevInterval} AND created_at < ${interval} AND payment_status = 'paid') as prev_revenue,
       (SELECT COUNT(*) FROM orders WHERE location_id = $1 AND status IN ('new','preparing')) as pending_orders,
       (SELECT COUNT(DISTINCT customer_id) FROM orders WHERE location_id = $1 AND created_at >= ${interval} AND customer_id IS NOT NULL) as active_customers`,
    [id]
  );

  const row = result.rows[0];
  const ordersChange = Number(row.prev_orders) > 0
    ? ((Number(row.total_orders) - Number(row.prev_orders)) / Number(row.prev_orders) * 100).toFixed(1)
    : '0';
  const revenueChange = Number(row.prev_revenue) > 0
    ? ((Number(row.total_revenue) - Number(row.prev_revenue)) / Number(row.prev_revenue) * 100).toFixed(1)
    : '0';

  res.json({
    totalOrders: Number(row.total_orders),
    totalRevenue: Number(row.total_revenue),
    pendingOrders: Number(row.pending_orders),
    activeCustomers: Number(row.active_customers),
    ordersChange: Number(ordersChange),
    revenueChange: Number(revenueChange),
  });
});

const locationSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
  address: z.string().optional(),
  phone: z.string().optional(),
});

router.post('/', requireRole('owner'), async (req: AuthRequest, res: Response) => {
  try {
    const body = locationSchema.parse(req.body);
    const result = await query(
      `INSERT INTO locations (business_id, name, slug, address, phone)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [req.user!.business_id, body.name, body.slug, body.address ?? null, body.phone ?? null]
    );
    const location = result.rows[0];

    await query(
      `INSERT INTO user_locations (user_id, location_id) VALUES ($1, $2)`,
      [req.user!.id, location.id]
    );

    await query(
      `INSERT INTO location_fee_config (location_id) VALUES ($1)`,
      [location.id]
    );

    res.status(201).json(location);
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: err.errors });
    }
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Slug already in use' });
    }
    throw err;
  }
});

router.patch('/:id', requireRole('owner'), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { name, address, phone, isActive } = req.body;

  const sets: string[] = [];
  const params: unknown[] = [];
  let i = 1;

  if (name !== undefined) { sets.push(`name = $${i++}`); params.push(name); }
  if (address !== undefined) { sets.push(`address = $${i++}`); params.push(address); }
  if (phone !== undefined) { sets.push(`phone = $${i++}`); params.push(phone); }
  if (isActive !== undefined) { sets.push(`is_active = $${i++}`); params.push(isActive); }

  if (sets.length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }

  params.push(id);
  const result = await query(
    `UPDATE locations SET ${sets.join(', ')} WHERE id = $${i} RETURNING *`,
    params
  );

  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'Location not found' });
  }
  res.json(result.rows[0]);
});

export default router;
