import request from 'supertest';
import { createApp } from '../../src/app';
import { prisma } from '../../src/config/prisma';
import { createAdmin, createFestival, createTicket, authHeader } from '../utils/factories';

const app = createApp();

describe('Ticket verification / check-in', () => {
  async function bookOneTicket() {
    const festival = await createFestival();
    const ticket = await createTicket(festival.id, { totalQuantity: 5, availableQuantity: 5 });
    const bookingRes = await request(app)
      .post('/api/bookings')
      .send({
        ticketId: ticket.id,
        quantity: 1,
        customer: { name: 'Scan Me', email: `scan.${Date.now()}@example.com`, phone: '+919876543210' },
      });
    const instance = await prisma.ticketInstance.findFirstOrThrow({
      where: { booking: { bookingNumber: bookingRes.body.data.booking.bookingNumber } },
    });
    return instance;
  }

  it('verifies a valid, not-yet-used ticket', async () => {
    const { token } = await createAdmin();
    const instance = await bookOneTicket();

    const res = await request(app)
      .post('/api/admin/tickets/verify')
      .set(authHeader(token))
      .send({ ticketNumber: instance.ticketNumber });

    expect(res.status).toBe(200);
    expect(res.body.data.valid).toBe(true);
    expect(res.body.data.alreadyUsed).toBe(false);
  });

  it('checks in a valid ticket and rejects a second check-in', async () => {
    const { token } = await createAdmin();
    const instance = await bookOneTicket();

    const first = await request(app)
      .post('/api/admin/tickets/check-in')
      .set(authHeader(token))
      .send({ ticketNumber: instance.ticketNumber });
    expect(first.status).toBe(200);
    expect(first.body.data.status).toBe('USED');

    const second = await request(app)
      .post('/api/admin/tickets/check-in')
      .set(authHeader(token))
      .send({ ticketNumber: instance.ticketNumber });
    expect(second.status).toBe(409);

    const verifyAfter = await request(app)
      .post('/api/admin/tickets/verify')
      .set(authHeader(token))
      .send({ ticketNumber: instance.ticketNumber });
    expect(verifyAfter.body.data.alreadyUsed).toBe(true);
  });

  it('reports an unknown ticket number as invalid', async () => {
    const { token } = await createAdmin();
    const res = await request(app)
      .post('/api/admin/tickets/verify')
      .set(authHeader(token))
      .send({ ticketNumber: 'LF-2026-999999' });

    expect(res.status).toBe(200);
    expect(res.body.data.valid).toBe(false);
  });
});
