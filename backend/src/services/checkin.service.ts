import { Prisma } from '@prisma/client';
import { prisma } from '../config/prisma';
import { ApiError } from '../utils/ApiError';
import { toIstDate } from '../utils/istDate';

const instanceInclude = {
  ticket: {
    select: { id: true, name: true, ticketType: true, multiDay: true, requiresDate: true },
  },
  attendee: {
    select: {
      id: true,
      name: true,
      validDate: true,
      showSession: { select: { id: true, name: true, venue: true, startsAt: true } },
    },
  },
  booking: {
    select: {
      bookingNumber: true,
      status: true,
      customer: { select: { name: true, email: true } },
      festival: { select: { startDate: true, endDate: true } },
    },
  },
  checkIns: { orderBy: { checkedInAt: 'desc' as const } },
} satisfies Prisma.TicketInstanceInclude;

type LoadedInstance = Prisma.TicketInstanceGetPayload<{ include: typeof instanceInclude }>;

function sameDay(a: Date, b: Date) {
  return a.getTime() === b.getTime();
}

function fmt(date: Date) {
  return date.toISOString().slice(0, 10);
}

/**
 * Whether this ticket may be used on `today` (an IST calendar day), ignoring
 * whether it was already scanned. Returns the reason when it may not.
 */
function datePolicyViolation(instance: LoadedInstance, today: Date): string | null {
  const { ticket, attendee, booking } = instance;

  if (attendee?.validDate && !sameDay(attendee.validDate, today)) {
    return `Ticket is only valid on ${fmt(attendee.validDate)}`;
  }

  if (!ticket.multiDay && attendee?.showSession) {
    const showDay = toIstDate(attendee.showSession.startsAt);
    if (!sameDay(showDay, today)) {
      return `Ticket is only valid for the show on ${fmt(showDay)}`;
    }
  }

  if (ticket.multiDay) {
    const first = toIstDate(booking.festival.startDate);
    const last = toIstDate(booking.festival.endDate);
    if (today < first || today > last) {
      return `Ticket is only valid between ${fmt(first)} and ${fmt(last)}`;
    }
  }

  return null;
}

async function loadInstance(ticketNumber: string) {
  return prisma.ticketInstance.findUnique({ where: { ticketNumber }, include: instanceInclude });
}

export async function verifyTicket(ticketNumber: string, venue = '') {
  const instance = await loadInstance(ticketNumber);

  if (!instance) {
    return { valid: false, alreadyUsed: false, message: 'Ticket not found', ticket: null };
  }

  if (instance.booking.status !== 'CONFIRMED') {
    return {
      valid: false,
      alreadyUsed: false,
      message: 'Ticket belongs to a booking that is not confirmed',
      ticket: instance,
    };
  }

  if (instance.status === 'CANCELLED') {
    return { valid: false, alreadyUsed: false, message: 'Ticket has been cancelled', ticket: instance };
  }

  const today = toIstDate(new Date());
  const violation = datePolicyViolation(instance, today);
  if (violation) {
    return { valid: false, alreadyUsed: false, message: violation, ticket: instance };
  }

  if (instance.ticket.multiDay) {
    const scannedToday = instance.checkIns.find(
      (c) => sameDay(c.checkInDate, today) && c.venue === venue
    );
    if (scannedToday) {
      return {
        valid: true,
        alreadyUsed: true,
        message: `Ticket already checked in today at ${scannedToday.checkedInAt.toISOString()}`,
        ticket: instance,
      };
    }
    return { valid: true, alreadyUsed: false, message: 'Ticket is valid', ticket: instance };
  }

  if (instance.status === 'USED') {
    return {
      valid: true,
      alreadyUsed: true,
      message: `Ticket already checked in at ${instance.checkedInAt?.toISOString()}`,
      ticket: instance,
    };
  }

  return { valid: true, alreadyUsed: false, message: 'Ticket is valid', ticket: instance };
}

/**
 * Single-entry tickets flip to USED. Multi-day passes (Festival, Young Reader,
 * Elite) stay VALID and get one check-in row per day and venue instead.
 */
export async function checkInTicket(ticketNumber: string, adminId: string, venue = '') {
  const instance = await loadInstance(ticketNumber);

  if (!instance) throw ApiError.notFound('Ticket not found');
  if (instance.booking.status !== 'CONFIRMED') {
    throw ApiError.badRequest('Ticket belongs to a booking that is not confirmed');
  }
  if (instance.status === 'CANCELLED') {
    throw ApiError.badRequest('Ticket has been cancelled and cannot be checked in');
  }

  const today = toIstDate(new Date());
  const violation = datePolicyViolation(instance, today);
  if (violation) throw ApiError.badRequest(violation);

  if (!instance.ticket.multiDay) {
    if (instance.status === 'USED') {
      throw ApiError.conflict('Ticket has already been checked in');
    }
    return prisma.ticketInstance.update({
      where: { ticketNumber },
      data: { status: 'USED', checkedInAt: new Date(), checkedInById: adminId },
    });
  }

  try {
    await prisma.ticketCheckIn.create({
      data: {
        ticketInstanceId: instance.id,
        checkInDate: today,
        venue,
        checkedInById: adminId,
      },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      throw ApiError.conflict(
        venue ? `Ticket has already been checked in today at ${venue}` : 'Ticket has already been checked in today'
      );
    }
    throw err;
  }

  return prisma.ticketInstance.update({
    where: { ticketNumber },
    data: { checkedInAt: new Date(), checkedInById: adminId },
    include: { checkIns: { orderBy: { checkedInAt: 'desc' } } },
  });
}
