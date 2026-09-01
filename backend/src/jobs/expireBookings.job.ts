import { prisma } from '../config/prisma';
import { logger } from '../config/logger';

/**
 * Expires PENDING_PAYMENT bookings whose hold window has passed and
 * releases their reserved inventory back to the ticket pool.
 */
export async function expireStaleBookings(): Promise<number> {
  const staleBookings = await prisma.booking.findMany({
    where: { status: 'PENDING_PAYMENT', expiresAt: { lt: new Date() } },
    include: { bookingItems: true },
  });

  for (const booking of staleBookings) {
    await prisma.$transaction(async (tx) => {
      const current = await tx.booking.findUnique({ where: { id: booking.id } });
      if (!current || current.status !== 'PENDING_PAYMENT') return;

      for (const item of booking.bookingItems) {
        await tx.ticket.update({
          where: { id: item.ticketId },
          data: { availableQuantity: { increment: item.quantity } },
        });
      }

      await tx.booking.update({
        where: { id: booking.id },
        data: { status: 'EXPIRED', cancelledAt: new Date(), cancelReason: 'Payment hold expired' },
      });
    });
  }

  if (staleBookings.length > 0) {
    logger.info({ count: staleBookings.length }, 'Expired stale pending-payment bookings');
  }

  return staleBookings.length;
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
