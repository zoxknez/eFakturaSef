import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { CalculationService } from '../services/calculationService';
import { logger } from '../utils/logger';
import { z } from 'zod';

// Validation schemas
const createCalculationSchema = z.object({
  date: z.string().transform(str => new Date(str)),
  number: z.string().min(1),
  partnerId: z.string().optional(),
  incomingInvoiceId: z.string().optional(),
  warehouse: z.string().optional(),
  items: z.array(z.object({
    productId: z.string().uuid(),
    quantity: z.number().positive(),
    supplierPrice: z.number().nonnegative(),
    expensePerUnit: z.number().nonnegative().optional(),
    marginPercent: z.number().optional(),
    vatRate: z.number().nonnegative(),
  })).min(1),
});

export class CalculationController {
  /**
   * Create a new calculation
   */
  static async create(req: AuthenticatedRequest, res: Response) {
    try {
      const validation = createCalculationSchema.safeParse(req.body);
      
      if (!validation.success) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: validation.error.errors,
        });
        return;
      }

      const calculation = await CalculationService.create({
        ...validation.data,
        companyId: req.user!.companyId,
        userId: req.user!.id,
      });

      res.status(201).json({
        success: true,
        data: calculation,
      });
    } catch (error: any) {
      logger.error('Failed to create calculation', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to create calculation',
      });
    }
  }

  /**
   * Create calculation from incoming invoice
   */
  static async createFromInvoice(req: AuthenticatedRequest, res: Response) {
    try {
      const { invoiceId } = req.params;

      const calculation = await CalculationService.createFromIncomingInvoice(
        req.user!.companyId,
        invoiceId,
        req.user!.id
      );

      res.status(201).json({
        success: true,
        data: calculation,
      });
    } catch (error: any) {
      logger.error('Failed to create calculation from invoice', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to create calculation from invoice',
      });
    }
  }

  /**
   * Post (finalize) calculation
   */
  static async post(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;

      const calculation = await CalculationService.post(
        id,
        req.user!.companyId,
        req.user!.id
      );

      res.json({
        success: true,
        data: calculation,
      });
    } catch (error: any) {
      logger.error('Failed to post calculation', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to post calculation',
      });
    }
  }

  /**
   * Get calculation by ID
   */
  static async getById(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;

      const calculation = await CalculationService.getById(
        id,
        req.user!.companyId
      );

      if (!calculation) {
        res.status(404).json({
          success: false,
          error: 'Calculation not found',
        });
        return;
      }

      res.json({
        success: true,
        data: calculation,
      });
    } catch (error: any) {
      logger.error('Failed to get calculation', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get calculation',
      });
    }
  }

  /**
   * List calculations
   */
  static async list(req: AuthenticatedRequest, res: Response) {
    try {
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 20;
      const search = req.query.search as string;

      const result = await CalculationService.list(
        req.user!.companyId,
        { page, limit, search }
      );

      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination,
      });
    } catch (error: any) {
      logger.error('Failed to list calculations', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to list calculations',
      });
    }
  }
}
