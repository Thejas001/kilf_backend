import { z } from 'zod';

const ShowSessionStatusEnum = z.enum(['ACTIVE', 'INACTIVE']);

export const createShowSessionSchema = z.object({
  body: z.object({
    festivalId: z.string().uuid(),
    name: z.string().min(2).max(200),
    venue: z.string().max(200).optional(),
    startsAt: z.coerce.date(),
    totalSeats: z.coerce.number().int().positive(),
    status: ShowSessionStatusEnum.optional(),
  }),
});

export const updateShowSessionSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z.object({
    name: z.string().min(2).max(200).optional(),
    venue: z.string().max(200).optional(),
    startsAt: z.coerce.date().optional(),
    totalSeats: z.coerce.number().int().positive().optional(),
    status: ShowSessionStatusEnum.optional(),
  }),
});

export const showSessionIdParamSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
});

export const listShowSessionsSchema = z.object({
  query: z.object({
    festivalId: z.string().uuid().optional(),
  }),
});
