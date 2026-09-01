import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/apiResponse';
import * as revenueService from '../services/revenue.service';

export const summary = asyncHandler(async (_req: Request, res: Response) => {
  const data = await revenueService.getRevenueSummary();
  return sendSuccess(res, data, 'Revenue summary fetched');
});

export const daily = asyncHandler(async (req: Request, res: Response) => {
  const days = req.query.days ? Number(req.query.days) : 30;
  const data = await revenueService.getDailyRevenue(days);
  return sendSuccess(res, data, 'Daily revenue fetched');
});

export const monthly = asyncHandler(async (req: Request, res: Response) => {
  const months = req.query.months ? Number(req.query.months) : 12;
  const data = await revenueService.getMonthlyRevenue(months);
  return sendSuccess(res, data, 'Monthly revenue fetched');
});

export const tickets = asyncHandler(async (_req: Request, res: Response) => {
  const data = await revenueService.getRevenueByTicket();
  return sendSuccess(res, data, 'Revenue by ticket fetched');
});

export const byFestival = asyncHandler(async (_req: Request, res: Response) => {
  const data = await revenueService.getRevenueByFestival();
  return sendSuccess(res, data, 'Revenue by festival fetched');
});

export const byPaymentStatus = asyncHandler(async (_req: Request, res: Response) => {
  const data = await revenueService.getRevenueByPaymentStatus();
  return sendSuccess(res, data, 'Revenue by payment status fetched');
});
