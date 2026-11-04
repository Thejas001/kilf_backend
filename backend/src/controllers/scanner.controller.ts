import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/apiResponse';
import * as scannerService from '../services/scanner.service';
import { recordAuditLogFromRequest } from '../services/auditLog.service';

export const list = asyncHandler(async (_req: Request, res: Response) => {
  return sendSuccess(res, await scannerService.listScanners(), 'Scanners fetched');
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const scanner = await scannerService.createScanner(req.body);
  await recordAuditLogFromRequest(req, 'CREATED_SCANNER', 'Admin', scanner.id, null, {
    email: scanner.email,
  });
  return sendSuccess(res, scanner, 'Scanner created', 201);
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const { password, ...rest } = req.body;
  const scanner = await scannerService.updateScanner(String(req.params.id), req.body);
  await recordAuditLogFromRequest(req, 'UPDATED_SCANNER', 'Admin', scanner.id, null, {
    ...rest,
    passwordChanged: password !== undefined,
  });
  return sendSuccess(res, scanner, 'Scanner updated');
});
