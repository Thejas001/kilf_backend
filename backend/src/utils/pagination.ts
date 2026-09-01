import { Request } from 'express';

export interface PaginationParams {
  page: number;
  limit: number;
  skip: number;
}

const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 20;

export function getPaginationParams(req: Request): PaginationParams {
  const page = Math.max(1, parseInt(String(req.query.page ?? '1'), 10) || 1);
  const rawLimit = parseInt(String(req.query.limit ?? String(DEFAULT_LIMIT)), 10) || DEFAULT_LIMIT;
  const limit = Math.min(MAX_LIMIT, Math.max(1, rawLimit));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}
