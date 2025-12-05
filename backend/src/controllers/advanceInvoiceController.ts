/**
 * Advance Invoice Controller
 * Avansne fakture endpoints
 */

import { Response, NextFunction } from 'express';
import AdvanceInvoiceService from '../services/advanceInvoiceService';
import logger from '../utils/logger';
import { AuthenticatedRequest } from '../middleware/auth';

export class AdvanceInvoiceController {
  /**
   * Create advance invoice
   */
  static async create(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const companyId = req.user!.companyId;
      const { partnerId, issueDate, advanceAmount, taxRate, currency, note } = req.body;

      if (!partnerId || !issueDate || !advanceAmount || taxRate === undefined) {
        return res.status(400).json({
          success: false,
          error: 'partnerId, issueDate, advanceAmount, and taxRate are required',
        });
      }

      const invoice = await AdvanceInvoiceService.create(companyId, {
        partnerId,
        issueDate: new Date(issueDate),
        advanceAmount,
        taxRate,
        currency,
        note,
      });

      res.status(201).json({ success: true, data: invoice });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get advance invoice by ID
   */
  static async getById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const companyId = req.user!.companyId;
      const { id } = req.params;

      const invoice = await AdvanceInvoiceService.getById(id, companyId);

      if (!invoice) {
        return res.status(404).json({
          success: false,
          error: 'Advance invoice not found',
        });
      }

      res.json({ success: true, data: invoice });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all advance invoices
   */
  static async getAll(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const companyId = req.user!.companyId;
      const { partnerId, status, fromDate, toDate, page, limit } = req.query;

      const result = await AdvanceInvoiceService.getAll(companyId, {
        partnerId: partnerId as string,
        status: status as string,
        fromDate: fromDate ? new Date(fromDate as string) : undefined,
        toDate: toDate ? new Date(toDate as string) : undefined,
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
      });

      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get available advances for partner
   */
  static async getAvailable(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const companyId = req.user!.companyId;
      const { partnerId } = req.params;

      const advances = await AdvanceInvoiceService.getAvailableForPartner(companyId, partnerId);

      res.json({ success: true, data: advances });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Use advance against invoice
   */
  static async useAdvance(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const companyId = req.user!.companyId;
      const { id } = req.params;
      const { amount, finalInvoiceId } = req.body;

      if (!amount || !finalInvoiceId) {
        return res.status(400).json({
          success: false,
          error: 'amount and finalInvoiceId are required',
        });
      }

      const invoice = await AdvanceInvoiceService.useAdvance(id, companyId, amount, finalInvoiceId);

      res.json({ success: true, data: invoice });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Cancel advance invoice
   */
  static async cancel(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const companyId = req.user!.companyId;
      const { id } = req.params;

      const invoice = await AdvanceInvoiceService.cancel(id, companyId);

      res.json({ success: true, data: invoice });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get summary
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

      const summary = await AdvanceInvoiceService.getSummary(
        companyId,
        new Date(fromDate as string),
        new Date(toDate as string)
      );

      res.json({ success: true, data: summary });
    } catch (error) {
      next(error);
    }
  }
}

export default AdvanceInvoiceController;
