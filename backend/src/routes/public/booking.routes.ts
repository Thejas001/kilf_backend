import { Router } from 'express';
import * as bookingController from '../../controllers/booking.controller';
import { validate } from '../../middleware/validate';
import { bookingLimiter } from '../../middleware/rateLimiters';
import {
  confirmPaymentSchema,
  createBookingSchema,
  publicBookingLookupSchema,
} from '../../validators/booking.validator';

const router = Router();

/**
 * @openapi
 * /api/bookings:
 *   post:
 *     tags: [Public Bookings]
 *     summary: Create a ticket booking
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [ticketId, quantity, customer]
 *             properties:
 *               ticketId: { type: string, format: uuid }
 *               quantity: { type: integer, minimum: 1 }
 *               customer:
 *                 type: object
 *                 required: [name, email, phone]
 *                 properties:
 *                   name: { type: string }
 *                   email: { type: string, format: email }
 *                   phone: { type: string }
 *     responses:
 *       201: { description: Booking created }
 *       409: { description: Not enough tickets available }
 */
router.post('/', bookingLimiter, validate(createBookingSchema), bookingController.create);

/**
 * @openapi
 * /api/bookings/{bookingNumber}/confirm-payment:
 *   post:
 *     tags: [Public Bookings]
 *     summary: Re-verify payment status with the payment provider (backend-authoritative)
 *     responses:
 *       200: { description: Payment status verified }
 */
router.post(
  '/:bookingNumber/confirm-payment',
  bookingLimiter,
  validate(confirmPaymentSchema),
  bookingController.confirmPayment
);

/**
 * @openapi
 * /api/bookings/{bookingNumber}:
 *   get:
 *     tags: [Public Bookings]
 *     summary: Look up a booking by number (requires matching customer email)
 *     parameters:
 *       - in: query
 *         name: email
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Booking fetched }
 *       404: { description: Booking not found }
 */
router.get('/:bookingNumber', validate(publicBookingLookupSchema), bookingController.lookupByNumber);

export default router;
