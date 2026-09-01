import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess, buildPagination } from '../utils/apiResponse';
import { getPaginationParams } from '../utils/pagination';
import { prisma } from '../config/prisma';

export const list = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, skip } = getPaginationParams(req);
  const { entityType, entityId, adminId, action } = req.query as Record<string, string | undefined>;

  const where: Prisma.AuditLogWhereInput = {
    ...(entityType ? { entityType } : {}),
    ...(entityId ? { entityId } : {}),
    ...(adminId ? { adminId } : {}),
    ...(action ? { action } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: { admin: { select: { id: true, name: true, email: true } } },
    }),
    prisma.auditLog.count({ where }),
  ]);

  return sendSuccess(res, items, 'Audit logs fetched', 200, buildPagination(page, limit, total));
});
