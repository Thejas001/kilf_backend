import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/apiResponse';
import { getPaginationParams } from '../utils/pagination';
import * as sponsorService from '../services/sponsor.service';
import { recordAuditLogFromRequest } from '../services/auditLog.service';
import { storageProvider } from '../services/storage/LocalStorageProvider';
import { ApiError } from '../utils/ApiError';

export const list = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit } = getPaginationParams(req);
  const { status, sponsorshipLevel, festivalId, search } = req.query as Record<
    string,
    string | undefined
  >;
  const result = await sponsorService.listSponsors({
    page,
    limit,
    status: status as any,
    sponsorshipLevel: sponsorshipLevel as any,
    festivalId,
    search,
  });
  return sendSuccess(res, result.items, 'Sponsors fetched', 200, result.pagination);
});

export const getOne = asyncHandler(async (req: Request, res: Response) => {
  const sponsor = await sponsorService.getSponsor(req.params.id);
  return sendSuccess(res, sponsor, 'Sponsor fetched');
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const sponsor = await sponsorService.createSponsor(req.body);
  await recordAuditLogFromRequest(req, 'CREATED_SPONSOR', 'Sponsor', sponsor.id, null, sponsor);
  return sendSuccess(res, sponsor, 'Sponsor created', 201);
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const before = await sponsorService.getSponsor(req.params.id);
  const sponsor = await sponsorService.updateSponsor(req.params.id, req.body);
  await recordAuditLogFromRequest(req, 'UPDATED_SPONSOR', 'Sponsor', sponsor.id, before, sponsor);
  return sendSuccess(res, sponsor, 'Sponsor updated');
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  const before = await sponsorService.getSponsor(req.params.id);
  await sponsorService.deleteSponsor(req.params.id);
  await recordAuditLogFromRequest(req, 'DELETED_SPONSOR', 'Sponsor', req.params.id, before, null);
  return sendSuccess(res, null, 'Sponsor deleted');
});

export const updateStatus = asyncHandler(async (req: Request, res: Response) => {
  const before = await sponsorService.getSponsor(req.params.id);
  const sponsor = await sponsorService.updateStatus(req.params.id, req.body.status);
  await recordAuditLogFromRequest(
    req,
    'CHANGED_SPONSOR_STATUS',
    'Sponsor',
    sponsor.id,
    { status: before.status },
    { status: sponsor.status }
  );
  return sendSuccess(res, sponsor, 'Sponsor status updated');
});

export const uploadLogo = asyncHandler(async (req: Request, res: Response) => {
  if (!req.file) throw ApiError.badRequest('No file uploaded');
  const before = await sponsorService.getSponsor(req.params.id);
  const result = await storageProvider.upload({
    buffer: req.file.buffer,
    originalName: req.file.originalname,
    mimeType: req.file.mimetype,
    folder: 'sponsors',
  });
  const sponsor = await sponsorService.updateSponsor(req.params.id, { logoUrl: result.url });
  await recordAuditLogFromRequest(
    req,
    'UPLOADED_SPONSOR_LOGO',
    'Sponsor',
    sponsor.id,
    { logoUrl: before.logoUrl },
    { logoUrl: sponsor.logoUrl }
  );
  return sendSuccess(res, sponsor, 'Logo uploaded');
});

// ---- Public ----

export const publicList = asyncHandler(async (req: Request, res: Response) => {
  const { festivalId } = req.query as Record<string, string | undefined>;
  const sponsors = await sponsorService.listPublicSponsors(festivalId);
  return sendSuccess(res, sponsors, 'Sponsors fetched');
});
