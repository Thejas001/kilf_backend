import { prisma } from '../config/prisma';
import { logger } from '../config/logger';
import { settlePaymentResult } from '../services/booking.service';
import { recordAuditLog } from '../services/auditLog.service';

const MINUTE = 60_000;

/**
 * Safety net for lost or delayed gateway webhooks. Re-asks the gateway about:
 *  1. bookings stuck in PENDING_PAYMENT for more than 3 minutes, and
 *  2. bookings that were expired/cancelled in the last 24 hours but whose
 *     payment never reached SUCCESS locally (customer may have paid late);
 *     these are re-checked at most every 30 minutes.
 * settlePaymentResult is idempotent, so overlap with webhooks is harmless.
 */
export async function reconcilePayments(): Promise<number> {
  const now = Date.now();
  const base = { providerPaymentId: { not: null }, provider: { not: 'MOCK' as const } };

  const payments = await prisma.payment.findMany({
    where: {
      ...base,
      status: { in: ['PENDING', 'FAILED'] },
      OR: [
        {
          booking: { status: 'PENDING_PAYMENT', createdAt: { lt: new Date(now - 3 * MINUTE) } },
          OR: [{ lastCheckedAt: null }, { lastCheckedAt: { lt: new Date(now - 2 * MINUTE) } }],
        },
        {
          booking: { status: { in: ['EXPIRED', 'CANCELLED'] }, createdAt: { gt: new Date(now - 24 * 60 * MINUTE) } },
          OR: [{ lastCheckedAt: null }, { lastCheckedAt: { lt: new Date(now - 30 * MINUTE) } }],
        },
      ],
    },
    orderBy: { createdAt: 'asc' },
    take: 100,
    include: { booking: { select: { status: true } } },
  });

  let changed = 0;
  for (const payment of payments) {
    try {
      const before = payment.booking.status;
      const after = await settlePaymentResult(payment.bookingId, payment.providerPaymentId!);
      if (after && after.status !== before) {
        changed += 1;
        await recordAuditLog({
          action: 'PAYMENT_RECONCILED',
          entityType: 'Booking',
          entityId: payment.bookingId,
          oldValue: { status: before },
          newValue: { status: after.status },
        });
      }
    } catch (err) {
      logger.error({ err, paymentId: payment.id }, 'Payment reconciliation failed for payment');
    }
  }

  if (changed > 0) logger.info({ checked: payments.length, changed }, 'Reconciled payments');
  return changed;
}

let intervalHandle: NodeJS.Timeout | null = null;

export function startReconcilePaymentsJob(intervalMs = 5 * MINUTE) {
  if (intervalHandle) return;
  intervalHandle = setInterval(() => {
    reconcilePayments().catch((err) => logger.error({ err }, 'reconcilePayments job failed'));
  }, intervalMs);
  intervalHandle.unref();
}

export function stopReconcilePaymentsJob() {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
  }
}
