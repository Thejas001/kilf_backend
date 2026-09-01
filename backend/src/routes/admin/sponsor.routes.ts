import { Router } from 'express';
import * as sponsorController from '../../controllers/sponsor.controller';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { upload } from '../../middleware/upload';
import {
  createSponsorSchema,
  listSponsorsSchema,
  sponsorIdParamSchema,
  updateSponsorSchema,
  updateSponsorStatusSchema,
} from '../../validators/sponsor.validator';

const router = Router();

router.use(authenticate);

/**
 * @openapi
 * /api/admin/sponsors:
 *   get:
 *     tags: [Admin Sponsors]
 *     summary: List sponsors
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: List of sponsors }
 *   post:
 *     tags: [Admin Sponsors]
 *     summary: Add a sponsor
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201: { description: Sponsor created }
 */
router.get('/', validate(listSponsorsSchema), sponsorController.list);
router.post('/', authorize('ADMIN', 'SUPER_ADMIN'), validate(createSponsorSchema), sponsorController.create);

/**
 * @openapi
 * /api/admin/sponsors/{id}:
 *   get:
 *     tags: [Admin Sponsors]
 *     summary: Get a sponsor by id
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Sponsor fetched }
 *   put:
 *     tags: [Admin Sponsors]
 *     summary: Update a sponsor
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Sponsor updated }
 *   delete:
 *     tags: [Admin Sponsors]
 *     summary: Delete a sponsor
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Sponsor deleted }
 */
router.get('/:id', validate(sponsorIdParamSchema), sponsorController.getOne);
router.put(
  '/:id',
  authorize('ADMIN', 'SUPER_ADMIN'),
  validate(updateSponsorSchema),
  sponsorController.update
);
router.delete(
  '/:id',
  authorize('SUPER_ADMIN'),
  validate(sponsorIdParamSchema),
  sponsorController.remove
);

/**
 * @openapi
 * /api/admin/sponsors/{id}/status:
 *   patch:
 *     tags: [Admin Sponsors]
 *     summary: Activate/deactivate a sponsor
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Status updated }
 */
router.patch(
  '/:id/status',
  authorize('ADMIN', 'SUPER_ADMIN'),
  validate(updateSponsorStatusSchema),
  sponsorController.updateStatus
);

/**
 * @openapi
 * /api/admin/sponsors/{id}/logo:
 *   post:
 *     tags: [Admin Sponsors]
 *     summary: Upload a sponsor logo
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               logo: { type: string, format: binary }
 *     responses:
 *       200: { description: Logo uploaded }
 */
router.post(
  '/:id/logo',
  authorize('ADMIN', 'SUPER_ADMIN'),
  validate(sponsorIdParamSchema),
  upload.single('logo'),
  sponsorController.uploadLogo
);

export default router;
