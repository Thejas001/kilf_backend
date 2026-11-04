import { z } from 'zod';

const BookingStatusEnum = z.enum(['PENDING_PAYMENT', 'CONFIRMED', 'CANCELLED', 'REFUNDED', 'EXPIRED', 'PAYMENT_REVIEW']);

const attendeeSchema = z.object({
  name: z.string().min(2).max(200),
  email: z.string().email().optional(),
  phone: z.string().min(6).max(20).optional(),
  dateOfBirth: z.coerce.date().optional(),
  /** Festival day this ticket is for (Day Pass). */
  validDate: z.coerce.date().optional(),
  /** Show the attendee is booked into (Khasak show, Elite). */
  showSessionId: z.string().uuid().optional(),
});

export const createBookingSchema = z.object({
  body: z
    .object({
      ticketId: z.string().uuid(),
      /** Optional; when sent it must equal attendees.length. */
      quantity: z.coerce.number().int().positive().optional(),
      customer: z.object({
        name: z.string().min(2).max(200),
        email: z.string().email(),
        phone: z.string().min(6).max(20),
      }),
      /** One entry per ticket: the person who will attend. */
      attendees: z.array(attendeeSchema).min(1).max(20, 'Maximum 20 tickets per booking'),
    })
    .refine((d) => d.quantity === undefined || d.quantity === d.attendees.length, {
      message: 'quantity must match the number of attendees',
      path: ['quantity'],
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
