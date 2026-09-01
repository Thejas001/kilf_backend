import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/apiResponse';
import { getPaginationParams } from '../utils/pagination';
import * as festivalService from '../services/festival.service';
import { recordAuditLogFromRequest } from '../services/auditLog.service';

export const list = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit } = getPaginationParams(req);
  const { status, search, sortBy, sortOrder } = req.query as Record<string, string | undefined>;
  const result = await festivalService.listFestivals({
    page,
    limit,
    status: status as any,
    search,
    sortBy: sortBy as any,
    sortOrder: sortOrder as any,
  });
  return sendSuccess(res, result.items, 'Festivals fetched', 200, result.pagination);
});

export const getOne = asyncHandler(async (req: Request, res: Response) => {
  const festival = await festivalService.getFestival(req.params.id);
  return sendSuccess(res, festival, 'Festival fetched');
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const festival = await festivalService.createFestival(req.body);
  await recordAuditLogFromRequest(req, 'CREATED_FESTIVAL', 'Festival', festival.id, null, festival);
  return sendSuccess(res, festival, 'Festival created', 201);
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const before = await festivalService.getFestival(req.params.id);
  const festival = await festivalService.updateFestival(req.params.id, req.body);
  await recordAuditLogFromRequest(req, 'UPDATED_FESTIVAL', 'Festival', festival.id, before, festival);
  return sendSuccess(res, festival, 'Festival updated');
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  const before = await festivalService.getFestival(req.params.id);
  await festivalService.deleteFestival(req.params.id);
  await recordAuditLogFromRequest(req, 'DELETED_FESTIVAL', 'Festival', req.params.id, before, null);
  return sendSuccess(res, null, 'Festival deleted');
});

export const updateStatus = asyncHandler(async (req: Request, res: Response) => {
  const before = await festivalService.getFestival(req.params.id);
  const festival = await festivalService.updateStatus(req.params.id, req.body.status);
  await recordAuditLogFromRequest(
    req,
    'CHANGED_FESTIVAL_STATUS',
    'Festival',
    festival.id,
    { status: before.status },
    { status: festival.status }
  );
  return sendSuccess(res, festival, 'Festival status updated');
});
