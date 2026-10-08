import { Request, Response, NextFunction } from 'express';
import { verifyToken, TokenPayload } from '../services/authService';
import { getDb } from '../db/mongo';

export interface AuthenticatedRequest extends Request {
  user?: TokenPayload;
}

export function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);
    if (decoded) {
      req.user = decoded;
    }
  }
  next();
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required. Please log in.' });
  }
  next();
}

export function requireHospitalAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  if (req.user.role !== 'HOSPITAL_ADMIN') {
    return res.status(403).json({ error: 'Access denied: Hospital admin role required' });
  }
  next();
}

export function requireSpecificHospital(paramKey: string = 'hospitalId') {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (req.user.role !== 'HOSPITAL_ADMIN') {
      return res.status(403).json({ error: 'Access denied' });
    }
    const targetHospitalId = req.params[paramKey] || req.body[paramKey];
    if (targetHospitalId && req.user.hospital_id && req.user.hospital_id !== targetHospitalId) {
      return res.status(403).json({
        error: `Unauthorized: You can only manage your assigned hospital (${req.user.hospital_id})`,
      });
    }
    next();
  };
}

export async function logAudit(
  userId: string,
  role: string,
  action: string,
  hospitalId?: string,
  details?: any
) {
  try {
    const db = getDb();
    await db.collection('audit_logs').insertOne({
      user_id: userId,
      role,
      action,
      hospital_id: hospitalId,
      details,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.warn('Audit log note:', err);
  }
}
