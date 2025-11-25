import { Request, Response } from 'express';
import { logger } from '../utils/logger';
import { 
  BulkService, 
  BulkSendSchema, 
  BulkDeleteSchema, 
  BulkUpdateStatusSchema, 
  BulkExportSchema 
} from '../services/bulkService';

export class BulkController {
  /**
   * Bulk send invoices to SEF
   * POST /api/bulk/send
   */
  static async bulkSend(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      if (!user?.companyId) {
        return res.status(403).json({ error: 'User not associated with a company' });
      }

      // Validate input
      const validation = BulkSendSchema.safeParse(req.body);
      
      if (!validation.success) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: validation.error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
          })),
        });
      }

      const result = await BulkService.bulkSend(user.companyId, user.id, validation.data);
      return res.json({ success: true, ...result });
    } catch (error: any) {
      logger.error('Bulk send failed', { error: error.message });
      if (error.message.includes('No eligible invoices') || error.message.includes('API key')) {
        return res.status(400).json({ error: error.message });
      }
      return res.status(500).json({ error: 'Bulk send failed' });
    }
  }

  /**
   * Bulk delete invoices
   * DELETE /api/bulk/delete
   */
  static async bulkDelete(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      if (!user?.companyId) {
        return res.status(403).json({ error: 'User not associated with a company' });
      }

      // Validate input
      const validation = BulkDeleteSchema.safeParse(req.body);
      
      if (!validation.success) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: validation.error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
          })),
        });
      }

      const result = await BulkService.bulkDelete(user.companyId, user.id, validation.data);
      return res.json({ success: true, ...result });
    } catch (error: any) {
      logger.error('Bulk delete failed', { error: error.message });
      return res.status(500).json({ error: 'Bulk delete failed' });
    }
  }

  /**
   * Bulk update invoice status
   * PATCH /api/bulk/status
   */
  static async bulkUpdateStatus(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      if (!user?.companyId) {
        return res.status(403).json({ error: 'User not associated with a company' });
      }

      // Validate input
      const validation = BulkUpdateStatusSchema.safeParse(req.body);
      
      if (!validation.success) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: validation.error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
          })),
        });
      }

      const result = await BulkService.bulkUpdateStatus(user.companyId, user.id, validation.data);
      return res.json({ success: true, ...result });
    } catch (error: any) {
      logger.error('Bulk status update failed', { error: error.message });
      if (error.message.includes('only allowed to')) {
        return res.status(400).json({ error: error.message });
      }
      return res.status(500).json({ error: 'Bulk status update failed' });
    }
  }

  /**
   * Bulk export invoices
   * POST /api/bulk/export
   */
  static async bulkExport(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      if (!user?.companyId) {
        return res.status(403).json({ error: 'User not associated with a company' });
      }

      // Validate input
      const validation = BulkExportSchema.safeParse(req.body);
      
      if (!validation.success) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: validation.error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
          })),
        });
      }

      await BulkService.bulkExport(user.companyId, user.id, validation.data, res);
      return;
    } catch (error: any) {
      logger.error('Bulk export failed', { error: error.message });
      if (error.message === 'No invoices found for export') {
        return res.status(404).json({ error: error.message });
      }
      if (error.message.includes('not yet supported')) {
        return res.status(400).json({ error: error.message });
      }
      return res.status(500).json({ error: 'Bulk export failed' });
    }
  }
}


