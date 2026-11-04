import { Router } from 'express';
import * as showSessionController from '../../controllers/showSession.controller';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import {
  createShowSessionSchema,
  listShowSessionsSchema,
  showSessionIdParamSchema,
  updateShowSessionSchema,
} from '../../validators/showSession.validator';

const router = Router();

router.use(authenticate);

/**
 * @openapi
 * /api/admin/show-sessions:
 *   get:
 *     tags: [Admin Show Sessions]
 *     summary: List show sessions (e.g. Khasak show dates) with seat availability
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: List of show sessions }
 *   post:
 *     tags: [Admin Show Sessions]
 *     summary: Create a show session
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201: { description: Show session created }
 */
router.get('/', validate(listShowSessionsSchema), showSessionController.list);
router.post(
  '/',
  authorize('ADMIN', 'SUPER_ADMIN'),
  validate(createShowSessionSchema),
  showSessionController.create
);

/**
 * @openapi
 * /api/admin/show-sessions/{id}:
 *   get:
 *     tags: [Admin Show Sessions]
 *     summary: Get a show session
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Show session fetched }
 *   put:
 *     tags: [Admin Show Sessions]
 *     summary: Update a show session
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Show session updated }
 *   delete:
 *     tags: [Admin Show Sessions]
 *     summary: Delete a show session without bookings
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Show session deleted }
 */
router.get('/:id', validate(showSessionIdParamSchema), showSessionController.getOne);
router.put(
  '/:id',
  authorize('ADMIN', 'SUPER_ADMIN'),
  validate(updateShowSessionSchema),
  showSessionController.update
);
router.delete(
  '/:id',
  authorize('SUPER_ADMIN'),
  validate(showSessionIdParamSchema),
  showSessionController.remove
);

export default router;
