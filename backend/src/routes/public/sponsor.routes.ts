import { Router } from 'express';
import * as sponsorController from '../../controllers/sponsor.controller';

const router = Router();

/**
 * @openapi
 * /api/sponsors:
 *   get:
 *     tags: [Public Sponsors]
 *     summary: List active sponsors, sorted by display order
 *     responses:
 *       200: { description: List of active sponsors }
 */
router.get('/', sponsorController.publicList);

export default router;
