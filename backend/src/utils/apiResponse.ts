import { Response } from 'express';

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export function sendSuccess<T>(
  res: Response,
  data: T,
  message = 'Operation successful',
  statusCode = 200,
  pagination?: Pagination
) {
  return res.status(statusCode).json({
    success: true,
    data,
    message,
    ...(pagination ? { pagination } : {}),
  });
}

export function sendError(
  res: Response,
  message: string,
  statusCode = 500,
  errors: unknown[] = []
) {
  return res.status(statusCode).json({
    success: false,
    message,
    errors,
  });
}

export function buildPagination(page: number, limit: number, total: number): Pagination {
  return {
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}
