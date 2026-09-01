import { prisma } from '../config/prisma';
import { ApiError } from '../utils/ApiError';

export async function verifyTicket(ticketNumber: string) {
  const instance = await prisma.ticketInstance.findUnique({
    where: { ticketNumber },
    include: {
      ticket: { select: { id: true, name: true, ticketType: true } },
      booking: {
        select: {
          bookingNumber: true,
          status: true,
          customer: { select: { name: true, email: true } },
        },
      },
    },
  });

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

export async function checkInTicket(ticketNumber: string, adminId: string) {
  const instance = await prisma.ticketInstance.findUnique({
    where: { ticketNumber },
    include: { booking: true },
  });

  if (!instance) throw ApiError.notFound('Ticket not found');
  if (instance.booking.status !== 'CONFIRMED') {
    throw ApiError.badRequest('Ticket belongs to a booking that is not confirmed');
  }
  if (instance.status === 'CANCELLED') {
    throw ApiError.badRequest('Ticket has been cancelled and cannot be checked in');
  }
  if (instance.status === 'USED') {
    throw ApiError.conflict('Ticket has already been checked in');
  }

  return prisma.ticketInstance.update({
    where: { ticketNumber },
    data: { status: 'USED', checkedInAt: new Date(), checkedInById: adminId },
  });
}
