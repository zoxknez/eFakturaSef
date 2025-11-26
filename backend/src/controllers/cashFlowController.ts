/**
 * Cash Flow Controller
 * Cash flow prognoza endpoints
 */

import { Request, Response, NextFunction } from 'express';
import CashFlowForecastService from '../services/cashFlowForecastService';
import logger from '../utils/logger';

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    companyId: string;
    role: string;
  };
}

export class CashFlowController {
  /**
   * Get daily forecast
   */
  static async getDailyForecast(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const companyId = req.user!.companyId;
      const { fromDate, toDate, openingBalance } = req.query;

      if (!fromDate || !toDate) {
        return res.status(400).json({
          success: false,
          error: 'fromDate and toDate are required',
        });
      }

      const forecast = await CashFlowForecastService.generateForecast(
        companyId,
        new Date(fromDate as string),
        new Date(toDate as string),
        openingBalance ? parseFloat(openingBalance as string) : 0
      );

      res.json({ success: true, data: forecast });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get weekly summary
   */
  static async getWeeklySummary(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const companyId = req.user!.companyId;
      const { startDate } = req.query;

      const summary = await CashFlowForecastService.getWeeklySummary(
        companyId,
        startDate ? new Date(startDate as string) : new Date()
      );

      res.json({ success: true, data: summary });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get monthly summary
   */
  static async getMonthlySummary(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const companyId = req.user!.companyId;
      const { year } = req.params;

      const summary = await CashFlowForecastService.getMonthlySummary(
        companyId,
        parseInt(year)
      );

      res.json({ success: true, data: summary });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get cash flow alerts
   */
  static async getAlerts(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const companyId = req.user!.companyId;
      const { currentBalance, daysAhead, minimumBalance } = req.query;

      if (!currentBalance) {
        return res.status(400).json({
          success: false,
          error: 'currentBalance is required',
        });
      }

      const alerts = await CashFlowForecastService.getCashFlowAlerts(
        companyId,
        parseFloat(currentBalance as string),
        daysAhead ? parseInt(daysAhead as string) : 30,
        minimumBalance ? parseFloat(minimumBalance as string) : 0
      );

      res.json({ success: true, data: alerts });
    } catch (error) {
      next(error);
    }
  }
}

export default CashFlowController;
