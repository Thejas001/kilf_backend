import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/apiResponse';
import * as showSessionService from '../services/showSession.service';
import { recordAuditLogFromRequest } from '../services/auditLog.service';

// ---- Public ----

export const publicList = asyncHandler(async (req: Request, res: Response) => {
  const { festivalId } = req.query as Record<string, string | undefined>;
  const sessions = await showSessionService.listShowSessions({ festivalId, onlyBookable: true });
  return sendSuccess(res, sessions, 'Show sessions fetched');
});

// ---- Admin ----

export const list = asyncHandler(async (req: Request, res: Response) => {
  const { festivalId } = req.query as Record<string, string | undefined>;
  const sessions = await showSessionService.listShowSessions({ festivalId });
  return sendSuccess(res, sessions, 'Show sessions fetched');
});

export const getOne = asyncHandler(async (req: Request, res: Response) => {
  const session = await showSessionService.getShowSession(req.params.id);
  return sendSuccess(res, session, 'Show session fetched');
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const session = await showSessionService.createShowSession(req.body);
  await recordAuditLogFromRequest(req, 'CREATED_SHOW_SESSION', 'ShowSession', session.id, null, session);
  return sendSuccess(res, session, 'Show session created', 201);
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const before = await showSessionService.getShowSession(req.params.id);
  const session = await showSessionService.updateShowSession(req.params.id, req.body);
  await recordAuditLogFromRequest(req, 'UPDATED_SHOW_SESSION', 'ShowSession', session.id, before, session);
  return sendSuccess(res, session, 'Show session updated');
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  const before = await showSessionService.getShowSession(req.params.id);
  await showSessionService.deleteShowSession(req.params.id);
  await recordAuditLogFromRequest(req, 'DELETED_SHOW_SESSION', 'ShowSession', req.params.id, before, null);
  return sendSuccess(res, null, 'Show session deleted');
});
