import { Router } from 'express';
import * as showSessionController from '../../controllers/showSession.controller';
import { validate } from '../../middleware/validate';
import { listShowSessionsSchema } from '../../validators/showSession.validator';

const router = Router();

/**
 * @openapi
 * /api/show-sessions:
 *   get:
 *     tags: [Public Show Sessions]
 *     summary: List upcoming show dates that still have seats (pick one before booking Elite or Khasak)
 *     responses:
 *       200: { description: List of bookable show sessions }
 */
router.get('/', validate(listShowSessionsSchema), showSessionController.publicList);

export default router;
