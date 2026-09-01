import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/apiResponse';
import * as dashboardService from '../services/dashboard.service';

export const getStats = asyncHandler(async (_req: Request, res: Response) => {
  const stats = await dashboardService.getDashboardStats();
  return sendSuccess(res, stats, 'Dashboard stats fetched');
});
