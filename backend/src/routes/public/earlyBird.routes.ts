import { Router } from 'express';
import * as earlyBirdController from '../../controllers/earlyBird.controller';
import { validate } from '../../middleware/validate';
import { earlyBirdLimiter } from '../../middleware/rateLimiters';
import { createEarlyBirdSchema } from '../../validators/earlyBird.validator';

const router = Router();

/**
 * @openapi
 * /api/early-bird:
 *   post:
 *     tags: [Early Bird]
 *     summary: Register for early bird updates
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, whatsappNumber, townOrCity, ageGroup]
 *             properties:
 *               name: { type: string, minLength: 2 }
 *               whatsappNumber: { type: string, example: "9876543210", description: 10-digit Indian number; +91 prefix optional }
 *               email: { type: string, format: email }
 *               townOrCity: { type: string }
 *               ageGroup: { type: string, enum: ["Under 18", "18-24", "25-34", "35-44", "45-59", "60+"] }
 *               interestType: { type: string, enum: [REGISTER, VOLUNTEER, EXHIBIT, PARTNER], default: REGISTER }
 *               interests:
 *                 type: array
 *                 items: { type: string, enum: [AUTHOR_TALKS, KHASAKKINTE_ITHIHASAM, MUSIC_EVENINGS, BOOK_FAIR, OPEN_MIC_POETRY, NEW_YEARS_EVE, WORKSHOPS, YOUTH, THEATRE, MUSIC, FILM] }
 *     responses:
 *       201: { description: Registered }
 *       400: { description: Validation failed }
 *       409: { description: WhatsApp number already registered }
 */
router.post('/', earlyBirdLimiter, validate(createEarlyBirdSchema), earlyBirdController.register);

export default router;
