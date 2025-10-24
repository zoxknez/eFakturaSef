// Bulk operations controller
import { Request, Response } from 'express';
import { prisma } from '../db/prisma';
import { logger } from '../utils/logger';
import { queueInvoice } from '../queue/invoiceQueue';
import { InvoiceStatus } from '@prisma/client';

export class BulkController {
  /**
   * Bulk send invoices to SEF
   * POST /api/bulk/send
   */
  static async bulkSend(req: Request, res: Response) {
    try {
      const { invoiceIds } = req.body as { invoiceIds: string[] };
      const user = (req as any).user;

      if (!Array.isArray(invoiceIds) || invoiceIds.length === 0) {
        return res.status(400).json({ error: 'invoiceIds array is required' });
      }

      if (invoiceIds.length > 100) {
        return res.status(400).json({ error: 'Maximum 100 invoices can be sent at once' });
      }

      // Verify all invoices belong to user's company and are in DRAFT status
      const invoices = await prisma.invoice.findMany({
        where: {
          id: { in: invoiceIds },
          companyId: user.companyId,
          status: InvoiceStatus.DRAFT,
        },
        include: {
          company: true,
        },
      });

      if (invoices.length === 0) {
        return res.status(404).json({ error: 'No eligible invoices found' });
      }

      // Check if all have SEF API key configured
      const missingApiKey = invoices.some((inv) => !inv.company.sefApiKey);
      if (missingApiKey) {
        return res.status(400).json({ error: 'Company does not have SEF API key configured' });
      }

      // Queue all invoices for sending
      const queuedJobs = [];
      for (const invoice of invoices) {
        const job = await queueInvoice({
          invoiceId: invoice.id,
          companyId: invoice.companyId,
          userId: user.id,
        });
        queuedJobs.push({ invoiceId: invoice.id, jobId: job.id });
      }

      logger.info('Bulk send initiated', {
        userId: user.id,
        count: queuedJobs.length,
        requested: invoiceIds.length,
      });

      return res.json({
        success: true,
        message: `${queuedJobs.length} invoices queued for sending`,
        queued: queuedJobs.length,
        requested: invoiceIds.length,
        skipped: invoiceIds.length - queuedJobs.length,
        jobs: queuedJobs,
      });
    } catch (error: any) {
      logger.error('Bulk send failed', { error: error.message });
      return res.status(500).json({ error: 'Bulk send failed' });
    }
  }

  /**
   * Bulk delete invoices
   * DELETE /api/bulk/delete
   */
  static async bulkDelete(req: Request, res: Response) {
    try {
      const { invoiceIds } = req.body as { invoiceIds: string[] };
      const user = (req as any).user;

      if (!Array.isArray(invoiceIds) || invoiceIds.length === 0) {
        return res.status(400).json({ error: 'invoiceIds array is required' });
      }

      if (invoiceIds.length > 100) {
        return res.status(400).json({ error: 'Maximum 100 invoices can be deleted at once' });
      }

      // Only allow deleting DRAFT invoices
      const result = await prisma.invoice.deleteMany({
        where: {
          id: { in: invoiceIds },
          companyId: user.companyId,
          status: InvoiceStatus.DRAFT, // Safety: only drafts can be deleted
        },
      });

      logger.info('Bulk delete completed', {
        userId: user.id,
        deleted: result.count,
        requested: invoiceIds.length,
      });

      return res.json({
        success: true,
        message: `${result.count} invoices deleted`,
        deleted: result.count,
        requested: invoiceIds.length,
        skipped: invoiceIds.length - result.count,
      });
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
      const { invoiceIds, status } = req.body as {
        invoiceIds: string[];
        status: InvoiceStatus;
      };
      const user = (req as any).user;

      if (!Array.isArray(invoiceIds) || invoiceIds.length === 0) {
        return res.status(400).json({ error: 'invoiceIds array is required' });
      }

      if (!status) {
        return res.status(400).json({ error: 'status is required' });
      }

      if (invoiceIds.length > 100) {
        return res.status(400).json({ error: 'Maximum 100 invoices can be updated at once' });
      }

      // Validate status transition (only allow certain transitions)
      const allowedTransitions: InvoiceStatus[] = [
        InvoiceStatus.DRAFT,
        InvoiceStatus.CANCELLED,
      ];

      if (!allowedTransitions.includes(status)) {
        return res.status(400).json({
          error: `Bulk status update only allowed to: ${allowedTransitions.join(', ')}`,
        });
      }

      // Update invoices
      const result = await prisma.invoice.updateMany({
        where: {
          id: { in: invoiceIds },
          companyId: user.companyId,
        },
        data: {
          status,
        },
      });

      logger.info('Bulk status update completed', {
        userId: user.id,
        updated: result.count,
        newStatus: status,
      });

      return res.json({
        success: true,
        message: `${result.count} invoices updated`,
        updated: result.count,
        requested: invoiceIds.length,
        newStatus: status,
      });
    } catch (error: any) {
      logger.error('Bulk status update failed', { error: error.message });
      return res.status(500).json({ error: 'Bulk status update failed' });
    }
  }

  /**
   * Bulk export invoices
   * POST /api/bulk/export
   */
  static async bulkExport(req: Request, res: Response) {
    try {
      const { invoiceIds, format = 'excel' } = req.body as {
        invoiceIds: string[];
        format?: 'excel' | 'pdf';
      };
      const user = (req as any).user;

      if (!Array.isArray(invoiceIds) || invoiceIds.length === 0) {
        return res.status(400).json({ error: 'invoiceIds array is required' });
      }

      if (invoiceIds.length > 500) {
        return res.status(400).json({ error: 'Maximum 500 invoices can be exported at once' });
      }

      // Fetch invoices
      const invoices = await prisma.invoice.findMany({
        where: {
          id: { in: invoiceIds },
          companyId: user.companyId,
        },
        include: {
          lines: true,
          company: true,
        },
        orderBy: { issueDate: 'desc' },
      });

      if (invoices.length === 0) {
        return res.status(404).json({ error: 'No invoices found for export' });
      }

      logger.info('Bulk export initiated', {
        userId: user.id,
        count: invoices.length,
        format,
      });

      // Import export service dynamically
      const { generateInvoicesExcel } = await import('../services/exportService');

      if (format === 'excel') {
        await generateInvoicesExcel(invoices, res);
      } else {
        return res.status(400).json({ error: 'PDF bulk export not yet supported' });
      }
    } catch (error: any) {
      logger.error('Bulk export failed', { error: error.message });
      return res.status(500).json({ error: 'Bulk export failed' });
    }
  }
}

