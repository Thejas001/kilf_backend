import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/** Creates the free New Year's Eve registration pass (idempotent by name). */
async function main() {
  const festival = await prisma.festival.findFirst({ orderBy: { createdAt: 'asc' } });
  if (!festival) throw new Error('No festival found; run the seed first.');

  const name = "New Year's Eve";
  const existing = await prisma.ticket.findFirst({ where: { festivalId: festival.id, name } });
  if (existing) {
    console.log(`Already exists (${existing.id})`);
    return;
  }

  const totalQuantity = 500;
  const ticket = await prisma.ticket.create({
    data: {
      festivalId: festival.id,
      name,
      description: "Free registration for KILF 2027 New Year's Eve celebration.",
      ticketType: 'NEW_YEAR_EVE',
      price: 0,
      gstRate: 0,
      totalQuantity,
      availableQuantity: totalQuantity,
      salesStart: new Date('2026-11-11T00:00:00+05:30'),
      salesEnd: new Date('2026-12-31T23:59:59+05:30'),
      status: 'ACTIVE',
      perks: [],
    },
  });
  console.log(`Created ${ticket.id} on festival "${festival.name}"`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
