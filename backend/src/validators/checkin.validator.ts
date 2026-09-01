import { z } from 'zod';

export const verifyTicketSchema = z.object({
  body: z.object({
    ticketNumber: z.string().min(1, 'ticketNumber is required'),
  }),
});

export const checkInTicketSchema = z.object({
  body: z.object({
    ticketNumber: z.string().min(1, 'ticketNumber is required'),
  }),
});
