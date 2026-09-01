import { Router } from 'express';
import * as ticketController from '../../controllers/ticket.controller';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import {
  createTicketSchema,
  listTicketsSchema,
  ticketIdParamSchema,
  updateTicketSchema,
  updateTicketStatusSchema,
} from '../../validators/ticket.validator';

const router = Router();

router.use(authenticate);

/**
 * @openapi
 * /api/admin/tickets:
 *   get:
 *     tags: [Admin Tickets]
 *     summary: List tickets
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: List of tickets }
 *   post:
 *     tags: [Admin Tickets]
 *     summary: Create a ticket
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201: { description: Ticket created }
 */
router.get('/', validate(listTicketsSchema), ticketController.list);
router.post('/', authorize('ADMIN', 'SUPER_ADMIN'), validate(createTicketSchema), ticketController.create);

/**
 * @openapi
 * /api/admin/tickets/{id}:
 *   get:
 *     tags: [Admin Tickets]
 *     summary: Get a ticket by id (includes inventory/revenue)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Ticket fetched }
 *   put:
 *     tags: [Admin Tickets]
 *     summary: Update a ticket
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Ticket updated }
 *   delete:
 *     tags: [Admin Tickets]
 *     summary: Delete a ticket
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Ticket deleted }
 */
router.get('/:id', validate(ticketIdParamSchema), ticketController.getOne);
router.put(
  '/:id',
  authorize('ADMIN', 'SUPER_ADMIN'),
  validate(updateTicketSchema),
  ticketController.update
);
router.delete(
  '/:id',
  authorize('SUPER_ADMIN'),
  validate(ticketIdParamSchema),
  ticketController.remove
);

/**
 * @openapi
 * /api/admin/tickets/{id}/status:
 *   patch:
 *     tags: [Admin Tickets]
 *     summary: Enable/disable a ticket
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Status updated }
 */
router.patch(
  '/:id/status',
  authorize('ADMIN', 'SUPER_ADMIN'),
  validate(updateTicketStatusSchema),
  ticketController.updateStatus
);

export default router;
