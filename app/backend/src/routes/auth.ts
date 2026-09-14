import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { query } from '../db/pool.js';
import { generateToken } from '../middleware/auth.js';

const router = Router();

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1),
  businessName: z.string().min(1),
  locationName: z.string().min(1),
  locationSlug: z.string().min(1).regex(/^[a-z0-9-]+$/),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

const pinLoginSchema = z.object({
  pinCode: z.string().length(4),
  email: z.string().email(),
});

router.post('/signup', async (req: Request, res: Response) => {
  try {
    const body = signupSchema.parse(req.body);
    const passwordHash = await bcrypt.hash(body.password, 10);

    const result = await query(
      `INSERT INTO users (email, password_hash, name, role)
       VALUES ($1, $2, $3, 'owner')
       RETURNING id, email, name, role`,
      [body.email, passwordHash, body.name]
    );
    const user = result.rows[0];

    const bizResult = await query(
      `INSERT INTO businesses (owner_user_id, name)
       VALUES ($1, $2)
       RETURNING id, name`,
      [user.id, body.businessName]
    );
    const business = bizResult.rows[0];

    await query(`UPDATE users SET business_id = $1 WHERE id = $2`, [business.id, user.id]);

    const locResult = await query(
      `INSERT INTO locations (business_id, name, slug)
       VALUES ($1, $2, $3)
       RETURNING id, name, slug`,
      [business.id, body.locationName, body.locationSlug]
    );
    const location = locResult.rows[0];

    await query(
      `INSERT INTO user_locations (user_id, location_id)
       VALUES ($1, $2)`,
      [user.id, location.id]
    );

    const token = generateToken(user, [location.id]);

    res.status(201).json({
      token,
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      business: { id: business.id, name: business.name },
      location: { id: location.id, name: location.name, slug: location.slug },
    });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: err.errors });
    }
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Email already registered' });
    }
    console.error('Signup error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/login', async (req: Request, res: Response) => {
  try {
    const body = loginSchema.parse(req.body);

    const result = await query(
      `SELECT u.id, u.email, u.name, u.role, u.password_hash, u.business_id,
              array_agg(ul.location_id) as location_ids
       FROM users u
       JOIN user_locations ul ON ul.user_id = u.id
       WHERE u.email = $1 AND u.is_active = true
       GROUP BY u.id`,
      [body.email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];
    const valid = await bcrypt.compare(body.password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = generateToken(user, user.location_ids);

    res.json({
      token,
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: err.errors });
    }
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/pin-login', async (req: Request, res: Response) => {
  try {
    const body = pinLoginSchema.parse(req.body);

    const result = await query(
      `SELECT u.id, u.email, u.name, u.role, u.business_id, u.pin_code,
              array_agg(ul.location_id) as location_ids
       FROM users u
       JOIN user_locations ul ON ul.user_id = u.id
       WHERE u.email = $1 AND u.is_active = true AND u.pin_code IS NOT NULL
       GROUP BY u.id`,
      [body.email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];
    if (user.pin_code !== body.pinCode) {
      return res.status(401).json({ error: 'Invalid PIN' });
    }

    const token = generateToken(user, user.location_ids);

    res.json({
      token,
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: err.errors });
    }
    console.error('PIN login error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/me', async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    const jwt = await import('jsonwebtoken');
    const payload = jwt.default.verify(authHeader.slice(7), process.env.JWT_SECRET || '') as any;

    const result = await query(
      `SELECT u.id, u.email, u.name, u.role, u.business_id, b.name as business_name
       FROM users u
       JOIN businesses b ON b.id = u.business_id
       WHERE u.id = $1`,
      [payload.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];
    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        businessId: user.business_id,
        businessName: user.business_name,
        locationIds: payload.location_ids,
      },
    });
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
});

export default router;
