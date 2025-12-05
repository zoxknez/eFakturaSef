/**
 * Compensation Controller
 * Kompenzacije endpoints
 */

import { Response, NextFunction } from 'express';
import CompensationService from '../services/compensationService';
import logger from '../utils/logger';
import { AuthenticatedRequest } from '../middleware/auth';

export class CompensationController {
  /**
   * Get open items for compensation
   */
  static async getOpenItems(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const companyId = req.user!.companyId;
      const { partnerId } = req.params;

      const items = await CompensationService.getOpenItemsForPartner(companyId, partnerId);

      res.json({ success: true, data: items });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create compensation
   */
  static async create(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const companyId = req.user!.companyId;
      const { partnerId, date, items, note } = req.body;

      if (!partnerId || !date || !items || items.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'partnerId, date, and items are required',
        });
      }

      const compensation = await CompensationService.createCompensation(companyId, {
        partnerId,
        date: new Date(date),
        items: items.map((item: any) => ({
          type: item.type,
          invoiceId: item.invoiceId,
          documentNumber: item.documentNumber,
          documentDate: new Date(item.documentDate),
          originalAmount: item.originalAmount,
          compensatedAmount: item.compensatedAmount,
        })),
        note,
      });

      res.status(201).json({ success: true, data: compensation });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get compensation by ID
   */
  static async getById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const companyId = req.user!.companyId;
      const { id } = req.params;

      const compensation = await CompensationService.getById(id, companyId);

      if (!compensation) {
        return res.status(404).json({
          success: false,
          error: 'Compensation not found',
        });
      }

      res.json({ success: true, data: compensation });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all compensations
   */
  static async getAll(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const companyId = req.user!.companyId;
      const { partnerId, status, fromDate, toDate, page, limit } = req.query;

      const result = await CompensationService.getAll(companyId, {
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
   * Sign compensation
   */
  static async sign(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const companyId = req.user!.companyId;
      const { id } = req.params;

      const compensation = await CompensationService.signCompensation(id, companyId);

      res.json({ success: true, data: compensation });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Cancel compensation
   */
  static async cancel(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const companyId = req.user!.companyId;
      const { id } = req.params;

      const compensation = await CompensationService.cancelCompensation(id, companyId);

      res.json({ success: true, data: compensation });
    } catch (error) {
      next(error);
    }
  }
}

export default CompensationController;
