import { prisma } from '../src/config/prisma';

async function truncateAll() {
  const tables = [
    'audit_logs',
    'ticket_instances',
    'payments',
    'booking_items',
    'bookings',
    'customers',
    'tickets',
    'sponsors',
    'festivals',
    'admins',
  ];
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${tables.map((t) => `"${t}"`).join(', ')} CASCADE;`);
}

beforeEach(async () => {
  await truncateAll();
});

afterAll(async () => {
  await prisma.$disconnect();
});
