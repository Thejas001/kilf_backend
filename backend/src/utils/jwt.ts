import { randomUUID } from 'crypto';
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

export interface GuestAccessTokenPayload {
  sub: string;
  email: string;
  type: 'guest_access';
}

export interface GuestRefreshTokenPayload {
  sub: string;
  type: 'guest_refresh';
}

export function signGuestAccessToken(guest: { id: string; email: string }): string {
  const payload: GuestAccessTokenPayload = { sub: guest.id, email: guest.email, type: 'guest_access' };
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN } as SignOptions);
}

export function signGuestRefreshToken(guest: { id: string }): string {
  const payload: GuestRefreshTokenPayload = { sub: guest.id, type: 'guest_refresh' };
  // jti makes every token unique; without it two tokens minted in the same
  // second are byte-identical, so rotation wouldn't invalidate the old one.
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN,
    jwtid: randomUUID(),
  } as SignOptions);
}

export function verifyGuestAccessToken(token: string): GuestAccessTokenPayload {
  return jwt.verify(token, env.JWT_SECRET) as GuestAccessTokenPayload;
}

export function verifyGuestRefreshToken(token: string): GuestRefreshTokenPayload {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as GuestRefreshTokenPayload;
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
