import { Router } from 'express';
import authRoutes from './auth.routes';
import ticketRoutes from './ticket.routes';
import bookingRoutes from './booking.routes';
import sponsorRoutes from './sponsor.routes';
import earlyBirdRoutes from './earlyBird.routes';
import enquiryRoutes from './enquiry.routes';
import showSessionRoutes from './showSession.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/tickets', ticketRoutes);
router.use('/bookings', bookingRoutes);
router.use('/sponsors', sponsorRoutes);
router.use('/early-bird', earlyBirdRoutes);
router.use('/enquiries', enquiryRoutes);
router.use('/show-sessions', showSessionRoutes);

export default router;
