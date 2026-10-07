import { NextFunction, Request, Response } from 'express';
import { ApiError } from '../utils/ApiError';
import { verifyGuestAccessToken } from '../utils/jwt';
import { prisma } from '../config/prisma';
import { asyncHandler } from '../utils/asyncHandler';

export const authenticateGuest = asyncHandler(
  async (req: Request, _res: Response, next: NextFunction) => {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      throw ApiError.unauthorized('Authentication token missing');
    }

    let payload;
    try {
      payload = verifyGuestAccessToken(header.slice('Bearer '.length).trim());
    } catch {
      throw ApiError.unauthorized('Invalid or expired token');
    }

    if (payload.type !== 'guest_access') {
      throw ApiError.unauthorized('Invalid token type');
    }

    const guest = await prisma.guest.findUnique({ where: { id: payload.sub } });
    if (!guest || !guest.isActive) {
      throw ApiError.unauthorized('Account not found or inactive');
    }

    req.guest = { id: guest.id, email: guest.email };
    next();
  }
);
