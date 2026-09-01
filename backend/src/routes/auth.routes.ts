import { Router } from 'express';
import * as authController from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { authLimiter } from '../middleware/rateLimiters';
import {
  bootstrapAdminSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  refreshTokenSchema,
  resetPasswordSchema,
} from '../validators/auth.validator';

const router = Router();

/**
 * @openapi
 * /api/admin/auth/bootstrap:
 *   post:
 *     tags: [Admin Auth]
 *     summary: Create the first admin account (only works when no admin exists yet)
 *     description: >
 *       One-time setup endpoint for a fresh installation. Once any admin row exists in the
 *       database, this always returns 403 - use `POST /api/admin/auth/login` after that.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password]
 *             properties:
 *               name: { type: string }
 *               email: { type: string, format: email }
 *               password: { type: string, format: password, minLength: 8 }
 *     responses:
 *       201: { description: Admin account created }
 *       403: { description: An admin account already exists }
 */
router.post(
  '/bootstrap',
  authLimiter,
  validate(bootstrapAdminSchema),
  authController.bootstrapAdmin
);

/**
 * @openapi
 * /api/admin/auth/login:
 *   post:
 *     tags: [Admin Auth]
 *     summary: Admin login
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
router.post('/login', authLimiter, validate(loginSchema), authController.login);

/**
 * @openapi
 * /api/admin/auth/refresh:
 *   post:
 *     tags: [Admin Auth]
 *     summary: Exchange a refresh token for a new access token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refreshToken]
 *             properties:
 *               refreshToken: { type: string }
 *     responses:
 *       200: { description: Token refreshed }
 */
router.post('/refresh', authLimiter, validate(refreshTokenSchema), authController.refreshToken);

/**
 * @openapi
 * /api/admin/auth/logout:
 *   post:
 *     tags: [Admin Auth]
 *     summary: Log out the current admin
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Logged out }
 */
router.post('/logout', authenticate, authController.logout);

/**
 * @openapi
 * /api/admin/auth/me:
 *   get:
 *     tags: [Admin Auth]
 *     summary: Get the current admin's profile
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Profile fetched }
 */
router.get('/me', authenticate, authController.me);

/**
 * @openapi
 * /api/admin/auth/change-password:
 *   post:
 *     tags: [Admin Auth]
 *     summary: Change the current admin's password
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Password changed }
 */
router.post(
  '/change-password',
  authenticate,
  validate(changePasswordSchema),
  authController.changePassword
);

/**
 * @openapi
 * /api/admin/auth/forgot-password:
 *   post:
 *     tags: [Admin Auth]
 *     summary: Request a password reset token
 *     responses:
 *       200: { description: Reset token issued if the email exists }
 */
router.post(
  '/forgot-password',
  authLimiter,
  validate(forgotPasswordSchema),
  authController.forgotPassword
);

/**
 * @openapi
 * /api/admin/auth/reset-password:
 *   post:
 *     tags: [Admin Auth]
 *     summary: Reset password using a reset token
 *     responses:
 *       200: { description: Password reset }
 */
router.post(
  '/reset-password',
  authLimiter,
  validate(resetPasswordSchema),
  authController.resetPassword
);

export default router;
