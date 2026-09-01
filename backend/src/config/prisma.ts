import { PrismaClient } from '@prisma/client';
import { isProduction } from './env';

declare global {
  // eslint-disable-next-line no-var
  var __prisma__: PrismaClient | undefined;
}

export const prisma =
  global.__prisma__ ??
  new PrismaClient({
    log: isProduction ? ['error', 'warn'] : ['warn', 'error'],
  });

if (!isProduction) {
  global.__prisma__ = prisma;
}
