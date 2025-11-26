import { Request, Response } from 'express';
import { RecurringInvoiceService } from '../services/recurringInvoiceService';
import { logger } from '../utils/logger';
import { AuthenticatedRequest } from '../middleware/auth';
import { getErrorMessage } from '../types/common';

export class RecurringInvoiceController {
  /**
   * Create a new recurring invoice profile
   */
  static async create(req: Request, res: Response) {
    try {
      const authReq = req as AuthenticatedRequest;
      const companyId = authReq.user?.companyId;
      const userId = authReq.user?.id;

      if (!companyId || !userId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      const profile = await RecurringInvoiceService.create({
        ...req.body,
        companyId,
        createdBy: userId
      });

      logger.info(`Recurring invoice profile created by user ${userId}`);
      return res.status(201).json({ success: true, data: profile });
    } catch (error) {
      const message = getErrorMessage(error);
      logger.error('Failed to create recurring invoice profile', error);
      return res.status(500).json({ success: false, error: message });
    }
  }

  /**
   * Get all recurring invoice profiles
   */
  static async getAll(req: Request, res: Response) {
    try {
      const authReq = req as AuthenticatedRequest;
      const companyId = authReq.user?.companyId;

      if (!companyId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      const profiles = await RecurringInvoiceService.getAll(companyId);
      return res.json({ success: true, data: profiles });
    } catch (error) {
      const message = getErrorMessage(error);
      logger.error('Failed to fetch recurring invoice profiles', error);
      return res.status(500).json({ success: false, error: message });
    }
  }

  /**
   * Get a single recurring invoice profile
   */
  static async getById(req: Request, res: Response) {
    try {
      const authReq = req as AuthenticatedRequest;
      const companyId = authReq.user?.companyId;
      const { id } = req.params;

      if (!companyId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      const profile = await RecurringInvoiceService.getById(id, companyId);
      if (!profile) {
        return res.status(404).json({ success: false, error: 'Profile not found' });
      }

      return res.json({ success: true, data: profile });
    } catch (error) {
      const message = getErrorMessage(error);
      logger.error('Failed to fetch recurring invoice profile', error);
      return res.status(500).json({ success: false, error: message });
    }
  }

  /**
   * Update a recurring invoice profile
   */
  static async update(req: Request, res: Response) {
    try {
      const authReq = req as AuthenticatedRequest;
      const companyId = authReq.user?.companyId;
      const { id } = req.params;

      if (!companyId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      const profile = await RecurringInvoiceService.update(id, companyId, req.body);
      return res.json({ success: true, data: profile });
    } catch (error) {
      const message = getErrorMessage(error);
      logger.error('Failed to update recurring invoice profile', error);
      return res.status(500).json({ success: false, error: message });
    }
  }

  /**
   * Delete (cancel) a recurring invoice profile
   */
  static async delete(req: Request, res: Response) {
    try {
      const authReq = req as AuthenticatedRequest;
      const companyId = authReq.user?.companyId;
      const { id } = req.params;

      if (!companyId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      await RecurringInvoiceService.delete(id, companyId);
      return res.json({ success: true, message: 'Profile cancelled' });
    } catch (error) {
      const message = getErrorMessage(error);
      logger.error('Failed to delete recurring invoice profile', error);
      return res.status(500).json({ success: false, error: message });
    }
  }
}
