import { Router, Response } from 'express';
import { query } from '../db/pool.js';
import { AuthRequest, authMiddleware, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);

router.get('/', async (req: AuthRequest, res: Response) => {
  const locationId = req.query.locationId as string;
  if (!locationId || !req.user!.location_ids.includes(locationId)) {
    return res.status(400).json({ error: 'Valid locationId required' });
  }

  const result = await query(
    `SELECT * FROM location_fee_config WHERE location_id = $1`,
    [locationId]
  );

  if (result.rows.length === 0) {
    return res.json({
      monthlyFee: 0,
      perOrderFee: 1,
      defaultFeePayer: 'customer',
      customerPaidOrderLimit: null,
      periodOrderCount: 0,
    });
  }

  const config = result.rows[0];
  res.json({
    monthlyFee: Number(config.monthly_fee),
    perOrderFee: Number(config.per_order_fee),
    defaultFeePayer: config.default_fee_payer,
    customerPaidOrderLimit: config.customer_paid_order_limit,
    periodOrderCount: config.period_order_count,
    periodResetAt: config.period_reset_at,
  });
});

router.patch('/', requireRole('owner'), async (req: AuthRequest, res: Response) => {
  const locationId = req.body.locationId as string;
  if (!locationId || !req.user!.location_ids.includes(locationId)) {
    return res.status(400).json({ error: 'Valid locationId required' });
  }

  const { perOrderFee, defaultFeePayer, customerPaidOrderLimit } = req.body;

  const sets: string[] = [];
  const params: unknown[] = [];
  let i = 1;

  if (perOrderFee !== undefined) { sets.push(`per_order_fee = $${i++}`); params.push(perOrderFee); }
  if (defaultFeePayer !== undefined) { sets.push(`default_fee_payer = $${i++}`); params.push(defaultFeePayer); }
  if (customerPaidOrderLimit !== undefined) { sets.push(`customer_paid_order_limit = $${i++}`); params.push(customerPaidOrderLimit); }

  if (sets.length === 0) return res.status(400).json({ error: 'No fields to update' });

  params.push(locationId);
  const result = await query(
    `UPDATE location_fee_config SET ${sets.join(', ')} WHERE location_id = $${i}
     RETURNING *`,
    params
  );

  if (result.rows.length === 0) return res.status(404).json({ error: 'Fee config not found' });

  const config = result.rows[0];
  res.json({
    monthlyFee: Number(config.monthly_fee),
    perOrderFee: Number(config.per_order_fee),
    defaultFeePayer: config.default_fee_payer,
    customerPaidOrderLimit: config.customer_paid_order_limit,
    periodOrderCount: config.period_order_count,
  });
});

// Reset period counter (called by cron or manually)
router.post('/reset-period', requireRole('owner'), async (req: AuthRequest, res: Response) => {
  const locationId = req.body.locationId as string;
  if (!locationId || !req.user!.location_ids.includes(locationId)) {
    return res.status(400).json({ error: 'Valid locationId required' });
  }

  await query(
    `UPDATE location_fee_config
     SET period_order_count = 0, period_reset_at = CURRENT_DATE
     WHERE location_id = $1`,
    [locationId]
  );

  res.json({ success: true });
});

export default router;
