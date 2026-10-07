import { Router } from 'express';
import * as ticketController from '../../controllers/ticket.controller';
import { validate } from '../../middleware/validate';
import { publicListTicketsSchema, publicTicketIdParamSchema } from '../../validators/ticket.validator';

const router = Router();

/**
 * @openapi
 * /api/tickets:
 *   get:
 *     tags: [Public Tickets]
 *     summary: List tickets currently available for sale
 *     responses:
 *       200: { description: List of available tickets }
 */
router.get('/', validate(publicListTicketsSchema), ticketController.publicList);

/**
 * @openapi
 * /api/tickets/{id}:
 *   get:
 *     tags: [Public Tickets]
 *     summary: Get a single available ticket
 *     responses:
 *       200: { description: Ticket fetched }
 *       404: { description: Ticket not available for sale }
 */
router.get('/:id', validate(publicTicketIdParamSchema), ticketController.publicGetOne);

export default router;
