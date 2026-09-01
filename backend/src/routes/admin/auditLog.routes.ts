import { Router } from 'express';
import * as auditLogController from '../../controllers/auditLog.controller';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { listAuditLogsSchema } from '../../validators/auditLog.validator';

const router = Router();

/**
 * @openapi
 * /api/admin/audit-logs:
 *   get:
 *     tags: [Admin Audit Logs]
 *     summary: List audit logs
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Audit logs fetched }
 */
router.get('/', authenticate, authorize('SUPER_ADMIN'), validate(listAuditLogsSchema), auditLogController.list);

export default router;
