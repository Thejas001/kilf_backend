import { Router } from 'express';
import * as revenueController from '../../controllers/revenue.controller';
import { authenticate } from '../../middleware/auth';

const router = Router();

router.use(authenticate);

/**
 * @openapi
 * /api/admin/revenue/summary:
 *   get:
 *     tags: [Admin Revenue]
 *     summary: Overall revenue summary (gross, refunds, net, tickets sold, average ticket value)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Revenue summary }
 */
router.get('/summary', revenueController.summary);

/**
 * @openapi
 * /api/admin/revenue/daily:
 *   get:
 *     tags: [Admin Revenue]
 *     summary: Revenue grouped by day
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: days
 *         schema: { type: integer, default: 30 }
 *     responses:
 *       200: { description: Daily revenue }
 */
router.get('/daily', revenueController.daily);

/**
 * @openapi
 * /api/admin/revenue/monthly:
 *   get:
 *     tags: [Admin Revenue]
 *     summary: Revenue grouped by month
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: months
 *         schema: { type: integer, default: 12 }
 *     responses:
 *       200: { description: Monthly revenue }
 */
router.get('/monthly', revenueController.monthly);

/**
 * @openapi
 * /api/admin/revenue/tickets:
 *   get:
 *     tags: [Admin Revenue]
 *     summary: Revenue broken down by ticket type
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Revenue by ticket }
 */
router.get('/tickets', revenueController.tickets);

/**
 * @openapi
 * /api/admin/revenue/festivals:
 *   get:
 *     tags: [Admin Revenue]
 *     summary: Revenue broken down by festival
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Revenue by festival }
 */
router.get('/festivals', revenueController.byFestival);

/**
 * @openapi
 * /api/admin/revenue/payment-status:
 *   get:
 *     tags: [Admin Revenue]
 *     summary: Revenue broken down by payment status
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Revenue by payment status }
 */
router.get('/payment-status', revenueController.byPaymentStatus);

export default router;
