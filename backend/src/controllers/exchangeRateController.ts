/**
 * Exchange Rate Controller
 * NBS kursna lista endpoints
 */

import { Request, Response, NextFunction } from 'express';
import ExchangeRateService from '../services/exchangeRateService';
import logger from '../utils/logger';

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    companyId: string;
    role: string;
  };
}

export class ExchangeRateController {
  /**
   * Get today's rates
   */
  static async getTodayRates(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { date } = req.query;

      const rates = await ExchangeRateService.getRatesForDate(
        date ? new Date(date as string) : new Date()
      );

      res.json({ success: true, data: rates });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get rates for a date
   */
  static async getRatesForDate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { date } = req.query;

      const rates = await ExchangeRateService.getRatesForDate(
        date ? new Date(date as string) : new Date()
      );

      res.json({ success: true, data: rates });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get specific currency rate
   */
  static async getRate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { currencyCode } = req.params;
      const { date } = req.query;

      const rate = await ExchangeRateService.getRate(
        currencyCode,
        date ? new Date(date as string) : new Date()
      );

      if (!rate) {
        return res.status(404).json({
          success: false,
          error: `Exchange rate not found for ${currencyCode}`,
        });
      }

      res.json({ success: true, data: rate });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Convert currency
   */
  static async convert(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { amount, fromCurrency, toCurrency, date } = req.query;

      if (!amount || !fromCurrency || !toCurrency) {
        return res.status(400).json({
          success: false,
          error: 'amount, fromCurrency, and toCurrency are required',
        });
      }

      const result = await ExchangeRateService.convert(
        parseFloat(amount as string),
        fromCurrency as string,
        toCurrency as string,
        date ? new Date(date as string) : new Date()
      );

      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get rate history
   */
  static async getHistory(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { currencyCode } = req.params;
      const { fromDate, toDate } = req.query;

      if (!fromDate || !toDate) {
        return res.status(400).json({
          success: false,
          error: 'fromDate and toDate are required',
        });
      }

      const history = await ExchangeRateService.getRateHistory(
        currencyCode,
        new Date(fromDate as string),
        new Date(toDate as string)
      );

      res.json({ success: true, data: history });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update rates from NBS
   */
  static async updateRates(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { date } = req.query;

      const rates = await ExchangeRateService.updateRates(
        date ? new Date(date as string) : new Date()
      );

      res.json({ success: true, data: rates, message: `Updated ${rates.length} rates` });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Calculate exchange difference
   */
  static async calculateDifference(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { amount, currency, bookingDate, settlementDate } = req.body;

      if (!amount || !currency || !bookingDate || !settlementDate) {
        return res.status(400).json({
          success: false,
          error: 'amount, currency, bookingDate, and settlementDate are required',
        });
      }

      const result = await ExchangeRateService.calculateExchangeDifference(
        parseFloat(amount),
        currency,
        new Date(bookingDate),
        new Date(settlementDate)
      );

      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
}

export default ExchangeRateController;
