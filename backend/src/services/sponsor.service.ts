import { SponsorStatus, SponsorshipLevel } from '@prisma/client';
import * as sponsorRepository from '../repositories/sponsor.repository';
import { ApiError } from '../utils/ApiError';
import { buildPagination } from '../utils/apiResponse';

export interface ListSponsorsParams {
  page: number;
  limit: number;
  status?: SponsorStatus;
  sponsorshipLevel?: SponsorshipLevel;
  festivalId?: string;
  search?: string;
}

export async function listSponsors(params: ListSponsorsParams) {
  const skip = (params.page - 1) * params.limit;
  const { items, total } = await sponsorRepository.findMany({ ...params, skip, take: params.limit });
  return { items, pagination: buildPagination(params.page, params.limit, total) };
}

export async function getSponsor(id: string) {
  const sponsor = await sponsorRepository.findById(id);
  if (!sponsor) throw ApiError.notFound('Sponsor not found');
  return sponsor;
}

export async function createSponsor(data: Record<string, unknown>) {
  return sponsorRepository.create({
    festivalId: (data.festivalId as string) || null,
    name: data.name as string,
    description: data.description as string | undefined,
    logoUrl: (data.logoUrl as string) || undefined,
    websiteUrl: (data.websiteUrl as string) || undefined,
    contactName: data.contactName as string | undefined,
    contactEmail: (data.contactEmail as string) || undefined,
    contactPhone: data.contactPhone as string | undefined,
    sponsorshipLevel: (data.sponsorshipLevel as SponsorshipLevel) ?? 'PARTNER',
    amount: data.amount as number | undefined,
    status: (data.status as SponsorStatus) ?? 'ACTIVE',
    displayOrder: (data.displayOrder as number) ?? 0,
  });
}

export async function updateSponsor(id: string, data: Record<string, unknown>) {
  await getSponsor(id);
  return sponsorRepository.update(id, data as any);
}

export async function deleteSponsor(id: string) {
  await getSponsor(id);
  return sponsorRepository.remove(id);
}

export async function updateStatus(id: string, status: SponsorStatus) {
  await getSponsor(id);
  return sponsorRepository.update(id, { status });
}

// ---- Public ----

export async function listPublicSponsors(festivalId?: string) {
  return sponsorRepository.findActivePublic(festivalId);
}
