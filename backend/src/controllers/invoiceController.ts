import { Request, Response } from 'express';
import { logger } from '../utils/logger';
import { InvoiceService, CreateInvoiceDTO, UpdateInvoiceDTO } from '../services/invoiceService';
import { pdfService } from '../services/pdfService';
import { AuthenticatedRequest } from '../middleware/auth';
import { AppError, Errors, handleControllerError, getAuthenticatedCompanyId } from '../utils/errorHandler';

/* ========================= Controller ========================= */

export class InvoiceController {
  /** List invoices with cursor-based pagination and filters */
  static async getAll(req: Request, res: Response) {
    try {
      const { status, type, search, cursor, limit, direction, dateFrom, dateTo, sortBy, sortOrder } = req.query;
      const authReq = req as AuthenticatedRequest;
      const companyId = getAuthenticatedCompanyId(authReq.user);

      const result = await InvoiceService.listInvoices(companyId, {
        status: status as string,
        type: type as string,
        search: search as string,
        dateFrom: dateFrom as string,
        dateTo: dateTo as string,
        sortBy: sortBy as 'issueDate' | 'dueDate' | 'totalAmount' | 'invoiceNumber' | 'createdAt' | undefined,
        sortOrder: sortOrder as 'asc' | 'desc' | undefined,
        cursor: cursor as string,
        limit: limit ? Number(limit) : undefined,
        direction: direction as 'next' | 'prev',
      });

      return res.json(result);
    } catch (error) {
      return handleControllerError('InvoiceController.getAll', error, res);
    }
  }

  /** Retrieve single invoice by ID */
  static async getById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      if (!id) {
        throw Errors.badRequest('Invoice ID is required');
      }
      const authReq = req as AuthenticatedRequest;
      const companyId = getAuthenticatedCompanyId(authReq.user);

      // Pass companyId to ensure user can only see their own invoices
      const invoice = await InvoiceService.getInvoice(id, companyId);

      return res.json(invoice);
    } catch (error) {
      return handleControllerError('InvoiceController.getById', error, res);
    }
  }

  /** Create a new invoice */
  static async create(req: Request, res: Response) {
    try {
      const body = req.body as CreateInvoiceDTO;
      const authReq = req as AuthenticatedRequest;
      
      if (!authReq.user?.id) {
        throw Errors.unauthorized('User not authenticated');
      }

      const created = await InvoiceService.createInvoice(body, authReq.user.id);
      
      logger.info(`Invoice created: ${created.id}`);
      return res.status(201).json({ success: true, data: created });
    } catch (error) {
      return handleControllerError('InvoiceController.create', error, res);
    }
  }

  /** Update invoice metadata (only while draft) */
  static async update(req: Request, res: Response) {
    try {
      const { id } = req.params;
      if (!id) {
        throw Errors.badRequest('Invoice ID is required');
      }
      const body = req.body as UpdateInvoiceDTO;
      
      const updated = await InvoiceService.updateInvoice(id, body);

      logger.info(`Invoice updated: ${id}`);
      return res.json({ success: true, data: updated });
    } catch (error) {
      return handleControllerError('InvoiceController.update', error, res);
    }
  }

  /** Delete invoice (only drafts) */
  static async delete(req: Request, res: Response) {
    try {
      const { id } = req.params;
      if (!id) {
        throw Errors.badRequest('Invoice ID is required');
      }
      const authReq = req as AuthenticatedRequest;
      
      if (!authReq.user?.id) {
        throw Errors.unauthorized('User not authenticated');
      }

      await InvoiceService.deleteInvoice(id, authReq.user.id);
      
      logger.info(`Invoice deleted: ${id}`);
      return res.json({ success: true, message: 'Invoice deleted successfully' });
    } catch (error) {
      return handleControllerError('InvoiceController.delete', error, res);
    }
  }

  /** Send invoice to SEF system (via queue) */
  static async sendToSEF(req: Request, res: Response) {
    try {
      const { id } = req.params;
      if (!id) {
        return res.status(400).json({ success: false, error: 'Invoice ID is required' });
      }
      const authReq = req as AuthenticatedRequest;
      const userId = authReq.user?.id;

      if (!authReq.user?.id) {
        throw Errors.unauthorized('User not authenticated');
      }

      const result = await InvoiceService.sendToSEF(id, authReq.user.id);
      
      logger.info(`Invoice ${id} queued for SEF submission`, { jobId: result.jobId });
      
      return res.json({ 
        success: true,
        message: 'Invoice queued for processing',
        data: {
          jobId: result.jobId,
          invoiceId: result.invoiceId,
          estimatedProcessingTime: '1-2 minutes'
        }
      });
    } catch (error) {
      return handleControllerError('InvoiceController.sendToSEF', error, res);
    }
  }

  /** Retrieve latest status from SEF */
  static async getStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;
      if (!id) {
        throw Errors.badRequest('Invoice ID is required');
      }

      const sefStatus = await InvoiceService.syncStatus(id);

      return res.json({ success: true, data: sefStatus });
    } catch (error) {
      return handleControllerError('InvoiceController.getStatus', error, res);
    }
  }

  /** Cancel invoice in SEF system */
  static async cancel(req: Request, res: Response) {
    try {
      const { id } = req.params;
      if (!id) {
        throw Errors.badRequest('Invoice ID is required');
      }
      const { reason } = req.body as { reason?: string };
      const authReq = req as AuthenticatedRequest;
      
      if (!authReq.user?.id) {
        throw Errors.unauthorized('User not authenticated');
      }

      const result = await InvoiceService.cancelInvoice(id, authReq.user.id, reason);

      logger.info(`Invoice ${id} cancelled in SEF`);
      return res.json({ success: true, data: result });
    } catch (error) {
      return handleControllerError('InvoiceController.cancel', error, res);
    }
  }

  /** Export invoice as PDF */
  static async exportPDF(req: Request, res: Response) {
    try {
      const { id } = req.params;
      if (!id) {
        throw Errors.badRequest('Invoice ID is required');
      }
      const authReq = req as AuthenticatedRequest;
      const companyId = getAuthenticatedCompanyId(authReq.user);

      // Get invoice with company details
      const invoice = await InvoiceService.getInvoice(id, companyId);

      // Transform invoice to PDF format
      const pdfInvoiceData = {
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        issueDate: invoice.issueDate,
        dueDate: invoice.dueDate || invoice.issueDate,
        seller: {
          name: invoice.company?.name || '',
          pib: invoice.company?.pib || '',
          address: invoice.company?.address || '',
          city: invoice.company?.city || '',
          bankAccount: invoice.company?.bankAccount || undefined,
        },
        buyer: {
          name: invoice.buyerName || '',
          pib: invoice.buyerPIB || '',
          address: '',
          city: '',
        },
        items: invoice.lines.map(line => ({
          name: line.itemName || '',
          quantity: Number(line.quantity),
          unit: line.unit || 'kom',
          unitPrice: Number(line.unitPrice),
          vatRate: Number(line.taxRate),
          totalPrice: Number(line.amount),
        })),
        subtotal: Number(invoice.totalAmount) - Number(invoice.taxAmount),
        vatAmount: Number(invoice.taxAmount),
        totalAmount: Number(invoice.totalAmount),
        currencyCode: invoice.currency || 'RSD',
        note: invoice.note || undefined,
        sefId: invoice.sefId || undefined,
      };

      // Generate PDF
      const pdfBuffer = await pdfService.generateInvoicePDF(pdfInvoiceData);

      // Set response headers
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="faktura-${invoice.invoiceNumber}.pdf"`);
      res.setHeader('Content-Length', pdfBuffer.length.toString());

      return res.send(pdfBuffer);
    } catch (error) {
      return handleControllerError('InvoiceController.exportPDF', error, res);
    }
  }

  /** Export invoice as UBL XML */
  static async exportXML(req: Request, res: Response) {
    try {
      const { id } = req.params;
      if (!id) {
        throw Errors.badRequest('Invoice ID is required');
      }
      const authReq = req as AuthenticatedRequest;
      const companyId = getAuthenticatedCompanyId(authReq.user);

      // Get invoice with company details
      const invoice = await InvoiceService.getInvoice(id, companyId);

      // Generate UBL XML
      const xmlContent = await InvoiceService.generateUBLXML(id);

      // Set response headers
      res.setHeader('Content-Type', 'application/xml');
      res.setHeader('Content-Disposition', `attachment; filename="faktura-${invoice.invoiceNumber}.xml"`);
      res.setHeader('Content-Length', Buffer.byteLength(xmlContent, 'utf8').toString());

      return res.send(xmlContent);
    } catch (error) {
      return handleControllerError('InvoiceController.exportXML', error, res);
    }
  }

  /** Get invoice status counts for all statuses */
  static async getStatusCounts(req: Request, res: Response) {
    try {
      const authReq = req as AuthenticatedRequest;
      const companyId = getAuthenticatedCompanyId(authReq.user);

      const counts = await InvoiceService.getStatusCounts(companyId);

      return res.json({ success: true, data: counts });
    } catch (error) {
      return handleControllerError('InvoiceController.getStatusCounts', error, res);
    }
  }
}