import { Router } from 'express';
import * as earlyBirdController from '../../controllers/earlyBird.controller';
import { authenticate } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { exportEarlyBirdSchema, listEarlyBirdSchema } from '../../validators/earlyBird.validator';

const router = Router();

router.use(authenticate);

/**
 * @openapi
 * /api/admin/early-bird:
 *   get:
 *     tags: [Admin Early Bird]
 *     summary: List early bird registrations
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Paginated registrations }
 */
router.get('/', validate(listEarlyBirdSchema), earlyBirdController.list);

/**
 * @openapi
 * /api/admin/early-bird/export:
 *   get:
 *     tags: [Admin Early Bird]
 *     summary: Export early bird registrations as CSV
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: CSV file }
 */
router.get('/export', validate(exportEarlyBirdSchema), earlyBirdController.exportCsv);

export default router;
