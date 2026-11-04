import { z } from 'zod';

export const verifyTicketSchema = z.object({
  body: z.object({
    ticketNumber: z.string().min(1, 'ticketNumber is required'),
    /** Gate or venue being scanned at; multi-day passes check in once per day per venue. */
    venue: z.string().trim().max(100).optional(),
  }),
});

export const checkInTicketSchema = z.object({
  body: z.object({
    ticketNumber: z.string().min(1, 'ticketNumber is required'),
    venue: z.string().trim().max(100).optional(),
  }),
});
