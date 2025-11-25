import { InvoiceStatus } from '@prisma/client';
import { prisma } from '../db/prisma';
import { logger } from '../utils/logger';
import { queueInvoice } from '../queue/invoiceQueue';
import { z } from 'zod';
import { generateInvoicesExcel } from './exportService';

// ========================================
// ZOD VALIDATION SCHEMAS
// ========================================

export const BulkSendSchema = z.object({
  invoiceIds: z
    .array(z.string().uuid('Invalid invoice ID format'))
    .min(1, 'At least one invoice ID is required')
    .max(100, 'Maximum 100 invoices can be sent at once'),
});

export const BulkDeleteSchema = z.object({
  invoiceIds: z
    .array(z.string().uuid('Invalid invoice ID format'))
    .min(1, 'At least one invoice ID is required')
    .max(100, 'Maximum 100 invoices can be deleted at once'),
});

export const BulkUpdateStatusSchema = z.object({
  invoiceIds: z
    .array(z.string().uuid('Invalid invoice ID format'))
    .min(1, 'At least one invoice ID is required')
    .max(100, 'Maximum 100 invoices can be updated at once'),
  status: z.nativeEnum(InvoiceStatus, {
    errorMap: () => ({ message: 'Invalid invoice status' }),
  }),
});

export const BulkExportSchema = z.object({
  invoiceIds: z
    .array(z.string().uuid('Invalid invoice ID format'))
    .min(1, 'At least one invoice ID is required')
    .max(500, 'Maximum 500 invoices can be exported at once'),
  format: z.enum(['excel', 'pdf']).default('excel'),
});

export type BulkSendDTO = z.infer<typeof BulkSendSchema>;
export type BulkDeleteDTO = z.infer<typeof BulkDeleteSchema>;
export type BulkUpdateStatusDTO = z.infer<typeof BulkUpdateStatusSchema>;
export type BulkExportDTO = z.infer<typeof BulkExportSchema>;

export class BulkService {
  /**
   * Bulk send invoices to SEF
   */
  static async bulkSend(companyId: string, userId: string, data: BulkSendDTO) {
    const { invoiceIds } = data;

    // Verify all invoices belong to user's company and are in DRAFT status
    const invoices = await prisma.invoice.findMany({
      where: {
        id: { in: invoiceIds },
        companyId,
        status: InvoiceStatus.DRAFT,
      },
      include: {
        company: true,
      },
    });

    if (invoices.length === 0) {
      throw new Error('No eligible invoices found (must be DRAFT and belong to your company)');
    }

    // Check if all have SEF API key configured
    const missingApiKey = invoices.some((inv) => !inv.company.sefApiKey);
    if (missingApiKey) {
      throw new Error('Company does not have SEF API key configured');
    }

    // Queue all invoices for sending
    const queuedJobs = [];
    for (const invoice of invoices) {
      const job = await queueInvoice({
        invoiceId: invoice.id,
        companyId: invoice.companyId,
        userId,
      });
      queuedJobs.push({ invoiceId: invoice.id, jobId: job.id });
    }

    logger.info('Bulk send initiated', {
      userId,
      count: queuedJobs.length,
      requested: invoiceIds.length,
    });

    return {
      message: `${queuedJobs.length} invoices queued for sending`,
      queued: queuedJobs.length,
      requested: invoiceIds.length,
      skipped: invoiceIds.length - queuedJobs.length,
      jobs: queuedJobs,
    };
  }

  /**
   * Bulk delete invoices
   */
  static async bulkDelete(companyId: string, userId: string, data: BulkDeleteDTO) {
    const { invoiceIds } = data;

    // Only allow deleting DRAFT invoices
    const result = await prisma.invoice.deleteMany({
      where: {
        id: { in: invoiceIds },
        companyId,
        status: InvoiceStatus.DRAFT, // Safety: only drafts can be deleted
      },
    });

    logger.info('Bulk delete completed', {
      userId,
      deleted: result.count,
      requested: invoiceIds.length,
    });

    return {
      message: `${result.count} invoices deleted`,
      deleted: result.count,
      requested: invoiceIds.length,
      skipped: invoiceIds.length - result.count,
    };
  }

  /**
   * Bulk update invoice status
   */
  static async bulkUpdateStatus(companyId: string, userId: string, data: BulkUpdateStatusDTO) {
    const { invoiceIds, status } = data;

    // Validate status transition (only allow certain transitions)
    const allowedTransitions: InvoiceStatus[] = [
      InvoiceStatus.DRAFT,
      InvoiceStatus.CANCELLED,
    ];

    if (!allowedTransitions.includes(status)) {
      throw new Error(`Bulk status update only allowed to: ${allowedTransitions.join(', ')}`);
    }

    // Update invoices
    const result = await prisma.invoice.updateMany({
      where: {
        id: { in: invoiceIds },
        companyId,
      },
      data: {
        status,
      },
    });

    logger.info('Bulk status update completed', {
      userId,
      updated: result.count,
      newStatus: status,
    });

    return {
      message: `${result.count} invoices updated`,
      updated: result.count,
      requested: invoiceIds.length,
      newStatus: status,
    };
  }

  /**
   * Bulk export invoices
   */
  static async bulkExport(companyId: string, userId: string, data: BulkExportDTO, res: any) {
    const { invoiceIds, format } = data;

    // Fetch invoices
    const invoices = await prisma.invoice.findMany({
      where: {
        id: { in: invoiceIds },
        companyId,
      },
      include: {
        lines: true,
        company: true,
      },
      orderBy: { issueDate: 'desc' },
    });

    if (invoices.length === 0) {
      throw new Error('No invoices found for export');
    }

    logger.info('Bulk export initiated', {
      userId,
      count: invoices.length,
      format,
    });

    if (format === 'excel') {
      await generateInvoicesExcel(invoices, res);
    } else {
      throw new Error('PDF bulk export not yet supported');
    }
  }
}
