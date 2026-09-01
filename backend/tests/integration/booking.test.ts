import request from 'supertest';
import { createApp } from '../../src/app';
import { prisma } from '../../src/config/prisma';
import { createAdmin, createFestival, createTicket, authHeader } from '../utils/factories';

const app = createApp();

function customerPayload(overrides: Partial<{ name: string; email: string; phone: string }> = {}) {
  return {
    name: overrides.name ?? 'John Doe',
    email: overrides.email ?? `john.${Date.now()}.${Math.random().toString(36).slice(2)}@example.com`,
    phone: overrides.phone ?? '+919876543210',
  };
}

describe('Booking flow', () => {
  it('creates a successful booking, decrements inventory, confirms and issues QR tickets', async () => {
    const festival = await createFestival();
    const ticket = await createTicket(festival.id, { price: 500, totalQuantity: 10, availableQuantity: 10 });

    const res = await request(app)
      .post('/api/bookings')
      .send({ ticketId: ticket.id, quantity: 2, customer: customerPayload() });

    expect(res.status).toBe(201);
    expect(res.body.data.booking.status).toBe('CONFIRMED');
    expect(Number(res.body.data.booking.totalAmount)).toBe(1000);
    expect(res.body.data.booking.bookingNumber).toMatch(/^KILF-\d{4}-\d{6}$/);

    const updatedTicket = await prisma.ticket.findUnique({ where: { id: ticket.id } });
    expect(updatedTicket?.availableQuantity).toBe(8);

    const instances = await prisma.ticketInstance.findMany({
      where: { booking: { bookingNumber: res.body.data.booking.bookingNumber } },
    });
    expect(instances).toHaveLength(2);
    expect(instances.every((i) => i.status === 'VALID' && i.qrCode.startsWith('data:image'))).toBe(true);
  });

  it('rejects a booking when quantity exceeds availability (prevents overselling)', async () => {
    const festival = await createFestival();
    const ticket = await createTicket(festival.id, { totalQuantity: 5, availableQuantity: 5 });

    const res = await request(app)
      .post('/api/bookings')
      .send({ ticketId: ticket.id, quantity: 10, customer: customerPayload() });

    expect(res.status).toBe(409);

    const updatedTicket = await prisma.ticket.findUnique({ where: { id: ticket.id } });
    expect(updatedTicket?.availableQuantity).toBe(5); // untouched
  });

  it('prevents two concurrent bookings from overselling the last ticket', async () => {
    const festival = await createFestival();
    const ticket = await createTicket(festival.id, { totalQuantity: 1, availableQuantity: 1 });

    const [resA, resB] = await Promise.all([
      request(app)
        .post('/api/bookings')
        .send({ ticketId: ticket.id, quantity: 1, customer: customerPayload({ email: 'a@example.com' }) }),
      request(app)
        .post('/api/bookings')
        .send({ ticketId: ticket.id, quantity: 1, customer: customerPayload({ email: 'b@example.com' }) }),
    ]);

    const statuses = [resA.status, resB.status].sort();
    expect(statuses).toEqual([201, 409]);

    const updatedTicket = await prisma.ticket.findUnique({ where: { id: ticket.id } });
    expect(updatedTicket?.availableQuantity).toBe(0);
  });

  it('marks the booking cancelled and releases inventory when payment fails', async () => {
    const festival = await createFestival();
    const ticket = await createTicket(festival.id, { totalQuantity: 5, availableQuantity: 5 });

    // MockPaymentProvider fails any customer email starting with "fail-".
    const res = await request(app)
      .post('/api/bookings')
      .send({
        ticketId: ticket.id,
        quantity: 1,
        customer: customerPayload({ email: 'fail-payment@example.com' }),
      });

    expect(res.status).toBe(201);
    expect(res.body.data.booking.status).toBe('CANCELLED');

    const updatedTicket = await prisma.ticket.findUnique({ where: { id: ticket.id } });
    expect(updatedTicket?.availableQuantity).toBe(5); // released back
  });

  it('cancels a confirmed booking and returns inventory', async () => {
    const { token } = await createAdmin();
    const festival = await createFestival();
    const ticket = await createTicket(festival.id, { totalQuantity: 5, availableQuantity: 5 });

    const bookingRes = await request(app)
      .post('/api/bookings')
      .send({ ticketId: ticket.id, quantity: 2, customer: customerPayload() });

    const booking = await prisma.booking.findUnique({
      where: { bookingNumber: bookingRes.body.data.booking.bookingNumber },
    });

    const cancelRes = await request(app)
      .patch(`/api/admin/bookings/${booking!.id}/status`)
      .set(authHeader(token))
      .send({ status: 'CANCELLED', reason: 'Customer requested cancellation' });

    expect(cancelRes.status).toBe(200);
    expect(cancelRes.body.data.status).toBe('CANCELLED');

    const updatedTicket = await prisma.ticket.findUnique({ where: { id: ticket.id } });
    expect(updatedTicket?.availableQuantity).toBe(5);
  });

  it('refunds a confirmed booking, returns inventory, and stops counting it as revenue', async () => {
    const { token } = await createAdmin();
    const festival = await createFestival();
    const ticket = await createTicket(festival.id, { price: 500, totalQuantity: 5, availableQuantity: 5 });

    const bookingRes = await request(app)
      .post('/api/bookings')
      .send({ ticketId: ticket.id, quantity: 2, customer: customerPayload() });
    expect(bookingRes.body.data.booking.status).toBe('CONFIRMED');

    const booking = await prisma.booking.findUnique({
      where: { bookingNumber: bookingRes.body.data.booking.bookingNumber },
    });

    const refundRes = await request(app)
      .post(`/api/admin/bookings/${booking!.id}/refund`)
      .set(authHeader(token))
      .send({ reason: 'Customer requested refund' });

    expect(refundRes.status).toBe(200);
    expect(refundRes.body.data.status).toBe('REFUNDED');

    const updatedTicket = await prisma.ticket.findUnique({ where: { id: ticket.id } });
    expect(updatedTicket?.availableQuantity).toBe(5);

    const summary = await request(app)
      .get('/api/admin/revenue/summary')
      .set(authHeader(token));
    expect(summary.body.data.netRevenue).toBe(0); // gross 1000 - refunds 1000
  });
});
