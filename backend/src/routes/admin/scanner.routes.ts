import { Router } from 'express';
import * as scannerController from '../../controllers/scanner.controller';
import { authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { createScannerSchema, updateScannerSchema } from '../../validators/scanner.validator';

const router = Router();

// Only super admins manage gate-staff accounts.
router.use(authorize('SUPER_ADMIN'));

/**
 * @openapi
 * /api/admin/scanners:
 *   get:
 *     tags: [Admin Scanners]
 *     summary: List scanner (gate staff) accounts
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: List of scanners }
 *   post:
 *     tags: [Admin Scanners]
 *     summary: Create a scanner account that can only verify and check in tickets
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201: { description: Scanner created }
 */
router.get('/', scannerController.list);
router.post('/', validate(createScannerSchema), scannerController.create);

/**
 * @openapi
 * /api/admin/scanners/{id}:
 *   patch:
 *     tags: [Admin Scanners]
 *     summary: Rename, deactivate or reset the password of a scanner
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Scanner updated }
 */
router.patch('/:id', validate(updateScannerSchema), scannerController.update);

export default router;
