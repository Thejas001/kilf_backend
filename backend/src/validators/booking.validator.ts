import { z } from 'zod';

const BookingStatusEnum = z.enum(['PENDING_PAYMENT', 'CONFIRMED', 'CANCELLED', 'REFUNDED', 'EXPIRED']);

export const createBookingSchema = z.object({
  body: z.object({
    ticketId: z.string().uuid(),
    quantity: z.coerce.number().int().positive().max(20, 'Maximum 20 tickets per booking'),
    customer: z.object({
      name: z.string().min(2).max(200),
      email: z.string().email(),
      phone: z.string().min(6).max(20),
    }),
  }),
});

export const confirmPaymentSchema = z.object({
  params: z.object({ bookingNumber: z.string().min(1) }),
});

export const publicBookingLookupSchema = z.object({
  params: z.object({ bookingNumber: z.string().min(1) }),
  query: z.object({ email: z.string().email() }),
});

export const listBookingsSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().optional(),
    status: BookingStatusEnum.optional(),
    ticketId: z.string().uuid().optional(),
    festivalId: z.string().uuid().optional(),
    search: z.string().optional(),
    dateFrom: z.coerce.date().optional(),
    dateTo: z.coerce.date().optional(),
  }),
});

export const bookingIdParamSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
});

export const updateBookingStatusSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z.object({
    status: z.enum(['CANCELLED']),
    reason: z.string().max(500).optional(),
  }),
});

export const refundBookingSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z.object({
    reason: z.string().max(500).optional(),
  }),
});
