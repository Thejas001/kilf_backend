import { Request, Response } from 'express';
import Razorpay from 'razorpay';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/ApiError';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { prisma } from '../config/prisma';
import { settlePaymentResult } from '../services/booking.service';
import { recordAuditLog } from '../services/auditLog.service';

/**
 * Razorpay webhook receiver. Configure this URL (https://your-domain/api/webhooks/razorpay)
 * in the Razorpay Dashboard under Settings -> Webhooks, subscribed at minimum to
 * `payment.captured`, `payment.failed`, and `refund.processed`, using the same
 * secret as RAZORPAY_WEBHOOK_SECRET.
 *
 * The webhook is treated only as a trigger to re-check payment status, never as
 * the source of truth by itself: after verifying the signature, the handler
 * calls the existing `settlePaymentResult`, which asks Razorpay's API directly
 * (via PaymentProvider.verifyPayment) what actually happened. This also makes
 * the handler naturally idempotent against Razorpay's at-least-once retries,
 * since settlePaymentResult is a no-op once a booking has left PENDING_PAYMENT.
 */
export const razorpayWebhook = asyncHandler(async (req: Request, res: Response) => {
  if (env.PAYMENT_PROVIDER !== 'razorpay' || !env.RAZORPAY_WEBHOOK_SECRET) {
    throw ApiError.notFound('Razorpay webhooks are not enabled');
  }

  const signature = req.headers['x-razorpay-signature'];
  if (typeof signature !== 'string' || !req.rawBody) {
    throw ApiError.badRequest('Missing webhook signature');
  }

  const valid = Razorpay.validateWebhookSignature(
    req.rawBody.toString('utf8'),
    signature,
    env.RAZORPAY_WEBHOOK_SECRET
  );
  if (!valid) {
    logger.warn('Rejected Razorpay webhook with invalid signature');
    throw ApiError.unauthorized('Invalid webhook signature');
  }

  const event = req.body?.event as string | undefined;
  const orderId: string | undefined =
    req.body?.payload?.payment?.entity?.order_id ?? req.body?.payload?.order?.entity?.id;

  logger.info({ event, orderId }, 'Received Razorpay webhook');

  if (!orderId) {
    // Not an event we key off of (e.g. account/settlement events) - ack and ignore.
    return res.status(200).json({ success: true, message: 'Event ignored' });
  }

  const payment = await prisma.payment.findFirst({ where: { providerPaymentId: orderId } });
  if (!payment) {
    logger.warn({ orderId }, 'Razorpay webhook referenced an unknown order id');
    return res.status(200).json({ success: true, message: 'Unknown order, ignored' });
  }

  await settlePaymentResult(payment.bookingId, orderId);
  await recordAuditLog({
    action: `RAZORPAY_WEBHOOK_${event ?? 'UNKNOWN'}`,
    entityType: 'Booking',
    entityId: payment.bookingId,
    newValue: { orderId, event },
  });

  return res.status(200).json({ success: true, message: 'Webhook processed' });
});
