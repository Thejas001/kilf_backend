import rateLimit from 'express-rate-limit';
import { env, isTest } from '../config/env';

export const generalLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: isTest ? 100000 : env.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later.', errors: [] },
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isTest ? 100000 : 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many login attempts, please try again later.', errors: [] },
});

export const bookingLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: isTest ? 100000 : 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many booking requests, please slow down.', errors: [] },
});
