import { z } from 'zod';

const SponsorshipLevelEnum = z.enum(['TITLE', 'PLATINUM', 'GOLD', 'SILVER', 'BRONZE', 'PARTNER']);
const SponsorStatusEnum = z.enum(['ACTIVE', 'INACTIVE']);

export const createSponsorSchema = z.object({
  body: z.object({
    festivalId: z.string().uuid().optional(),
    name: z.string().min(2).max(200),
    description: z.string().max(2000).optional(),
    logoUrl: z.string().optional(),
    websiteUrl: z.string().url().optional().or(z.literal('')),
    contactName: z.string().max(200).optional(),
    contactEmail: z.string().email().optional().or(z.literal('')),
    contactPhone: z.string().max(20).optional(),
    sponsorshipLevel: SponsorshipLevelEnum.default('PARTNER'),
    amount: z.coerce.number().nonnegative().optional(),
    status: SponsorStatusEnum.optional(),
    displayOrder: z.coerce.number().int().optional(),
  }),
});

export const updateSponsorSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z.object({
    festivalId: z.string().uuid().optional(),
    name: z.string().min(2).max(200).optional(),
    description: z.string().max(2000).optional(),
    logoUrl: z.string().optional(),
    websiteUrl: z.string().url().optional().or(z.literal('')),
    contactName: z.string().max(200).optional(),
    contactEmail: z.string().email().optional().or(z.literal('')),
    contactPhone: z.string().max(20).optional(),
    sponsorshipLevel: SponsorshipLevelEnum.optional(),
    amount: z.coerce.number().nonnegative().optional(),
    status: SponsorStatusEnum.optional(),
    displayOrder: z.coerce.number().int().optional(),
  }),
});

export const sponsorIdParamSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
});

export const listSponsorsSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().optional(),
    status: SponsorStatusEnum.optional(),
    sponsorshipLevel: SponsorshipLevelEnum.optional(),
    festivalId: z.string().uuid().optional(),
    search: z.string().optional(),
  }),
});

export const updateSponsorStatusSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z.object({ status: SponsorStatusEnum }),
});
