import { Prisma } from '@prisma/client';

/**
 * Returns the show-session seats held by a booking's attendees to their
 * sessions. Call from every path that gives inventory back (payment failure,
 * cancellation, refund, hold expiry).
 */
export async function releaseShowSeats(tx: Prisma.TransactionClient, bookingId: string) {
  const attendees = await tx.bookingAttendee.findMany({
    where: { bookingItem: { bookingId }, showSessionId: { not: null } },
    select: { showSessionId: true },
  });

  const bySession = new Map<string, number>();
  for (const a of attendees) {
    bySession.set(a.showSessionId!, (bySession.get(a.showSessionId!) ?? 0) + 1);
  }

  for (const [showSessionId, count] of bySession) {
    await tx.showSession.update({
      where: { id: showSessionId },
      data: { availableSeats: { increment: count } },
    });
  }
}
