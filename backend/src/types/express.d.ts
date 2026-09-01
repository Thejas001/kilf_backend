import { AdminRole } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      admin?: {
        id: string;
        email: string;
        role: AdminRole;
      };
      /** Raw request body bytes, captured by the express.json() verify hook for webhook signature checks. */
      rawBody?: Buffer;
    }
  }
}

export {};
