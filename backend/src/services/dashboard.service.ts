import { prisma } from '../config/prisma';
import * as revenueRepository from '../repositories/revenue.repository';
import { round2, toNumber } from './revenue.service';

function startOfDay(d = new Date()) {
  const date = new Date(d);
  date.setHours(0, 0, 0, 0);
  return date;
}
function startOfWeek(d = new Date()) {
  const date = startOfDay(d);
  const day = date.getDay();
  const diff = (day + 6) % 7; // week starts Monday
  date.setDate(date.getDate() - diff);
  return date;
}
function startOfMonth(d = new Date()) {
  const date = startOfDay(d);
  date.setDate(1);
  return date;
}

async function revenueSince(date: Date): Promise<number> {
  const { grossRevenue } = await revenueRepository.getGrossAndRefunds({ createdAt: { gte: date } });
  return round2(toNumber(grossRevenue));
}

export async function getDashboardStats() {
  const [
    ticketAgg,
    bookingCounts,
    sponsorCounts,
    { grossRevenue, refunds },
    ticketsSold,
    todayRevenue,
    weekRevenue,
    monthRevenue,
    dailyRevenue,
    monthlyRevenue,
    revenueByTicket,
  ] = await Promise.all([
    prisma.ticket.aggregate({ _sum: { totalQuantity: true, availableQuantity: true } }),
    prisma.booking.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.sponsor.groupBy({ by: ['status'], _count: { _all: true } }),
    revenueRepository.getGrossAndRefunds(),
    revenueRepository.getTicketsSoldCount(),
    revenueSince(startOfDay()),
    revenueSince(startOfWeek()),
    revenueSince(startOfMonth()),
    revenueRepository.getDailyRevenue(14),
    revenueRepository.getMonthlyRevenue(12),
    revenueRepository.getRevenueByTicketType(),
  ]);

  const totalTickets = ticketAgg._sum.totalQuantity ?? 0;
  const availableTickets = ticketAgg._sum.availableQuantity ?? 0;
  const soldTickets = totalTickets - availableTickets;

  const bookingsByStatus = Object.fromEntries(
    bookingCounts.map((b) => [b.status, b._count._all])
  ) as Record<string, number>;
  const totalBookings = bookingCounts.reduce((sum, b) => sum + b._count._all, 0);

  const sponsorsByStatus = Object.fromEntries(
    sponsorCounts.map((s) => [s.status, s._count._all])
  ) as Record<string, number>;
  const totalSponsors = sponsorCounts.reduce((sum, s) => sum + s._count._all, 0);

  const gross = round2(toNumber(grossRevenue));
  const refundTotal = round2(toNumber(refunds));

  return {
    tickets: {
      total: totalTickets,
      sold: soldTickets,
      available: availableTickets,
      utilizationPercentage: totalTickets > 0 ? round2((soldTickets / totalTickets) * 100) : 0,
    },
    bookings: {
      total: totalBookings,
      confirmed: bookingsByStatus.CONFIRMED ?? 0,
      pending: bookingsByStatus.PENDING_PAYMENT ?? 0,
      cancelled: bookingsByStatus.CANCELLED ?? 0,
      refunded: bookingsByStatus.REFUNDED ?? 0,
      expired: bookingsByStatus.EXPIRED ?? 0,
    },
    revenue: {
      total: gross,
      refunds: refundTotal,
      net: round2(gross - refundTotal),
      today: todayRevenue,
      thisWeek: weekRevenue,
      thisMonth: monthRevenue,
      ticketsSold,
    },
    sponsors: {
      total: totalSponsors,
      active: sponsorsByStatus.ACTIVE ?? 0,
    },
    charts: {
      revenueByDay: dailyRevenue.map((r) => ({
        date: r.day,
        revenue: round2(Number(r.grossRevenue)),
        transactions: Number(r.transactions),
      })),
      revenueByMonth: monthlyRevenue.map((r) => ({
        month: r.month,
        revenue: round2(Number(r.grossRevenue)),
        transactions: Number(r.transactions),
      })),
      revenueByTicketType: revenueByTicket.map((r) => ({
        name: r.name,
        ticketType: r.ticketType,
        quantitySold: r.quantity,
        revenue: round2(toNumber(r.revenue)),
      })),
    },
  };
}
