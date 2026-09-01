import { z } from 'zod';

export const listAuditLogsSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().optional(),
    entityType: z.string().optional(),
    entityId: z.string().optional(),
    adminId: z.string().uuid().optional(),
    action: z.string().optional(),
  }),
});
