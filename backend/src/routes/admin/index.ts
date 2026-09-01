import { Router } from 'express';
import authRoutes from '../auth.routes';
import dashboardRoutes from './dashboard.routes';
import festivalRoutes from './festival.routes';
import ticketRoutes from './ticket.routes';
import checkinRoutes from './checkin.routes';
import bookingRoutes from './booking.routes';
import sponsorRoutes from './sponsor.routes';
import revenueRoutes from './revenue.routes';
import auditLogRoutes from './auditLog.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/festivals', festivalRoutes);
// Mounted twice on the same prefix: CRUD routes plus /verify and /check-in.
router.use('/tickets', ticketRoutes);
router.use('/tickets', checkinRoutes);
router.use('/bookings', bookingRoutes);
router.use('/sponsors', sponsorRoutes);
router.use('/revenue', revenueRoutes);
router.use('/audit-logs', auditLogRoutes);

export default router;
