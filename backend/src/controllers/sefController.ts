import { Request, Response } from 'express';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '../db/prisma';
import { SEFService } from '../services/sefService';
import { logger } from '../utils/logger';
import { AppError } from '../middleware/errorHandler';
import { AuthenticatedRequest } from '../middleware/auth';

// Validation schemas
const sendInvoiceSchema = z.object({
  invoiceId: z.string().uuid(),
});

const cancelInvoiceSchema = z.object({
  invoiceId: z.string().uuid(),
  reason: z.string().optional(),
});

const dateRangeSchema = z.object({
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  status: z.string().optional(),
});

export class SEFController {
  /**
   * Helper to get SEF service instance for a company
   */
  private static async getServiceForCompany(companyId: string): Promise<SEFService> {
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { sefApiKey: true, sefEnvironment: true }
    });

    if (!company) {
      throw new AppError('Company not found', 404);
    }

    if (!company.sefApiKey) {
      throw new AppError('SEF API key not configured for this company', 400);
    }

    return new SEFService({
      apiKey: company.sefApiKey,
      baseUrl: company.sefEnvironment === 'production' 
        ? 'https://efaktura.mfin.gov.rs' 
        : 'https://demoefaktura.mfin.gov.rs'
    });
  }

  /**
   * Send invoice to SEF
   */
  static async sendInvoice(req: Request, res: Response) {
    const authReq = req as AuthenticatedRequest;
    const { invoiceId } = sendInvoiceSchema.parse(req.body);
    const companyId = authReq.user!.companyId;

    // 1. Get invoice data
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId, companyId },
      include: { 
        lines: true,
        partner: true,
        company: true
      }
    });

    if (!invoice) {
      throw new AppError('Invoice not found', 404);
    }

    if (invoice.status === 'SENT' || invoice.status === 'ACCEPTED') {
      throw new AppError('Invoice already sent to SEF', 400);
    }

    // 2. Initialize SEF service
    const sefService = await SEFController.getServiceForCompany(companyId);

    // 3. Generate UBL XML (This should ideally be in a separate service)
    // For now, we assume ublXml is generated or we call a generator
    // If ublXml is stored in invoice, use it.
    
    if (!invoice.ublXml) {
       // TODO: Call UBL generation service
       throw new AppError('UBL XML not generated for this invoice', 400);
    }

    // 4. Send to SEF
    const result = await sefService.sendInvoice(invoice.ublXml);

    // 5. Update invoice status
    const updatedInvoice = await prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        status: 'SENT',
        sefId: result.invoiceId?.toString() || result.id?.toString(), // Adjust based on actual response
        sefStatus: result.status,
        sentAt: new Date(),
      }
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: 'SENT_TO_SEF',
        entityType: 'invoice',
        entityId: invoiceId,
        userId: authReq.user!.id,
        newData: result as unknown as Prisma.InputJsonValue
      }
    });

    res.json({
      success: true,
      data: updatedInvoice
    });
  }

  /**
   * Check invoice status
   */
  static async checkStatus(req: Request, res: Response) {
    const authReq = req as AuthenticatedRequest;
    const { id } = req.params; // Invoice ID (our DB ID)
    const companyId = authReq.user!.companyId;

    const invoice = await prisma.invoice.findUnique({
      where: { id, companyId },
    });

    if (!invoice) {
      throw new AppError('Invoice not found', 404);
    }

    if (!invoice.sefId) {
      throw new AppError('Invoice has not been sent to SEF', 400);
    }

    const sefService = await SEFController.getServiceForCompany(companyId);
    const status = await sefService.getInvoiceStatus(invoice.sefId);

    // Update local status if changed
    if (status.status !== invoice.sefStatus) {
      await prisma.invoice.update({
        where: { id },
        data: {
          sefStatus: status.status,
          // Map SEF status to our internal status if needed
          // status: mapSefStatusToInternal(status.status)
        }
      });
    }

    res.json({
      success: true,
      data: status
    });
  }

  /**
   * Cancel invoice
   */
  static async cancelInvoice(req: Request, res: Response) {
    const authReq = req as AuthenticatedRequest;
    const { invoiceId, reason } = cancelInvoiceSchema.parse(req.body);
    const companyId = authReq.user!.companyId;

    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId, companyId },
    });

    if (!invoice) {
      throw new AppError('Invoice not found', 404);
    }

    if (!invoice.sefId) {
      throw new AppError('Invoice has not been sent to SEF', 400);
    }

    const sefService = await SEFController.getServiceForCompany(companyId);
    const result = await sefService.cancelInvoice(invoice.sefId, reason);

    await prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        status: 'CANCELLED',
        sefStatus: 'CANCELLED',
      }
    });

    await prisma.auditLog.create({
      data: {
        action: 'CANCELLED_ON_SEF',
        entityType: 'invoice',
        entityId: invoiceId,
        userId: authReq.user!.id,
        newData: result as unknown as Prisma.InputJsonValue
      }
    });

    res.json({
      success: true,
      data: result
    });
  }

  /**
   * Sync incoming invoices (Purchase Invoices)
   */
  static async syncIncomingInvoices(req: Request, res: Response) {
    const authReq = req as AuthenticatedRequest;
    const filters = dateRangeSchema.parse(req.query);
    const companyId = authReq.user!.companyId;

    const sefService = await SEFController.getServiceForCompany(companyId);
    const invoices = await sefService.getPurchaseInvoices(filters);

    // Process and save invoices to DB
    // This might be a heavy operation, consider moving to a queue
    // For now, we just return the list
    
    res.json({
      success: true,
      data: invoices
    });
  }

  /**
   * Handle Webhook
   */
  static async handleWebhook(req: Request, res: Response) {
    // Signature verification is handled by middleware
    const payload = req.body;
    const signature = req.get('X-SEF-Signature') || '';

    logger.info('SEF Webhook received', { payload });

    // Log webhook
    await prisma.sEFWebhookLog.create({
      data: {
        eventType: payload.eventType || 'unknown',
        sefId: payload.invoiceId || payload.id || 'unknown',
        payload: payload,
        signature: signature,
        processed: false // Will be processed by queue
      }
    });

    // Add to processing queue
    // await queueService.add('webhook-processing', payload);

    res.json({
      success: true,
      message: 'Webhook received'
    });
  }
}
