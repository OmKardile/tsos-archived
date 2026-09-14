import { Router, Response } from 'express';
import { z } from 'zod';
import { query } from '../db/pool.js';
import { AuthRequest, authMiddleware, requireRole } from '../middleware/auth.js';
import { randomBytes } from 'crypto';

const router = Router();
router.use(authMiddleware);

router.get('/', async (req: AuthRequest, res: Response) => {
  const locationId = req.query.locationId as string;
  if (!locationId || !req.user!.location_ids.includes(locationId)) {
    return res.status(400).json({ error: 'Valid locationId required' });
  }

  const result = await query(
    `SELECT id, label, qr_token, seats, status
     FROM dine_tables
     WHERE location_id = $1
     ORDER BY label`,
    [locationId]
  );
  res.json(result.rows);
});

const tableSchema = z.object({
  label: z.string().min(1),
  seats: z.number().int().positive().optional(),
});

router.post('/', requireRole('owner', 'manager'), async (req: AuthRequest, res: Response) => {
  const locationId = req.body.locationId as string;
  if (!locationId || !req.user!.location_ids.includes(locationId)) {
    return res.status(400).json({ error: 'Valid locationId required' });
  }

  try {
    const body = tableSchema.parse(req.body);
    const qrToken = `tbl-${randomBytes(4).toString('hex')}`;

    const result = await query(
      `INSERT INTO dine_tables (location_id, label, qr_token, seats)
       VALUES ($1, $2, $3, $4)
       RETURNING id, label, qr_token, seats, status`,
      [locationId, body.label, qrToken, body.seats ?? null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: err.errors });
    }
    throw err;
  }
});

router.patch('/:id', requireRole('owner', 'manager'), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { label, seats, status } = req.body;

  const sets: string[] = [];
  const params: unknown[] = [];
  let i = 1;

  if (label !== undefined) { sets.push(`label = $${i++}`); params.push(label); }
  if (seats !== undefined) { sets.push(`seats = $${i++}`); params.push(seats); }
  if (status !== undefined) { sets.push(`status = $${i++}`); params.push(status); }

  if (sets.length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }

  params.push(id);
  const result = await query(
    `UPDATE dine_tables SET ${sets.join(', ')} WHERE id = $${i}
     RETURNING id, label, qr_token, seats, status`,
    params
  );

  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'Table not found' });
  }
  res.json(result.rows[0]);
});

router.delete('/:id', requireRole('owner', 'manager'), async (req: AuthRequest, res: Response) => {
  await query(`DELETE FROM dine_tables WHERE id = $1`, [req.params.id]);
  res.json({ success: true });
});

router.get('/:id/qr', async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const result = await query(
    `SELECT dt.id, dt.label, dt.qr_token, l.slug as location_slug
     FROM dine_tables dt
     JOIN locations l ON l.id = dt.location_id
     WHERE dt.id = $1`,
    [id]
  );

  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'Table not found' });
  }

  const table = result.rows[0];
  const url = `${req.protocol}://${req.get('host')}/order/${table.location_slug}/table/${table.id}`;

  res.json({
    tableId: table.id,
    label: table.label,
    url,
    qrToken: table.qr_token,
  });
});

export default router;
