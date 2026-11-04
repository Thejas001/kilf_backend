import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/** Creates the KILF 2027 Elite Pass on the first festival (idempotent by name). */
async function main() {
  const festival = await prisma.festival.findFirst({ orderBy: { createdAt: 'asc' } });
  if (!festival) throw new Error('No festival found; run the seed first.');

  const name = 'Elite Pass';
  const existing = await prisma.ticket.findFirst({ where: { festivalId: festival.id, name } });
  if (existing) {
    console.log(`Elite Pass already exists (${existing.id})`);
    return;
  }

  const totalQuantity = 100;
  const ticket = await prisma.ticket.create({
    data: {
      festivalId: festival.id,
      name,
      description:
        'Festival Pass for all 5 days with front-row seating and a reserved seat at Khasakkinte Ithihasam. Limited passes.',
      ticketType: 'ELITE',
      price: 1500,
      gstRate: 18,
      totalQuantity,
      availableQuantity: totalQuantity,
      salesStart: new Date('2026-11-11T00:00:00+05:30'),
      salesEnd: new Date('2027-01-04T23:59:59+05:30'),
      status: 'ACTIVE',
      multiDay: true,
      requiresShowSession: true,
      requiresDate: false,
      perks: [
        'Festival Pass, all 5 days',
        'Front-row seating at main-stage sessions',
        'Khasakkinte Ithihasam, reserved seat in the best section',
        'Choose your Khasak show date first',
        'Priority entry at both venues',
        'Elite badge and printed festival programme',
        'Dedicated Elite help desk',
      ],
    },
  });
  console.log(`Created Elite Pass ${ticket.id} on festival "${festival.name}"`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
