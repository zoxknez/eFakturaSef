/**
 * KPO Controller
 * Knjiga prometa obveznika endpoints
 */

import { Request, Response, NextFunction } from 'express';
import KPOService from '../services/kpoService';
import logger from '../utils/logger';

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    companyId: string;
    role: string;
  };
}

export class KPOController {
  /**
   * Create manual entry
   */
  static async create(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const companyId = req.user!.companyId;
      const { date, description, documentNumber, documentType, grossIncome, vatAmount, netIncome, expense } = req.body;

      const entry = await KPOService.createEntry(companyId, {
        date: new Date(date),
        description,
        documentNumber,
        documentType,
        grossIncome: grossIncome || 0,
        vatAmount: vatAmount || 0,
        netIncome: netIncome || 0,
        expense: expense || 0,
      });

      res.status(201).json({ success: true, data: entry });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create from invoice
   */
  static async createFromInvoice(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const companyId = req.user!.companyId;
      const { invoiceId } = req.params;

      const entry = await KPOService.createFromInvoice(companyId, invoiceId);

      res.status(201).json({ success: true, data: entry });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get entries for period
   */
  static async getEntries(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const companyId = req.user!.companyId;
      const { fromDate, toDate } = req.query;

      if (!fromDate || !toDate) {
        return res.status(400).json({
          success: false,
          error: 'fromDate and toDate are required',
        });
      }

      const entries = await KPOService.getEntries(
        companyId,
        new Date(fromDate as string),
        new Date(toDate as string)
      );

      res.json({ success: true, data: entries });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get summary for period
   */
  static async getSummary(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const companyId = req.user!.companyId;
      const { fromDate, toDate } = req.query;

      if (!fromDate || !toDate) {
        return res.status(400).json({
          success: false,
          error: 'fromDate and toDate are required',
        });
      }

      const summary = await KPOService.getSummary(
        companyId,
        new Date(fromDate as string),
        new Date(toDate as string)
      );

      res.json({ success: true, data: summary });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get monthly summary for year
   */
  static async getMonthlySummary(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const companyId = req.user!.companyId;
      const { year } = req.params;

      const summary = await KPOService.getMonthlySummary(companyId, parseInt(year));

      res.json({ success: true, data: summary });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Auto-generate from invoices
   */
  static async autoGenerate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const companyId = req.user!.companyId;
      const { fromDate, toDate } = req.body;

      if (!fromDate || !toDate) {
        return res.status(400).json({
          success: false,
          error: 'fromDate and toDate are required',
        });
      }

      const result = await KPOService.autoGenerateFromInvoices(
        companyId,
        new Date(fromDate),
        new Date(toDate)
      );

      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update entry
   */
  static async update(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const companyId = req.user!.companyId;
      const { id } = req.params;
      const { date, description, documentNumber, documentType, grossIncome, vatAmount, netIncome, expense } = req.body;

      const entry = await KPOService.updateEntry(id, companyId, {
        date: date ? new Date(date) : undefined,
        description,
        documentNumber,
        documentType,
        grossIncome,
        vatAmount,
        netIncome,
        expense,
      });

      res.json({ success: true, data: entry });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete entry
   */
  static async delete(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const companyId = req.user!.companyId;
      const { id } = req.params;

      await KPOService.deleteEntry(id, companyId);

      res.json({ success: true, message: 'Entry deleted' });
    } catch (error) {
      next(error);
    }
  }
}

export default KPOController;
