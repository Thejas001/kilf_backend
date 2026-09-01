import { Prisma, SponsorStatus, SponsorshipLevel } from '@prisma/client';
import { prisma } from '../config/prisma';

export interface SponsorListFilters {
  status?: SponsorStatus;
  sponsorshipLevel?: SponsorshipLevel;
  festivalId?: string;
  search?: string;
  skip: number;
  take: number;
}

function buildWhere(
  filters: Pick<SponsorListFilters, 'status' | 'sponsorshipLevel' | 'festivalId' | 'search'>
): Prisma.SponsorWhereInput {
  return {
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.sponsorshipLevel ? { sponsorshipLevel: filters.sponsorshipLevel } : {}),
    ...(filters.festivalId ? { festivalId: filters.festivalId } : {}),
    ...(filters.search ? { name: { contains: filters.search, mode: 'insensitive' } } : {}),
  };
}

export async function findMany(filters: SponsorListFilters) {
  const where = buildWhere(filters);
  const [items, total] = await Promise.all([
    prisma.sponsor.findMany({
      where,
      skip: filters.skip,
      take: filters.take,
      orderBy: [{ displayOrder: 'asc' }, { createdAt: 'desc' }],
    }),
    prisma.sponsor.count({ where }),
  ]);
  return { items, total };
}

export async function findById(id: string) {
  return prisma.sponsor.findUnique({ where: { id } });
}

export async function create(data: Prisma.SponsorUncheckedCreateInput) {
  return prisma.sponsor.create({ data });
}

export async function update(id: string, data: Prisma.SponsorUpdateInput) {
  return prisma.sponsor.update({ where: { id }, data });
}

export async function remove(id: string) {
  return prisma.sponsor.delete({ where: { id } });
}

export async function findActivePublic(festivalId?: string) {
  return prisma.sponsor.findMany({
    where: { status: 'ACTIVE', ...(festivalId ? { festivalId } : {}) },
    orderBy: [{ displayOrder: 'asc' }, { createdAt: 'desc' }],
  });
}
