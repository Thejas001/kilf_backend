import { Router } from 'express';
import * as dashboardController from '../../controllers/dashboard.controller';
import { authenticate } from '../../middleware/auth';

const router = Router();

/**
 * @openapi
 * /api/admin/dashboard:
 *   get:
 *     tags: [Admin Dashboard]
 *     summary: Aggregated festival statistics for the admin dashboard
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Dashboard stats }
 */
router.get('/', authenticate, dashboardController.getStats);

export default router;
