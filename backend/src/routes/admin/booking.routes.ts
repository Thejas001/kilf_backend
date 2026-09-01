import { Router } from 'express';
import * as bookingController from '../../controllers/booking.controller';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import {
  bookingIdParamSchema,
  listBookingsSchema,
  refundBookingSchema,
  updateBookingStatusSchema,
} from '../../validators/booking.validator';

const router = Router();

router.use(authenticate);

/**
 * @openapi
 * /api/admin/bookings:
 *   get:
 *     tags: [Admin Bookings]
 *     summary: List bookings with search/filter/pagination
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: List of bookings }
 */
router.get('/', validate(listBookingsSchema), bookingController.list);

/**
 * @openapi
 * /api/admin/bookings/export:
 *   get:
 *     tags: [Admin Bookings]
 *     summary: Export bookings to CSV
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: CSV file }
 */
router.get('/export', bookingController.exportCsv);

/**
 * @openapi
 * /api/admin/bookings/{id}:
 *   get:
 *     tags: [Admin Bookings]
 *     summary: Get booking details
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Booking fetched }
 */
router.get('/:id', validate(bookingIdParamSchema), bookingController.getOne);

/**
 * @openapi
 * /api/admin/bookings/{id}/status:
 *   patch:
 *     tags: [Admin Bookings]
 *     summary: Cancel a booking
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Booking cancelled }
 */
router.patch(
  '/:id/status',
  authorize('ADMIN', 'SUPER_ADMIN'),
  validate(updateBookingStatusSchema),
  bookingController.updateStatus
);

/**
 * @openapi
 * /api/admin/bookings/{id}/refund:
 *   post:
 *     tags: [Admin Bookings]
 *     summary: Refund a confirmed booking
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Booking refunded }
 */
router.post(
  '/:id/refund',
  authorize('ADMIN', 'SUPER_ADMIN'),
  validate(refundBookingSchema),
  bookingController.refund
);

export default router;
