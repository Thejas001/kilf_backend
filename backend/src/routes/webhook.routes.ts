import { Router } from 'express';
import * as webhookController from '../controllers/webhook.controller';

const router = Router();

/**
 * @openapi
 * /api/webhooks/razorpay:
 *   post:
 *     tags: [Webhooks]
 *     summary: Razorpay payment webhook (payment.captured, payment.failed, refund.processed)
 *     description: >
 *       Verifies the `X-Razorpay-Signature` header against RAZORPAY_WEBHOOK_SECRET, then
 *       re-derives the booking's payment status directly from Razorpay's API before settling it -
 *       the webhook payload itself is only a trigger, never trusted directly.
 *     responses:
 *       200: { description: Webhook processed or safely ignored }
 *       400: { description: Missing signature header }
 *       401: { description: Invalid signature }
 */
router.post('/razorpay', webhookController.razorpayWebhook);

export default router;
