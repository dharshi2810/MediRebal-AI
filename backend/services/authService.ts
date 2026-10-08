import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { User } from '../models/types';

const JWT_SECRET = process.env.JWT_SECRET || 'medirebal_jwt_secret_dev_2026';

export interface TokenPayload {
  userId: string;
  email: string;
  role: 'PUBLIC_USER' | 'HOSPITAL_ADMIN' | 'DOCTOR';
  hospital_id?: string;
  doctorId?: string;
  doctor_id?: string;
  name: string;
}

export function generateToken(user: User): string {
  const payload: TokenPayload = {
    userId: user._id || user.email,
    email: user.email,
    role: user.role,
    hospital_id: user.hospital_id,
    name: user.name,
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch (err) {
    return null;
  }
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export async function comparePassword(plain: string, hashed: string): Promise<boolean> {
  return bcrypt.compare(plain, hashed);
}
