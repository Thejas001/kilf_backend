import jwt, { SignOptions } from 'jsonwebtoken';
import { AdminRole } from '@prisma/client';
import { env } from '../config/env';

export interface AccessTokenPayload {
  sub: string;
  email: string;
  role: AdminRole;
  type: 'access';
}

export interface RefreshTokenPayload {
  sub: string;
  type: 'refresh';
}

export function signAccessToken(admin: { id: string; email: string; role: AdminRole }): string {
  const payload: AccessTokenPayload = {
    sub: admin.id,
    email: admin.email,
    role: admin.role,
    type: 'access',
  };
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
  } as SignOptions);
}

export function signRefreshToken(admin: { id: string }): string {
  const payload: RefreshTokenPayload = { sub: admin.id, type: 'refresh' };
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN,
  } as SignOptions);
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.JWT_SECRET) as AccessTokenPayload;
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as RefreshTokenPayload;
}
