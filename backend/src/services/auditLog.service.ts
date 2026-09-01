import { Request } from 'express';
import { prisma } from '../config/prisma';
import { logger } from '../config/logger';

export interface AuditLogInput {
  adminId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  oldValue?: unknown;
  newValue?: unknown;
  ipAddress?: string | null;
}

function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim();
  }
  return req.ip ?? req.socket.remoteAddress ?? 'unknown';
}

export async function recordAuditLog(input: AuditLogInput): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        adminId: input.adminId ?? null,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId ?? null,
        oldValue: input.oldValue === undefined ? undefined : (input.oldValue as object),
        newValue: input.newValue === undefined ? undefined : (input.newValue as object),
        ipAddress: input.ipAddress ?? null,
      },
    });
  } catch (err) {
    // Audit logging must never break the primary business operation.
    logger.error({ err, input }, 'Failed to write audit log');
  }
}

export async function recordAuditLogFromRequest(
  req: Request,
  action: string,
  entityType: string,
  entityId?: string | null,
  oldValue?: unknown,
  newValue?: unknown
): Promise<void> {
  await recordAuditLog({
    adminId: req.admin?.id ?? null,
    action,
    entityType,
    entityId,
    oldValue,
    newValue,
    ipAddress: getClientIp(req),
  });
}
