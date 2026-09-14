import { Request, Response, NextFunction } from 'express';
import jwt, { SignOptions } from 'jsonwebtoken';
import { query } from '../db/pool.js';

export interface AuthUser {
  id: string;
  business_id: string;
  role: 'owner' | 'manager' | 'cashier' | 'kitchen';
  location_ids: string[];
}

export interface AuthRequest extends Request {
  user?: AuthUser;
}

const JWT_SECRET = process.env.JWT_SECRET || 'tsos-dev-jwt-secret-change-in-production';

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid authorization header' });
  }

  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET) as AuthUser & { iat: number; exp: number };
    req.user = {
      id: payload.id,
      business_id: payload.business_id,
      role: payload.role,
      location_ids: payload.location_ids,
    };
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function requireRole(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}

export function requireLocationAccess(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  const locationId = req.params.locationId || req.query.locationId || req.body.locationId;
  if (locationId && !req.user.location_ids.includes(locationId as string)) {
    return res.status(403).json({ error: 'No access to this location' });
  }
  next();
}

function parseExpiresIn(val: string): number {
  const match = val.match(/^(\d+)([smhd])$/);
  if (!match) return parseInt(val, 10) || 604800;
  const n = parseInt(match[1], 10);
  switch (match[2]) {
    case 's': return n;
    case 'm': return n * 60;
    case 'h': return n * 3600;
    case 'd': return n * 86400;
    default: return 604800;
  }
}

export function generateToken(user: { id: string; business_id: string; role: string }, locationIds: string[]) {
  const options: SignOptions = {
    expiresIn: parseExpiresIn(process.env.JWT_EXPIRES_IN || '7d'),
  };
  return jwt.sign(
    {
      id: user.id,
      business_id: user.business_id,
      role: user.role,
      location_ids: locationIds,
    },
    JWT_SECRET,
    options
  );
}
