import { Router } from 'express';
import * as guestAuthController from '../../controllers/guestAuth.controller';
import { authenticateGuest } from '../../middleware/guestAuth';
import { validate } from '../../middleware/validate';
import { authLimiter } from '../../middleware/rateLimiters';
import {
  guestChangePasswordSchema,
  guestForgotPasswordSchema,
  guestLoginSchema,
  guestRefreshSchema,
  guestRegisterSchema,
  guestResetPasswordSchema,
} from '../../validators/guestAuth.validator';

const router = Router();

/**
 * @openapi
 * /api/auth/register:
 *   post:
 *     tags: [Guest Auth]
 *     summary: Create a guest account
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password, confirmPassword]
 *             properties:
 *               name: { type: string, minLength: 2 }
 *               email: { type: string, format: email }
 *               password: { type: string, format: password, minLength: 8, description: Needs upper, lower and a digit }
 *               confirmPassword: { type: string, format: password }
 *     responses:
 *       201: { description: Account created; returns token, refreshToken and guest }
 *       400: { description: Validation failed (e.g. passwords do not match) }
 *       409: { description: Email already registered }
 */
router.post('/register', authLimiter, validate(guestRegisterSchema), guestAuthController.register);

/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     tags: [Guest Auth]
 *     summary: Guest login
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, format: email }
 *               password: { type: string, format: password }
 *     responses:
 *       200: { description: Login successful }
 *       401: { description: Invalid credentials }
 */
router.post('/login', authLimiter, validate(guestLoginSchema), guestAuthController.login);

/**
 * @openapi
 * /api/auth/refresh:
 *   post:
 *     tags: [Guest Auth]
 *     summary: Exchange a refresh token for a new access token
 *     responses:
 *       200: { description: Token refreshed }
 */
router.post('/refresh', authLimiter, validate(guestRefreshSchema), guestAuthController.refreshToken);

/**
 * @openapi
 * /api/auth/logout:
 *   post:
 *     tags: [Guest Auth]
 *     summary: Log out the current guest
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Logged out }
 */
router.post('/logout', authenticateGuest, guestAuthController.logout);

/**
 * @openapi
 * /api/auth/me:
 *   get:
 *     tags: [Guest Auth]
 *     summary: Get the current guest's profile
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Profile fetched }
 */
router.get('/me', authenticateGuest, guestAuthController.me);

/**
 * @openapi
 * /api/auth/change-password:
 *   post:
 *     tags: [Guest Auth]
 *     summary: Change the current guest's password
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Password changed }
 */
router.post(
  '/change-password',
  authenticateGuest,
  validate(guestChangePasswordSchema),
  guestAuthController.changePassword
);

/**
 * @openapi
 * /api/auth/forgot-password:
 *   post:
 *     tags: [Guest Auth]
 *     summary: Request a password reset token
 *     responses:
 *       200: { description: Reset token issued if the email exists }
 */
router.post(
  '/forgot-password',
  authLimiter,
  validate(guestForgotPasswordSchema),
  guestAuthController.forgotPassword
);

/**
 * @openapi
 * /api/auth/reset-password:
 *   post:
 *     tags: [Guest Auth]
 *     summary: Reset password using a reset token
 *     responses:
 *       200: { description: Password reset }
 */
router.post(
  '/reset-password',
  authLimiter,
  validate(guestResetPasswordSchema),
  guestAuthController.resetPassword
);

export default router;
