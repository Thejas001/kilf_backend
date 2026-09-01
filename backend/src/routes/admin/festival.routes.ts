import { Router } from 'express';
import * as festivalController from '../../controllers/festival.controller';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import {
  createFestivalSchema,
  festivalIdParamSchema,
  listFestivalsSchema,
  updateFestivalSchema,
  updateFestivalStatusSchema,
} from '../../validators/festival.validator';

const router = Router();

router.use(authenticate);

/**
 * @openapi
 * /api/admin/festivals:
 *   get:
 *     tags: [Admin Festivals]
 *     summary: List festivals
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer }
 *       - in: query
 *         name: limit
 *         schema: { type: integer }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [DRAFT, PUBLISHED, CANCELLED, COMPLETED] }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *     responses:
 *       200: { description: List of festivals }
 *   post:
 *     tags: [Admin Festivals]
 *     summary: Create a festival
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201: { description: Festival created }
 */
router.get('/', validate(listFestivalsSchema), festivalController.list);
router.post('/', authorize('ADMIN', 'SUPER_ADMIN'), validate(createFestivalSchema), festivalController.create);

/**
 * @openapi
 * /api/admin/festivals/{id}:
 *   get:
 *     tags: [Admin Festivals]
 *     summary: Get a festival by id
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Festival fetched }
 *   put:
 *     tags: [Admin Festivals]
 *     summary: Update a festival
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Festival updated }
 *   delete:
 *     tags: [Admin Festivals]
 *     summary: Delete a festival
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Festival deleted }
 */
router.get('/:id', validate(festivalIdParamSchema), festivalController.getOne);
router.put(
  '/:id',
  authorize('ADMIN', 'SUPER_ADMIN'),
  validate(updateFestivalSchema),
  festivalController.update
);
router.delete(
  '/:id',
  authorize('SUPER_ADMIN'),
  validate(festivalIdParamSchema),
  festivalController.remove
);

/**
 * @openapi
 * /api/admin/festivals/{id}/status:
 *   patch:
 *     tags: [Admin Festivals]
 *     summary: Publish/unpublish or change festival status
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Status updated }
 */
router.patch(
  '/:id/status',
  authorize('ADMIN', 'SUPER_ADMIN'),
  validate(updateFestivalStatusSchema),
  festivalController.updateStatus
);

export default router;
