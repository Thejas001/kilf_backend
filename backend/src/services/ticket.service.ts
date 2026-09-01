import { TicketSaleStatus, TicketType } from '@prisma/client';
import * as ticketRepository from '../repositories/ticket.repository';
import { getFestival } from './festival.service';
import { ApiError } from '../utils/ApiError';
import { buildPagination } from '../utils/apiResponse';

export interface ListTicketsParams {
  page: number;
  limit: number;
  festivalId?: string;
  status?: TicketSaleStatus;
  ticketType?: TicketType;
  search?: string;
}

export async function listTickets(params: ListTicketsParams) {
  const skip = (params.page - 1) * params.limit;
  const { items, total } = await ticketRepository.findMany({
    festivalId: params.festivalId,
    status: params.status,
    ticketType: params.ticketType,
    search: params.search,
    skip,
    take: params.limit,
  });
  return { items, pagination: buildPagination(params.page, params.limit, total) };
}

export async function getTicket(id: string) {
  const ticket = await ticketRepository.findById(id);
  if (!ticket) throw ApiError.notFound('Ticket not found');
  return ticket;
}

export async function getTicketWithInventory(id: string) {
  const ticket = await getTicket(id);
  const { ticketsSold, revenue } = await ticketRepository.getTicketRevenue(id);
  const utilization = ticket.totalQuantity > 0 ? (ticketsSold / ticket.totalQuantity) * 100 : 0;
  return {
    ...ticket,
    ticketsSold,
    revenue,
    utilizationPercentage: Number(utilization.toFixed(2)),
  };
}

export async function createTicket(data: {
  festivalId: string;
  name: string;
  description?: string;
  ticketType: TicketType;
  price: number;
  currency: string;
  totalQuantity: number;
  salesStart: Date;
  salesEnd: Date;
  status?: TicketSaleStatus;
}) {
  await getFestival(data.festivalId); // ensures festival exists

  return ticketRepository.create({
    festivalId: data.festivalId,
    name: data.name,
    description: data.description,
    ticketType: data.ticketType,
    price: data.price,
    currency: data.currency,
    totalQuantity: data.totalQuantity,
    availableQuantity: data.totalQuantity,
    salesStart: data.salesStart,
    salesEnd: data.salesEnd,
    status: data.status ?? 'ACTIVE',
  });
}

export async function updateTicket(
  id: string,
  data: Partial<{
    name: string;
    description: string;
    ticketType: TicketType;
    price: number;
    currency: string;
    totalQuantity: number;
    salesStart: Date;
    salesEnd: Date;
    status: TicketSaleStatus;
  }>
) {
  const ticket = await getTicket(id);
  const updateData: Record<string, unknown> = { ...data };

  if (data.totalQuantity !== undefined && data.totalQuantity !== ticket.totalQuantity) {
    const sold = ticket.totalQuantity - ticket.availableQuantity;
    const newAvailable = data.totalQuantity - sold;
    if (newAvailable < 0) {
      throw ApiError.badRequest(
        `Cannot reduce total quantity below the ${sold} tickets already sold`
      );
    }
    updateData.availableQuantity = newAvailable;
  }

  return ticketRepository.update(id, updateData);
}

export async function deleteTicket(id: string) {
  const ticket = await getTicket(id);
  const sold = ticket.totalQuantity - ticket.availableQuantity;
  if (sold > 0) {
    throw ApiError.conflict('Cannot delete a ticket that already has bookings');
  }
  return ticketRepository.remove(id);
}

export async function updateStatus(id: string, status: TicketSaleStatus) {
  await getTicket(id);
  return ticketRepository.update(id, { status });
}

// ---- Public ----

export async function listPublicTickets(params: { page: number; limit: number; festivalId?: string }) {
  const skip = (params.page - 1) * params.limit;
  const now = new Date();
  const { items, total } = await ticketRepository.findMany({
    festivalId: params.festivalId,
    status: 'ACTIVE',
    skip,
    take: params.limit,
  });

  const available = items.filter(
    (t) => t.salesStart <= now && t.salesEnd >= now && t.availableQuantity > 0
  );

  return {
    items: available.map(toPublicTicketDto),
    pagination: buildPagination(params.page, params.limit, total),
  };
}

export async function getPublicTicket(id: string) {
  const ticket = await getTicket(id);
  const now = new Date();
  if (
    ticket.status !== 'ACTIVE' ||
    ticket.salesStart > now ||
    ticket.salesEnd < now ||
    ticket.availableQuantity <= 0
  ) {
    throw ApiError.notFound('Ticket not currently available for sale');
  }
  return toPublicTicketDto(ticket);
}

function toPublicTicketDto(ticket: Awaited<ReturnType<typeof ticketRepository.findById>>) {
  if (!ticket) throw ApiError.notFound('Ticket not found');
  return {
    id: ticket.id,
    festivalId: ticket.festivalId,
    name: ticket.name,
    description: ticket.description,
    ticketType: ticket.ticketType,
    price: ticket.price,
    currency: ticket.currency,
    availableQuantity: ticket.availableQuantity,
    salesStart: ticket.salesStart,
    salesEnd: ticket.salesEnd,
  };
}
