import { Prisma, FestivalStatus } from '@prisma/client';
import { prisma } from '../config/prisma';

export interface FestivalListFilters {
  status?: FestivalStatus;
  search?: string;
  sortBy?: 'name' | 'startDate' | 'endDate' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
  skip: number;
  take: number;
}

function buildWhere(filters: Pick<FestivalListFilters, 'status' | 'search'>): Prisma.FestivalWhereInput {
  return {
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.search
      ? {
          OR: [
            { name: { contains: filters.search, mode: 'insensitive' } },
            { location: { contains: filters.search, mode: 'insensitive' } },
            { venue: { contains: filters.search, mode: 'insensitive' } },
          ],
        }
      : {}),
  };
}

export async function findMany(filters: FestivalListFilters) {
  const where = buildWhere(filters);
  const [items, total] = await Promise.all([
    prisma.festival.findMany({
      where,
      skip: filters.skip,
      take: filters.take,
      orderBy: { [filters.sortBy ?? 'createdAt']: filters.sortOrder ?? 'desc' },
      include: { _count: { select: { tickets: true, bookings: true, sponsors: true } } },
    }),
    prisma.festival.count({ where }),
  ]);
  return { items, total };
}

export async function findById(id: string) {
  return prisma.festival.findUnique({
    where: { id },
    include: { _count: { select: { tickets: true, bookings: true, sponsors: true } } },
  });
}

export async function create(data: Prisma.FestivalCreateInput) {
  return prisma.festival.create({ data });
}

export async function update(id: string, data: Prisma.FestivalUpdateInput) {
  return prisma.festival.update({ where: { id }, data });
}

export async function remove(id: string) {
  return prisma.festival.delete({ where: { id } });
}
