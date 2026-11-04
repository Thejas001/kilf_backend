import { prisma } from '../config/prisma';
import { logger } from '../config/logger';
import { releaseShowSeats } from '../services/showSeats';
import { settlePaymentResult } from '../services/booking.service';

/**
 * Expires PENDING_PAYMENT bookings whose hold window has passed and
 * releases their reserved inventory back to the ticket pool.
 *
 * Before expiring, the gateway is asked what happened to the payment: a
 * customer who paid in the last seconds of the hold (slow network, delayed
 * webhook) must be confirmed, not expired. If the gateway cannot be reached
 * the booking is left alone and retried on the next run.
 */
export async function expireStaleBookings(): Promise<number> {
  const staleBookings = await prisma.booking.findMany({
    where: { status: 'PENDING_PAYMENT', expiresAt: { lt: new Date() } },
    include: { bookingItems: true, payments: { orderBy: { createdAt: 'desc' } } },
  });

  let expired = 0;
  for (const booking of staleBookings) {
    try {
      let settled = false;
      for (const payment of booking.payments) {
        if (!payment.providerPaymentId) continue;
        const result = await settlePaymentResult(booking.id, payment.providerPaymentId);
        if (result && result.status !== 'PENDING_PAYMENT') {
          settled = true;
          break;
        }
      }
      if (settled) continue;

      await prisma.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT id FROM bookings WHERE id = ${booking.id} FOR UPDATE`;
        const current = await tx.booking.findUnique({ where: { id: booking.id } });
        if (!current || current.status !== 'PENDING_PAYMENT') return;

        for (const item of booking.bookingItems) {
          await tx.ticket.update({
            where: { id: item.ticketId },
            data: { availableQuantity: { increment: item.quantity } },
          });
        }

        await releaseShowSeats(tx, booking.id);

        await tx.booking.update({
          where: { id: booking.id },
          data: { status: 'EXPIRED', cancelledAt: new Date(), cancelReason: 'Payment hold expired' },
        });
        expired += 1;
      });
    } catch (err) {
      logger.error({ err, bookingId: booking.id }, 'Could not expire booking; will retry');
    }
  }

  if (expired > 0) {
    logger.info({ count: expired }, 'Expired stale pending-payment bookings');
  }

  return expired;
}

let intervalHandle: NodeJS.Timeout | null = null;

export function startExpireBookingsJob(intervalMs = 60_000) {
  if (intervalHandle) return;
  intervalHandle = setInterval(() => {
    expireStaleBookings().catch((err) => logger.error({ err }, 'expireStaleBookings job failed'));
  }, intervalMs);
  intervalHandle.unref();
}

export function stopExpireBookingsJob() {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
  }
}
