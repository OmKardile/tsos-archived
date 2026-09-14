import { Router, Response } from 'express';
import { z } from 'zod';
import { query } from '../db/pool.js';
import { AuthRequest, authMiddleware, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);

const categorySchema = z.object({
  name: z.string().min(1),
  sortOrder: z.number().int().optional(),
});

const itemSchema = z.object({
  categoryId: z.string().uuid().nullable().optional(),
  name: z.string().min(1),
  description: z.string().optional(),
  price: z.number().positive(),
  imageUrl: z.string().url().nullable().optional(),
  isVeg: z.boolean().optional(),
  taxRatePct: z.number().min(0).max(100).optional(),
  sortOrder: z.number().int().optional(),
});

const variantSchema = z.object({
  name: z.string().min(1),
  priceDelta: z.number().optional(),
});

const addonSchema = z.object({
  name: z.string().min(1),
  price: z.number().min(0),
});

// ─── Categories ────────────────────────────────────────

router.get('/categories', async (req: AuthRequest, res: Response) => {
  const locationId = req.query.locationId as string;
  if (!locationId || !req.user!.location_ids.includes(locationId)) {
    return res.status(400).json({ error: 'Valid locationId required' });
  }

  const result = await query(
    `SELECT id, name, sort_order, is_active
     FROM menu_categories
     WHERE location_id = $1
     ORDER BY sort_order, name`,
    [locationId]
  );
  res.json(result.rows);
});

router.post('/categories', requireRole('owner', 'manager'), async (req: AuthRequest, res: Response) => {
  const locationId = req.body.locationId as string;
  if (!locationId || !req.user!.location_ids.includes(locationId)) {
    return res.status(400).json({ error: 'Valid locationId required' });
  }

  try {
    const body = categorySchema.parse(req.body);
    const result = await query(
      `INSERT INTO menu_categories (location_id, name, sort_order)
       VALUES ($1, $2, $3)
       RETURNING id, name, sort_order, is_active`,
      [locationId, body.name, body.sortOrder ?? 0]
    );
    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: err.errors });
    }
    throw err;
  }
});

router.patch('/categories/:id', requireRole('owner', 'manager'), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { name, sortOrder, isActive } = req.body;

  const sets: string[] = [];
  const params: unknown[] = [];
  let i = 1;

  if (name !== undefined) { sets.push(`name = $${i++}`); params.push(name); }
  if (sortOrder !== undefined) { sets.push(`sort_order = $${i++}`); params.push(sortOrder); }
  if (isActive !== undefined) { sets.push(`is_active = $${i++}`); params.push(isActive); }

  if (sets.length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }

  params.push(id);
  const result = await query(
    `UPDATE menu_categories SET ${sets.join(', ')} WHERE id = $${i}
     RETURNING id, name, sort_order, is_active`,
    params
  );

  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'Category not found' });
  }
  res.json(result.rows[0]);
});

router.delete('/categories/:id', requireRole('owner', 'manager'), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  await query(`DELETE FROM menu_categories WHERE id = $1`, [id]);
  res.json({ success: true });
});

// ─── Menu Items ────────────────────────────────────────

router.get('/items', async (req: AuthRequest, res: Response) => {
  const locationId = req.query.locationId as string;
  if (!locationId || !req.user!.location_ids.includes(locationId)) {
    return res.status(400).json({ error: 'Valid locationId required' });
  }

  const result = await query(
    `SELECT mi.*, mc.name as category_name,
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
     WHERE mi.location_id = $1
     GROUP BY mi.id, mc.name
     ORDER BY mi.sort_order, mi.name`,
    [locationId]
  );
  res.json(result.rows);
});

router.post('/items', requireRole('owner', 'manager'), async (req: AuthRequest, res: Response) => {
  const locationId = req.body.locationId as string;
  if (!locationId || !req.user!.location_ids.includes(locationId)) {
    return res.status(400).json({ error: 'Valid locationId required' });
  }

  try {
    const body = itemSchema.parse(req.body);
    const result = await query(
      `INSERT INTO menu_items (location_id, category_id, name, description, price, image_url, is_veg, tax_rate_pct, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        locationId,
        body.categoryId ?? null,
        body.name,
        body.description ?? null,
        body.price,
        body.imageUrl ?? null,
        body.isVeg ?? null,
        body.taxRatePct ?? 5.0,
        body.sortOrder ?? 0,
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: err.errors });
    }
    throw err;
  }
});

router.patch('/items/:id', requireRole('owner', 'manager'), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { categoryId, name, description, price, imageUrl, isVeg, taxRatePct, sortOrder } = req.body;

  const sets: string[] = [];
  const params: unknown[] = [];
  let i = 1;

  if (categoryId !== undefined) { sets.push(`category_id = $${i++}`); params.push(categoryId); }
  if (name !== undefined) { sets.push(`name = $${i++}`); params.push(name); }
  if (description !== undefined) { sets.push(`description = $${i++}`); params.push(description); }
  if (price !== undefined) { sets.push(`price = $${i++}`); params.push(price); }
  if (imageUrl !== undefined) { sets.push(`image_url = $${i++}`); params.push(imageUrl); }
  if (isVeg !== undefined) { sets.push(`is_veg = $${i++}`); params.push(isVeg); }
  if (taxRatePct !== undefined) { sets.push(`tax_rate_pct = $${i++}`); params.push(taxRatePct); }
  if (sortOrder !== undefined) { sets.push(`sort_order = $${i++}`); params.push(sortOrder); }

  if (sets.length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }

  params.push(id);
  const result = await query(
    `UPDATE menu_items SET ${sets.join(', ')} WHERE id = $${i} RETURNING *`,
    params
  );

  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'Item not found' });
  }
  res.json(result.rows[0]);
});

router.patch('/items/:id/availability', requireRole('owner', 'manager', 'cashier'), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { isAvailable } = req.body;

  const result = await query(
    `UPDATE menu_items SET is_available = $1 WHERE id = $2 RETURNING id, name, is_available`,
    [isAvailable, id]
  );

  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'Item not found' });
  }
  res.json(result.rows[0]);
});

router.delete('/items/:id', requireRole('owner', 'manager'), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  await query(`DELETE FROM menu_items WHERE id = $1`, [id]);
  res.json({ success: true });
});

// ─── Variants ──────────────────────────────────────────

router.post('/items/:itemId/variants', requireRole('owner', 'manager'), async (req: AuthRequest, res: Response) => {
  const { itemId } = req.params;
  try {
    const body = variantSchema.parse(req.body);
    const result = await query(
      `INSERT INTO menu_item_variants (menu_item_id, name, price_delta)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [itemId, body.name, body.priceDelta ?? 0]
    );
    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: err.errors });
    }
    throw err;
  }
});

router.delete('/variants/:id', requireRole('owner', 'manager'), async (req: AuthRequest, res: Response) => {
  await query(`DELETE FROM menu_item_variants WHERE id = $1`, [req.params.id]);
  res.json({ success: true });
});

// ─── Add-ons ───────────────────────────────────────────

router.get('/addons', async (req: AuthRequest, res: Response) => {
  const locationId = req.query.locationId as string;
  if (!locationId || !req.user!.location_ids.includes(locationId)) {
    return res.status(400).json({ error: 'Valid locationId required' });
  }

  const result = await query(
    `SELECT id, name, price FROM addons WHERE location_id = $1 ORDER BY name`,
    [locationId]
  );
  res.json(result.rows);
});

router.post('/addons', requireRole('owner', 'manager'), async (req: AuthRequest, res: Response) => {
  const locationId = req.body.locationId as string;
  if (!locationId || !req.user!.location_ids.includes(locationId)) {
    return res.status(400).json({ error: 'Valid locationId required' });
  }

  try {
    const body = addonSchema.parse(req.body);
    const result = await query(
      `INSERT INTO addons (location_id, name, price)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [locationId, body.name, body.price]
    );
    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: err.errors });
    }
    throw err;
  }
});

router.delete('/addons/:id', requireRole('owner', 'manager'), async (req: AuthRequest, res: Response) => {
  await query(`DELETE FROM addons WHERE id = $1`, [req.params.id]);
  res.json({ success: true });
});

router.post('/items/:itemId/addons', requireRole('owner', 'manager'), async (req: AuthRequest, res: Response) => {
  const { itemId } = req.params;
  const { addonId } = req.body;
  await query(
    `INSERT INTO menu_item_addons (menu_item_id, addon_id)
     VALUES ($1, $2)
     ON CONFLICT DO NOTHING`,
    [itemId, addonId]
  );
  res.json({ success: true });
});

router.delete('/items/:itemId/addons/:addonId', requireRole('owner', 'manager'), async (req: AuthRequest, res: Response) => {
  const { itemId, addonId } = req.params;
  await query(
    `DELETE FROM menu_item_addons WHERE menu_item_id = $1 AND addon_id = $2`,
    [itemId, addonId]
  );
  res.json({ success: true });
});

export default router;
