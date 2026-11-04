import request from 'supertest';
import { createApp } from '../../src/app';
import { prisma } from '../../src/config/prisma';
import { settlePaymentResult, refundBooking } from '../../src/services/booking.service';
import { createFestival, createTicket, attendees } from '../utils/factories';

const app = createApp();

let n = 0;
function customer() {
  n += 1;
  return { name: 'Late Payer', email: `late${n}.${Date.now()}@example.com`, phone: '+919876543210' };
}

async function book(ticketId: string) {
  const res = await request(app)
    .post('/api/bookings')
    .send({ ticketId, quantity: 1, attendees: attendees(1), customer: customer() });
  expect(res.status).toBe(201);
  const booking = await prisma.booking.findUniqueOrThrow({
    where: { id: res.body.data.booking.id },
    include: { payments: true },
  });
  return booking;
}

/**
 * Simulates the hold-expiry job having run before the (successful) payment was seen:
 * the booking is EXPIRED, the inventory is back in the pool, no tickets exist and the
 * local payment row is still PENDING - while the gateway (mock) says it was captured.
 */
async function simulateExpiredBeforePaymentSeen(bookingId: string, ticketId: string) {
  await prisma.ticketInstance.deleteMany({ where: { bookingId } });
  await prisma.ticket.update({ where: { id: ticketId }, data: { availableQuantity: { increment: 1 } } });
  await prisma.payment.updateMany({ where: { bookingId }, data: { status: 'PENDING' } });
  await prisma.booking.update({
    where: { id: bookingId },
    data: { status: 'EXPIRED', cancelledAt: new Date(), cancelReason: 'Payment hold expired' },
  });
}

describe('Late payment recovery', () => {
  it('confirms an expired booking when the payment was captured and inventory is still free', async () => {
    const festival = await createFestival();
    const ticket = await createTicket(festival.id, { price: 500, totalQuantity: 5, availableQuantity: 5 });
    const booking = await book(ticket.id);
    await simulateExpiredBeforePaymentSeen(booking.id, ticket.id);

    const settled = await settlePaymentResult(booking.id, booking.payments[0].providerPaymentId!);

    expect(settled?.status).toBe('CONFIRMED');
    expect(settled?.cancelReason).toBeNull();
    expect(settled?.ticketInstances).toHaveLength(1);
    expect(settled?.payments[0].status).toBe('SUCCESS');
    expect(settled?.payments[0].lastCheckedAt).not.toBeNull();
    expect((await prisma.ticket.findUniqueOrThrow({ where: { id: ticket.id } })).availableQuantity).toBe(4);

    // Idempotent: a duplicate webhook changes nothing.
    await settlePaymentResult(booking.id, booking.payments[0].providerPaymentId!);
    expect((await prisma.ticket.findUniqueOrThrow({ where: { id: ticket.id } })).availableQuantity).toBe(4);
    expect(await prisma.ticketInstance.count({ where: { bookingId: booking.id } })).toBe(1);
  });

  it('flags PAYMENT_REVIEW when the tickets sold out meanwhile, and a refund resolves it without touching inventory', async () => {
    const festival = await createFestival();
    const ticket = await createTicket(festival.id, { price: 500, totalQuantity: 1, availableQuantity: 1 });
    const late = await book(ticket.id);
    await simulateExpiredBeforePaymentSeen(late.id, ticket.id);

    // Someone else takes the freed ticket.
    await book(ticket.id);
    expect((await prisma.ticket.findUniqueOrThrow({ where: { id: ticket.id } })).availableQuantity).toBe(0);

    const settled = await settlePaymentResult(late.id, late.payments[0].providerPaymentId!);
    expect(settled?.status).toBe('PAYMENT_REVIEW');
    expect(settled?.ticketInstances).toHaveLength(0);
    expect(settled?.payments[0].status).toBe('SUCCESS');
    expect(settled?.cancelReason).toMatch(/refund the customer/);
    expect((await prisma.ticket.findUniqueOrThrow({ where: { id: ticket.id } })).availableQuantity).toBe(0);

    const refunded = await refundBooking(late.id, 'Sold out');
    expect(refunded.status).toBe('REFUNDED');
    expect((await prisma.ticket.findUniqueOrThrow({ where: { id: ticket.id } })).availableQuantity).toBe(0);
    expect((await prisma.payment.findFirstOrThrow({ where: { bookingId: late.id } })).status).toBe('REFUNDED');
  });
});
