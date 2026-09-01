import { NextFunction, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { ApiError } from '../utils/ApiError';
import { sendError } from '../utils/apiResponse';
import { logger } from '../config/logger';
import { isProduction } from '../config/env';

export function notFoundHandler(req: Request, res: Response) {
  sendError(res, `Route not found: ${req.method} ${req.originalUrl}`, 404);
}

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ApiError) {
    if (err.statusCode >= 500) {
      logger.error({ err }, err.message);
    }
    return sendError(res, err.message, err.statusCode, err.errors);
  }

  if (err instanceof ZodError) {
    const errors = err.issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
    }));
    return sendError(res, 'Validation failed', 400, errors);
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      const target = (err.meta?.target as string[] | undefined)?.join(', ') ?? 'field';
      return sendError(res, `A record with this ${target} already exists`, 409);
    }
    if (err.code === 'P2025') {
      return sendError(res, 'Record not found', 404);
    }
    if (err.code === 'P2003') {
      return sendError(res, 'Related record not found', 400);
    }
  }

  logger.error({ err }, 'Unhandled error');

  return sendError(
    res,
    isProduction ? 'Something went wrong' : (err as Error)?.message || 'Something went wrong',
    500,
    isProduction ? [] : [(err as Error)?.stack]
  );
}
