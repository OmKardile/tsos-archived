import { Router, Response } from 'express';
import { query } from '../db/pool.js';
import { AuthRequest, authMiddleware } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);

router.get('/summary', async (req: AuthRequest, res: Response) => {
  const locationId = req.query.locationId as string;
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

  let where = '';
  const params: unknown[] = [];
  if (locationId) {
    where = `AND location_id = $1`;
    params.push(locationId);
  }

  const result = await query(
    `SELECT
       (SELECT COUNT(*) FROM orders WHERE 1=1 ${where.replace('AND', 'AND')} AND created_at >= ${interval}) as total_orders,
       (SELECT COUNT(*) FROM orders WHERE 1=1 ${where.replace('AND', 'AND')} AND created_at >= ${prevInterval} AND created_at < ${interval}) as prev_orders,
       (SELECT COALESCE(SUM(grand_total), 0) FROM orders WHERE 1=1 ${where.replace('AND', 'AND')} AND created_at >= ${interval} AND payment_status = 'paid') as total_revenue,
       (SELECT COALESCE(SUM(grand_total), 0) FROM orders WHERE 1=1 ${where.replace('AND', 'AND')} AND created_at >= ${prevInterval} AND created_at < ${interval} AND payment_status = 'paid') as prev_revenue,
       (SELECT COUNT(*) FROM orders WHERE 1=1 ${where.replace('AND', 'AND')} AND status IN ('new','preparing')) as pending_orders,
       (SELECT COUNT(DISTINCT customer_id) FROM orders WHERE 1=1 ${where.replace('AND', 'AND')} AND created_at >= ${interval} AND customer_id IS NOT NULL) as active_customers,
       (SELECT COUNT(*) FROM customers WHERE business_id = $${params.length > 0 ? 2 : 1}) as total_customers`,
    params
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
    totalCustomers: Number(row.total_customers),
    ordersChange: Number(ordersChange),
    revenueChange: Number(revenueChange),
  });
});

router.get('/sales-overview', async (req: AuthRequest, res: Response) => {
  const locationId = req.query.locationId as string;
  const range = (req.query.range as string) || 'week';

  let interval: string;
  let dateFormat: string;

  switch (range) {
    case 'month':
      interval = "now() - interval '30 days'";
      dateFormat = 'YYYY-MM-DD';
      break;
    case 'week':
    default:
      interval = "now() - interval '7 days'";
      dateFormat = 'YYYY-MM-DD';
  }

  let where = '';
  const params: unknown[] = [];
  if (locationId) {
    where = 'AND o.location_id = $1';
    params.push(locationId);
  }

  const result = await query(
    `SELECT
       to_char(o.created_at, $${params.length + 1}) as date,
       COUNT(*) as orders,
       COALESCE(SUM(o.grand_total), 0) as revenue
     FROM orders o
     WHERE o.created_at >= ${interval} ${where}
     GROUP BY to_char(o.created_at, $${params.length + 1})
     ORDER BY date`,
    [...params, dateFormat]
  );

  res.json(result.rows);
});

router.get('/top-items', async (req: AuthRequest, res: Response) => {
  const locationId = req.query.locationId as string;

  let where = '';
  const params: unknown[] = [];
  if (locationId) {
    where = 'AND o.location_id = $1';
    params.push(locationId);
  }

  const result = await query(
    `SELECT
       mi.name,
       mi.price,
       SUM(oi.qty) as total_qty,
       SUM(oi.unit_price * oi.qty) as total_revenue
     FROM order_items oi
     JOIN menu_items mi ON mi.id = oi.menu_item_id
     JOIN orders o ON o.id = oi.order_id
     WHERE o.status != 'cancelled' ${where}
     GROUP BY mi.id, mi.name, mi.price
     ORDER BY total_qty DESC
     LIMIT 10`,
    params
  );

  res.json(result.rows);
});

router.get('/staff-performance', async (req: AuthRequest, res: Response) => {
  const locationId = req.query.locationId as string;

  let where = '';
  const params: unknown[] = [];
  if (locationId) {
    where = 'AND o.location_id = $1';
    params.push(locationId);
  }

  // Staff performance would need a staff_id on orders
  // For now, return placeholder
  res.json([]);
});

export default router;
