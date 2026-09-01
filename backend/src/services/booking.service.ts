import { Prisma, BookingStatus } from '@prisma/client';
import { prisma } from '../config/prisma';
import { ApiError } from '../utils/ApiError';
import { buildPagination } from '../utils/apiResponse';
import { generateBookingNumber, generateTicketNumber } from '../utils/idGenerators';
import { generateQrCodeDataUrl } from './qrcode.service';
import { paymentProvider } from './payment';
import * as bookingRepository from '../repositories/booking.repository';
import { env } from '../config/env';

export interface CreateBookingInput {
  ticketId: string;
  quantity: number;
  customer: { name: string; email: string; phone: string };
}

const MAX_BOOKING_NUMBER_RETRIES = 5;

/**
 * Reserves inventory and creates a PENDING_PAYMENT booking.
 *
 * Concurrency safety: `SELECT ... FOR UPDATE` takes a row lock on the
 * ticket for the lifetime of the transaction, so two simultaneous requests
 * for the last ticket serialize on this row - the second request sees the
 * decremented `availableQuantity` and is rejected before any inventory can
 * go negative. The subsequent conditional `updateMany` (WHERE availableQuantity
 * >= quantity) is a defense-in-depth atomic guard against overselling.
 */
async function reserveInventoryAndCreateBooking(input: CreateBookingInput) {
  return prisma.$transaction(async (tx) => {
    // Ticket ids are stored as TEXT (Prisma's default for `String @id`), not native uuid.
    await tx.$executeRaw`SELECT id FROM tickets WHERE id = ${input.ticketId} FOR UPDATE`;

    const ticket = await tx.ticket.findUnique({ where: { id: input.ticketId } });
    if (!ticket) {
      throw ApiError.notFound('Ticket not found');
    }

    const now = new Date();
    if (ticket.status !== 'ACTIVE') {
      throw ApiError.badRequest('This ticket is not available for sale');
    }
    if (ticket.salesStart > now) {
      throw ApiError.badRequest('Ticket sales have not started yet');
    }
    if (ticket.salesEnd < now) {
      throw ApiError.badRequest('Ticket sales have ended');
    }
    if (ticket.availableQuantity < input.quantity) {
      throw ApiError.conflict(
        `Only ${ticket.availableQuantity} ticket(s) left, cannot book ${input.quantity}`
      );
    }

    const decremented = await tx.ticket.updateMany({
      where: { id: input.ticketId, availableQuantity: { gte: input.quantity } },
      data: { availableQuantity: { decrement: input.quantity } },
    });
    if (decremented.count === 0) {
      throw ApiError.conflict('Ticket became unavailable while processing your booking');
    }

    const customer = await tx.customer.upsert({
      where: { email: input.customer.email.toLowerCase() },
      update: { name: input.customer.name, phone: input.customer.phone },
      create: {
        name: input.customer.name,
        email: input.customer.email.toLowerCase(),
        phone: input.customer.phone,
      },
    });

    const unitPrice = ticket.price;
    const totalAmount = unitPrice.mul(input.quantity);
    const expiresAt = new Date(Date.now() + env.BOOKING_HOLD_MINUTES * 60 * 1000);

    let booking;
    let attempt = 0;
    for (;;) {
      attempt += 1;
      const bookingNumber = generateBookingNumber();
      try {
        booking = await tx.booking.create({
          data: {
            bookingNumber,
            festivalId: ticket.festivalId,
            customerId: customer.id,
            status: 'PENDING_PAYMENT',
            quantity: input.quantity,
            totalAmount,
            currency: ticket.currency,
            expiresAt,
            bookingItems: {
              create: [
                {
                  ticketId: ticket.id,
                  quantity: input.quantity,
                  unitPrice,
                  subtotal: totalAmount,
                },
              ],
            },
          },
          include: { bookingItems: true, customer: true },
        });
        break;
      } catch (err) {
        if (
          err instanceof Prisma.PrismaClientKnownRequestError &&
          err.code === 'P2002' &&
          attempt < MAX_BOOKING_NUMBER_RETRIES
        ) {
          continue; // extremely rare booking number collision - retry with a new random number
        }
        throw err;
      }
    }

    return booking;
  });
}

async function releaseInventory(
  tx: Prisma.TransactionClient,
  items: { ticketId: string; quantity: number }[]
) {
  for (const item of items) {
    await tx.ticket.update({
      where: { id: item.ticketId },
      data: { availableQuantity: { increment: item.quantity } },
    });
  }
}

async function issueTicketInstances(
  tx: Prisma.TransactionClient,
  bookingId: string,
  bookingItems: { id: string; ticketId: string; quantity: number }[]
) {
  for (const item of bookingItems) {
    for (let i = 0; i < item.quantity; i += 1) {
      const ticketNumber = generateTicketNumber();
      const qrCode = await generateQrCodeDataUrl(ticketNumber);
      await tx.ticketInstance.create({
        data: {
          bookingId,
          bookingItemId: item.id,
          ticketId: item.ticketId,
          ticketNumber,
          qrCode,
          status: 'VALID',
        },
      });
    }
  }
}

/**
 * Creates a booking end-to-end: reserve inventory, create the payment
 * intent with the active PaymentProvider, then verify that payment on the
 * server (never trusting a client-supplied "it succeeded") before
 * confirming the booking and issuing QR ticket instances.
 */
const PROVIDER_NAME_TO_ENUM: Record<string, Prisma.PaymentUncheckedCreateInput['provider']> = {
  mock: 'MOCK',
  razorpay: 'RAZORPAY',
  stripe: 'STRIPE',
};

export async function createBooking(input: CreateBookingInput) {
  const booking = await reserveInventoryAndCreateBooking(input);

  const paymentResult = await paymentProvider.createPayment({
    bookingId: booking.id,
    bookingNumber: booking.bookingNumber,
    amount: Number(booking.totalAmount),
    currency: booking.currency,
    customerEmail: booking.customer.email,
  });

  await prisma.payment.create({
    data: {
      bookingId: booking.id,
      provider: PROVIDER_NAME_TO_ENUM[paymentProvider.name] ?? 'MOCK',
      providerPaymentId: paymentResult.providerPaymentId,
      amount: booking.totalAmount,
      currency: booking.currency,
      status: paymentResult.status,
      rawResponse: paymentResult.raw as Prisma.InputJsonValue,
    },
  });

  const finalBooking = await settlePaymentResult(booking.id, paymentResult.providerPaymentId);
  // `payment` carries whatever the client needs to complete checkout with the
  // active gateway (e.g. Razorpay's order id + publishable key id). For the
  // mock provider it's inert, since the mock settles synchronously above.
  return { booking: finalBooking, payment: paymentResult };
}

/**
 * Verifies a payment on the backend (via PaymentProvider.verifyPayment) and
 * settles the booking accordingly. Called synchronously right after
 * creating a mock payment, and also exposed as a standalone confirm
 * endpoint for gateways where payment completion happens asynchronously
 * (redirect/webhook).
 */
export async function settlePaymentResult(bookingId: string, providerPaymentId: string) {
  const verification = await paymentProvider.verifyPayment({ providerPaymentId });

  return prisma.$transaction(async (tx) => {
    const booking = await tx.booking.findUnique({
      where: { id: bookingId },
      include: { bookingItems: true, customer: true, payments: true },
    });
    if (!booking) throw ApiError.notFound('Booking not found');

    // Idempotent: if already settled, just return current state.
    if (booking.status !== 'PENDING_PAYMENT') {
      return tx.booking.findUnique({
        where: { id: bookingId },
        include: { bookingItems: true, customer: true, payments: true, ticketInstances: true },
      });
    }

    const payment = booking.payments.find((p) => p.providerPaymentId === providerPaymentId);
    if (payment) {
      await tx.payment.update({
        where: { id: payment.id },
        data: { status: verification.status },
      });
    }

    if (verification.status === 'SUCCESS') {
      await tx.booking.update({ where: { id: bookingId }, data: { status: 'CONFIRMED' } });
      await issueTicketInstances(tx, bookingId, booking.bookingItems);
    } else if (verification.status === 'FAILED') {
      await releaseInventory(
        tx,
        booking.bookingItems.map((i) => ({ ticketId: i.ticketId, quantity: i.quantity }))
      );
      await tx.booking.update({
        where: { id: bookingId },
        data: { status: 'CANCELLED', cancelledAt: new Date(), cancelReason: 'Payment failed' },
      });
    }
    // PENDING: leave booking as PENDING_PAYMENT for the client to retry/poll.

    return tx.booking.findUnique({
      where: { id: bookingId },
      include: { bookingItems: true, customer: true, payments: true, ticketInstances: true },
    });
  });
}

export async function confirmPaymentByBookingNumber(bookingNumber: string) {
  const booking = await bookingRepository.findByBookingNumber(bookingNumber);
  if (!booking) throw ApiError.notFound('Booking not found');

  const latestPayment = booking.payments[0];
  if (!latestPayment) throw ApiError.badRequest('No payment found for this booking');

  return settlePaymentResult(booking.id, latestPayment.providerPaymentId!);
}

export interface ListBookingsParams {
  page: number;
  limit: number;
  status?: BookingStatus;
  ticketId?: string;
  festivalId?: string;
  search?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

export async function listBookings(params: ListBookingsParams) {
  const skip = (params.page - 1) * params.limit;
  const { items, total } = await bookingRepository.findMany({ ...params, skip, take: params.limit });
  return { items, pagination: buildPagination(params.page, params.limit, total) };
}

export async function exportBookingsCsv(params: Omit<ListBookingsParams, 'page' | 'limit'>) {
  return bookingRepository.findAllForExport(params);
}

export async function getBooking(id: string) {
  const booking = await bookingRepository.findById(id);
  if (!booking) throw ApiError.notFound('Booking not found');
  return booking;
}

export async function getBookingByNumberForCustomer(bookingNumber: string, email: string) {
  const booking = await bookingRepository.findByBookingNumber(bookingNumber);
  if (!booking || booking.customer.email.toLowerCase() !== email.toLowerCase()) {
    throw ApiError.notFound('Booking not found');
  }
  return booking;
}

/** Cancels a booking per the festival's cancellation policy and returns inventory. */
export async function cancelBooking(id: string, reason?: string) {
  return prisma.$transaction(async (tx) => {
    const booking = await tx.booking.findUnique({ where: { id }, include: { bookingItems: true } });
    if (!booking) throw ApiError.notFound('Booking not found');

    if (!['PENDING_PAYMENT', 'CONFIRMED'].includes(booking.status)) {
      throw ApiError.badRequest(`Cannot cancel a booking with status ${booking.status}`);
    }

    await releaseInventory(
      tx,
      booking.bookingItems.map((i) => ({ ticketId: i.ticketId, quantity: i.quantity }))
    );

    await tx.ticketInstance.updateMany({
      where: { bookingId: id, status: 'VALID' },
      data: { status: 'CANCELLED' },
    });

    return tx.booking.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
        cancelReason: reason ?? 'Cancelled by admin',
      },
    });
  });
}

/** Refunds a confirmed booking's successful payment and returns inventory. */
export async function refundBooking(id: string, reason?: string) {
  const booking = await bookingRepository.findById(id);
  if (!booking) throw ApiError.notFound('Booking not found');
  if (booking.status !== 'CONFIRMED') {
    throw ApiError.badRequest('Only confirmed bookings can be refunded');
  }

  const successfulPayment = booking.payments.find((p) => p.status === 'SUCCESS');
  if (!successfulPayment || !successfulPayment.providerPaymentId) {
    throw ApiError.badRequest('No successful payment found for this booking');
  }

  const refundResult = await paymentProvider.refundPayment({
    providerPaymentId: successfulPayment.providerPaymentId,
    amount: Number(successfulPayment.amount),
    reason,
  });

  if (refundResult.status !== 'SUCCESS') {
    throw ApiError.badRequest('Refund could not be processed by the payment provider');
  }

  return prisma.$transaction(async (tx) => {
    await tx.payment.update({
      where: { id: successfulPayment.id },
      data: { status: 'REFUNDED', refundedAmount: successfulPayment.amount },
    });

    await releaseInventory(
      tx,
      booking.bookingItems.map((i) => ({ ticketId: i.ticketId, quantity: i.quantity }))
    );

    await tx.ticketInstance.updateMany({
      where: { bookingId: id, status: 'VALID' },
      data: { status: 'CANCELLED' },
    });

    return tx.booking.update({
      where: { id },
      data: {
        status: 'REFUNDED',
        cancelledAt: new Date(),
        cancelReason: reason ?? 'Refunded by admin',
      },
    });
  });
}
