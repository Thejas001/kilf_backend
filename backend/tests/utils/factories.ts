import { AdminRole, TicketType } from '@prisma/client';
import { prisma } from '../../src/config/prisma';
import { hashPassword } from '../../src/utils/password';
import { signAccessToken } from '../../src/utils/jwt';

export async function createAdmin(overrides: Partial<{ email: string; password: string; role: AdminRole }> = {}) {
  const email = overrides.email ?? `admin.${Date.now()}.${Math.random().toString(36).slice(2)}@kilf.dev`;
  const password = overrides.password ?? 'Password@123';
  const admin = await prisma.admin.create({
    data: {
      name: 'Test Admin',
      email,
      passwordHash: await hashPassword(password),
      role: overrides.role ?? 'ADMIN',
    },
  });
  const token = signAccessToken(admin);
  return { admin, password, token };
}

export async function createFestival(overrides: Partial<Parameters<typeof prisma.festival.create>[0]['data']> = {}) {
  return prisma.festival.create({
    data: {
      name: 'Test Festival',
      description: 'A festival for testing',
      location: 'Test City',
      venue: 'Test Venue',
      startDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() + 33 * 24 * 60 * 60 * 1000),
      status: 'PUBLISHED',
      ...overrides,
    },
  });
}

export async function createTicket(
  festivalId: string,
  overrides: Partial<{
    name: string;
    ticketType: TicketType;
    price: number;
    totalQuantity: number;
    availableQuantity: number;
    salesStart: Date;
    salesEnd: Date;
    status: 'ACTIVE' | 'INACTIVE';
  }> = {}
) {
  const totalQuantity = overrides.totalQuantity ?? 100;
  return prisma.ticket.create({
    data: {
      festivalId,
      name: overrides.name ?? 'General Admission',
      description: 'Test ticket',
      ticketType: overrides.ticketType ?? 'GENERAL',
      price: overrides.price ?? 500,
      currency: 'INR',
      totalQuantity,
      availableQuantity: overrides.availableQuantity ?? totalQuantity,
      salesStart: overrides.salesStart ?? new Date(Date.now() - 24 * 60 * 60 * 1000),
      salesEnd: overrides.salesEnd ?? new Date(Date.now() + 24 * 60 * 60 * 1000),
      status: overrides.status ?? 'ACTIVE',
    },
  });
}

export function authHeader(token: string) {
  return { Authorization: `Bearer ${token}` };
}
