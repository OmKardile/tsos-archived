import { Router, Response } from 'express';
import { z } from 'zod';
import { query } from '../db/pool.js';
import { AuthRequest, authMiddleware, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);

const ingredientSchema = z.object({
  name: z.string().min(1),
  unit: z.enum(['g', 'kg', 'ml', 'l', 'pcs']),
  stockQty: z.number().min(0).optional(),
  lowStockThreshold: z.number().min(0).optional(),
});

// Ingredients CRUD
router.get('/ingredients', async (req: AuthRequest, res: Response) => {
  const locationId = req.query.locationId as string;
  if (!locationId || !req.user!.location_ids.includes(locationId)) {
    return res.status(400).json({ error: 'Valid locationId required' });
  }

  const result = await query(
    `SELECT id, name, unit, stock_qty, low_stock_threshold
     FROM ingredients WHERE location_id = $1
     ORDER BY name`,
    [locationId]
  );
  res.json(result.rows);
});

router.post('/ingredients', requireRole('owner', 'manager'), async (req: AuthRequest, res: Response) => {
  const locationId = req.body.locationId as string;
  if (!locationId || !req.user!.location_ids.includes(locationId)) {
    return res.status(400).json({ error: 'Valid locationId required' });
  }

  try {
    const body = ingredientSchema.parse(req.body);
    const result = await query(
      `INSERT INTO ingredients (location_id, name, unit, stock_qty, low_stock_threshold)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [locationId, body.name, body.unit, body.stockQty ?? 0, body.lowStockThreshold ?? 0]
    );
    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: err.errors });
    }
    throw err;
  }
});

router.patch('/ingredients/:id', requireRole('owner', 'manager'), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { name, unit, stockQty, lowStockThreshold } = req.body;

  const sets: string[] = [];
  const params: unknown[] = [];
  let i = 1;

  if (name !== undefined) { sets.push(`name = $${i++}`); params.push(name); }
  if (unit !== undefined) { sets.push(`unit = $${i++}`); params.push(unit); }
  if (stockQty !== undefined) { sets.push(`stock_qty = $${i++}`); params.push(stockQty); }
  if (lowStockThreshold !== undefined) { sets.push(`low_stock_threshold = $${i++}`); params.push(lowStockThreshold); }

  if (sets.length === 0) return res.status(400).json({ error: 'No fields to update' });

  params.push(id);
  const result = await query(
    `UPDATE ingredients SET ${sets.join(', ')} WHERE id = $${i} RETURNING *`,
    params
  );

  if (result.rows.length === 0) return res.status(404).json({ error: 'Ingredient not found' });
  res.json(result.rows[0]);
});

router.delete('/ingredients/:id', requireRole('owner', 'manager'), async (req: AuthRequest, res: Response) => {
  await query(`DELETE FROM ingredients WHERE id = $1`, [req.params.id]);
  res.json({ success: true });
});

// Low stock alert
router.get('/low-stock', async (req: AuthRequest, res: Response) => {
  const locationId = req.query.locationId as string;
  if (!locationId || !req.user!.location_ids.includes(locationId)) {
    return res.status(400).json({ error: 'Valid locationId required' });
  }

  const result = await query(
    `SELECT id, name, unit, stock_qty, low_stock_threshold
     FROM ingredients
     WHERE location_id = $1 AND stock_qty <= low_stock_threshold AND low_stock_threshold > 0
     ORDER BY stock_qty ASC`,
    [locationId]
  );
  res.json(result.rows);
});

// Restock
router.post('/restock', requireRole('owner', 'manager'), async (req: AuthRequest, res: Response) => {
  const { ingredientId, qty, reason } = req.body;

  if (!ingredientId || !qty) {
    return res.status(400).json({ error: 'ingredientId and qty required' });
  }

  await query(
    `UPDATE ingredients SET stock_qty = stock_qty + $1 WHERE id = $2`,
    [qty, ingredientId]
  );

  await query(
    `INSERT INTO inventory_logs (ingredient_id, change_qty, reason)
     VALUES ($1, $2, $3)`,
    [ingredientId, qty, reason || 'restock']
  );

  res.json({ success: true });
});

// Recipes
router.get('/recipes', async (req: AuthRequest, res: Response) => {
  const locationId = req.query.locationId as string;
  if (!locationId || !req.user!.location_ids.includes(locationId)) {
    return res.status(400).json({ error: 'Valid locationId required' });
  }

  const result = await query(
    `SELECT r.id, r.menu_item_id, r.ingredient_id, r.qty_consumed,
            mi.name as item_name, i.name as ingredient_name, i.unit
     FROM recipes r
     JOIN menu_items mi ON mi.id = r.menu_item_id
     JOIN ingredients i ON i.id = r.ingredient_id
     WHERE mi.location_id = $1
     ORDER BY mi.name, i.name`,
    [locationId]
  );
  res.json(result.rows);
});

router.post('/recipes', requireRole('owner', 'manager'), async (req: AuthRequest, res: Response) => {
  const { menuItemId, ingredientId, qtyConsumed } = req.body;

  try {
    const result = await query(
      `INSERT INTO recipes (menu_item_id, ingredient_id, qty_consumed)
       VALUES ($1, $2, $3)
       ON CONFLICT (menu_item_id, ingredient_id) DO UPDATE SET qty_consumed = $3
       RETURNING *`,
      [menuItemId, ingredientId, qtyConsumed]
    );
    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    if (err.code === '23505') {
      // Unique constraint - update instead
      const result = await query(
        `UPDATE recipes SET qty_consumed = $1
         WHERE menu_item_id = $2 AND ingredient_id = $3
         RETURNING *`,
        [qtyConsumed, menuItemId, ingredientId]
      );
      return res.json(result.rows[0]);
    }
    throw err;
  }
});

router.delete('/recipes/:id', requireRole('owner', 'manager'), async (req: AuthRequest, res: Response) => {
  await query(`DELETE FROM recipes WHERE id = $1`, [req.params.id]);
  res.json({ success: true });
});

export default router;
