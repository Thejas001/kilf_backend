import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/apiResponse';
import * as checkinService from '../services/checkin.service';
import { recordAuditLogFromRequest } from '../services/auditLog.service';

export const verify = asyncHandler(async (req: Request, res: Response) => {
  const result = await checkinService.verifyTicket(req.body.ticketNumber);
  return sendSuccess(res, result, result.valid ? 'Ticket verified' : 'Ticket is not valid');
});

export const checkIn = asyncHandler(async (req: Request, res: Response) => {
  const instance = await checkinService.checkInTicket(req.body.ticketNumber, req.admin!.id);
  await recordAuditLogFromRequest(
    req,
    'CHECKED_IN_TICKET',
    'TicketInstance',
    instance.id,
    null,
    { ticketNumber: instance.ticketNumber, checkedInAt: instance.checkedInAt }
  );
  return sendSuccess(res, instance, 'Attendee checked in successfully');
});
