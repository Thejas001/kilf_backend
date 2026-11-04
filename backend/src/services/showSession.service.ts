import { ShowSessionStatus } from '@prisma/client';
import { prisma } from '../config/prisma';
import { ApiError } from '../utils/ApiError';
import { getFestival } from './festival.service';

export async function listShowSessions(filters: { festivalId?: string; onlyBookable?: boolean }) {
  return prisma.showSession.findMany({
    where: {
      ...(filters.festivalId ? { festivalId: filters.festivalId } : {}),
      ...(filters.onlyBookable
        ? { status: 'ACTIVE' as const, startsAt: { gt: new Date() }, availableSeats: { gt: 0 } }
        : {}),
    },
    orderBy: { startsAt: 'asc' },
  });
}

export async function getShowSession(id: string) {
  const session = await prisma.showSession.findUnique({ where: { id } });
  if (!session) throw ApiError.notFound('Show session not found');
  return session;
}

export async function createShowSession(data: {
  festivalId: string;
  name: string;
  venue?: string;
  startsAt: Date;
  totalSeats: number;
  status?: ShowSessionStatus;
}) {
  await getFestival(data.festivalId);
  return prisma.showSession.create({
    data: {
      festivalId: data.festivalId,
      name: data.name,
      venue: data.venue,
      startsAt: data.startsAt,
      totalSeats: data.totalSeats,
      availableSeats: data.totalSeats,
      status: data.status ?? 'ACTIVE',
    },
  });
}

export async function updateShowSession(
  id: string,
  data: Partial<{
    name: string;
    venue: string;
    startsAt: Date;
    totalSeats: number;
    status: ShowSessionStatus;
  }>
) {
  const session = await getShowSession(id);
  const updateData: Record<string, unknown> = { ...data };

  if (data.totalSeats !== undefined && data.totalSeats !== session.totalSeats) {
    const booked = session.totalSeats - session.availableSeats;
    if (data.totalSeats < booked) {
      throw ApiError.badRequest(`Cannot reduce seats below the ${booked} already booked`);
    }
    updateData.availableSeats = data.totalSeats - booked;
  }

  return prisma.showSession.update({ where: { id }, data: updateData });
}

export async function deleteShowSession(id: string) {
  const session = await getShowSession(id);
  if (session.totalSeats !== session.availableSeats) {
    throw ApiError.conflict('Cannot delete a show session that already has bookings');
  }
  return prisma.showSession.delete({ where: { id } });
}
