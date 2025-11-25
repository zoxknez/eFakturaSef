import { Request, Response } from 'express';
import { logger } from '../utils/logger';
import { InvoiceService, CreateInvoiceDTO, UpdateInvoiceDTO } from '../services/invoiceService';
import { AuthenticatedRequest } from '../middleware/auth';

/* ========================= Controller ========================= */

export class InvoiceController {
  /** List invoices with cursor-based pagination and filters */
  static async getAll(req: Request, res: Response) {
    try {
      const { status, type, search, cursor, limit, direction } = req.query;
      const authReq = req as AuthenticatedRequest;
      const user = authReq.user;

      if (!user?.companyId) {
        return res.status(403).json({ error: 'User not associated with a company' });
      }

      const result = await InvoiceService.listInvoices(user.companyId, {
        status: status as string,
        type: type as string,
        search: search as string,
        cursor: cursor as string,
        limit: limit ? Number(limit) : undefined,
        direction: direction as 'next' | 'prev',
      });

      return res.json(result);
    } catch (error) {
      logger.error('Failed to list invoices', error);
      return res.status(500).json({ error: 'Failed to fetch invoices' });
    }
  }

  /** Retrieve single invoice by ID */
  static async getById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      if (!id) {
        return res.status(400).json({ error: 'Invoice ID is required' });
      }
      const authReq = req as AuthenticatedRequest;
      const user = authReq.user;

      // Pass companyId to ensure user can only see their own invoices
      const invoice = await InvoiceService.getInvoice(id, user?.companyId);

      return res.json(invoice);
    } catch (error: any) {
      logger.error('Failed to fetch invoice', error);
      if (error.message === 'Invoice not found') {
        return res.status(404).json({ error: error.message });
      }
      return res.status(500).json({ error: 'Failed to fetch invoice' });
    }
  }

  /** Create a new invoice */
  static async create(req: Request, res: Response) {
    try {
      const body = req.body as CreateInvoiceDTO;
      const created = await InvoiceService.createInvoice(body);
      
      logger.info(`Invoice created: ${created.id}`);
      return res.status(201).json(created);
    } catch (error: any) {
      logger.error('Failed to create invoice', error);
      if (error.message.includes('does not exist') || error.message.includes('required') || error.message.includes('Invalid')) {
        return res.status(400).json({ error: error.message });
      }
      if (error.message.includes('already exists')) {
        return res.status(409).json({ error: error.message });
      }
      return res.status(500).json({ error: 'Failed to create invoice' });
    }
  }

  /** Update invoice metadata (only while draft) */
  static async update(req: Request, res: Response) {
    try {
      const { id } = req.params;
      if (!id) {
        return res.status(400).json({ error: 'Invoice ID is required' });
      }
      const body = req.body as UpdateInvoiceDTO;
      
      const updated = await InvoiceService.updateInvoice(id, body);

      logger.info(`Invoice updated: ${id}`);
      return res.json(updated);
    } catch (error: any) {
      logger.error('Failed to update invoice', error);
      if (error.message === 'Invoice not found') {
        return res.status(404).json({ error: error.message });
      }
      if (error.message.includes('Only drafts') || error.message.includes('Invalid')) {
        return res.status(400).json({ error: error.message });
      }
      return res.status(500).json({ error: 'Failed to update invoice' });
    }
  }

  /** Delete invoice (only drafts) */
  static async delete(req: Request, res: Response) {
    try {
      const { id } = req.params;
      if (!id) {
        return res.status(400).json({ error: 'Invoice ID is required' });
      }
      await InvoiceService.deleteInvoice(id);
      
      logger.info(`Invoice deleted: ${id}`);
      return res.json({ message: 'Invoice deleted successfully' });
    } catch (error: any) {
      logger.error('Failed to delete invoice', error);
      if (error.message === 'Invoice not found') {
        return res.status(404).json({ error: error.message });
      }
      if (error.message.includes('Only drafts')) {
        return res.status(400).json({ error: error.message });
      }
      return res.status(500).json({ error: 'Failed to delete invoice' });
    }
  }

  /** Send invoice to SEF system (via queue) */
  static async sendToSEF(req: Request, res: Response) {
    try {
      const { id } = req.params;
      if (!id) {
        return res.status(400).json({ error: 'Invoice ID is required' });
      }
      const authReq = req as AuthenticatedRequest;
      const userId = authReq.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const result = await InvoiceService.sendToSEF(id, userId);
      
      logger.info(`Invoice ${id} queued for SEF submission`, { jobId: result.jobId });
      
      return res.json({ 
        message: 'Invoice queued for processing',
        jobId: result.jobId,
        invoiceId: result.invoiceId,
        estimatedProcessingTime: '1-2 minutes'
      });
    } catch (error: any) {
      logger.error('Failed to queue invoice for SEF', error);
      if (error.message === 'Invoice not found') {
        return res.status(404).json({ error: error.message });
      }
      if (error.message.includes('already been processed') || error.message.includes('missing') || error.message.includes('Invalid')) {
        return res.status(400).json({ error: error.message });
      }
      return res.status(500).json({ error: 'Failed to queue invoice for SEF' });
    }
  }

  /** Retrieve latest status from SEF */
  static async getStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;
      if (!id) {
        return res.status(400).json({ error: 'Invoice ID is required' });
      }

      const sefStatus = await InvoiceService.syncStatus(id);

      return res.json(sefStatus);
    } catch (error: any) {
      logger.error('Failed to get SEF status', error);
      if (error.message === 'Invoice not found') {
        return res.status(404).json({ error: error.message });
      }
      if (error.message.includes('not been sent')) {
        return res.status(400).json({ error: error.message });
      }
      return res.status(500).json({ error: 'Failed to get invoice status' });
    }
  }

  /** Cancel invoice in SEF system */
  static async cancel(req: Request, res: Response) {
    try {
      const { id } = req.params;
      if (!id) {
        return res.status(400).json({ error: 'Invoice ID is required' });
      }
      const { reason } = req.body as { reason?: string };

      const result = await InvoiceService.cancelInvoice(id, reason);

      logger.info(`Invoice ${id} cancelled in SEF`);
      return res.json(result);
    } catch (error: any) {
      logger.error('Failed to cancel invoice', error);
      if (error.message === 'Invoice not found') {
        return res.status(404).json({ error: error.message });
      }
      if (error.message.includes('not been sent')) {
        return res.status(400).json({ error: error.message });
      }
      return res.status(500).json({ error: 'Failed to cancel invoice' });
    }
  }
}