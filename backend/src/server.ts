import { createApp } from './app';
import { env } from './config/env';
import { logger } from './config/logger';
import { prisma } from './config/prisma';
import { startExpireBookingsJob, stopExpireBookingsJob } from './jobs/expireBookings.job';

const app = createApp();

const server = app.listen(env.PORT, () => {
  logger.info(`Kilf API listening on http://localhost:${env.PORT}`);
  logger.info(`Swagger docs available at http://localhost:${env.PORT}/api/docs`);
  startExpireBookingsJob();
});

async function shutdown(signal: string) {
  logger.info(`Received ${signal}, shutting down gracefully`);
  stopExpireBookingsJob();
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('unhandledRejection', (reason) => {
  logger.error({ reason }, 'Unhandled promise rejection');
});
