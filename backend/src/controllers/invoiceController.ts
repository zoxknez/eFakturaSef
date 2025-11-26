import { Request, Response } from 'express';
import { logger } from '../utils/logger';
import { InvoiceService, CreateInvoiceDTO, UpdateInvoiceDTO } from '../services/invoiceService';
import { pdfService } from '../services/pdfService';
import { AuthenticatedRequest } from '../middleware/auth';
import { getErrorMessage } from '../types/common';

/* ========================= Controller ========================= */

export class InvoiceController {
  /** List invoices with cursor-based pagination and filters */
  static async getAll(req: Request, res: Response) {
    try {
      const { status, type, search, cursor, limit, direction } = req.query;
      const authReq = req as AuthenticatedRequest;
      const user = authReq.user;

      if (!user?.companyId) {
        return res.status(403).json({ success: false, error: 'User not associated with a company' });
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
      return res.status(500).json({ success: false, error: 'Failed to fetch invoices' });
    }
  }

  /** Retrieve single invoice by ID */
  static async getById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      if (!id) {
        return res.status(400).json({ success: false, error: 'Invoice ID is required' });
      }
      const authReq = req as AuthenticatedRequest;
      const user = authReq.user;

      // Pass companyId to ensure user can only see their own invoices
      const invoice = await InvoiceService.getInvoice(id, user?.companyId);

      return res.json(invoice);
    } catch (error) {
      const message = getErrorMessage(error);
      logger.error('Failed to fetch invoice', error);
      if (message === 'Invoice not found') {
        return res.status(404).json({ success: false, error: message });
      }
      return res.status(500).json({ success: false, error: 'Failed to fetch invoice' });
    }
  }

  /** Create a new invoice */
  static async create(req: Request, res: Response) {
    try {
      const body = req.body as CreateInvoiceDTO;
      const authReq = req as AuthenticatedRequest;
      const userId = authReq.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const created = await InvoiceService.createInvoice(body, userId);
      
      logger.info(`Invoice created: ${created.id}`);
      return res.status(201).json(created);
    } catch (error) {
      const message = getErrorMessage(error);
      logger.error('Failed to create invoice', error);
      if (message.includes('does not exist') || message.includes('required') || message.includes('Invalid')) {
        return res.status(400).json({ success: false, error: message });
      }
      if (message.includes('already exists')) {
        return res.status(409).json({ success: false, error: message });
      }
      return res.status(500).json({ success: false, error: 'Failed to create invoice' });
    }
  }

  /** Update invoice metadata (only while draft) */
  static async update(req: Request, res: Response) {
    try {
      const { id } = req.params;
      if (!id) {
        return res.status(400).json({ success: false, error: 'Invoice ID is required' });
      }
      const body = req.body as UpdateInvoiceDTO;
      
      const updated = await InvoiceService.updateInvoice(id, body);

      logger.info(`Invoice updated: ${id}`);
      return res.json(updated);
    } catch (error) {
      const message = getErrorMessage(error);
      logger.error('Failed to update invoice', error);
      if (message === 'Invoice not found') {
        return res.status(404).json({ success: false, error: message });
      }
      if (message.includes('Only drafts') || message.includes('Invalid')) {
        return res.status(400).json({ success: false, error: message });
      }
      return res.status(500).json({ success: false, error: 'Failed to update invoice' });
    }
  }

  /** Delete invoice (only drafts) */
  static async delete(req: Request, res: Response) {
    try {
      const { id } = req.params;
      if (!id) {
        return res.status(400).json({ success: false, error: 'Invoice ID is required' });
      }
      const authReq = req as AuthenticatedRequest;
      const userId = authReq.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      await InvoiceService.deleteInvoice(id, userId);
      
      logger.info(`Invoice deleted: ${id}`);
      return res.json({ message: 'Invoice deleted successfully' });
    } catch (error) {
      const message = getErrorMessage(error);
      logger.error('Failed to delete invoice', error);
      if (message === 'Invoice not found') {
        return res.status(404).json({ success: false, error: message });
      }
      if (message.includes('Only drafts')) {
        return res.status(400).json({ success: false, error: message });
      }
      return res.status(500).json({ success: false, error: 'Failed to delete invoice' });
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
    } catch (error) {
      const message = getErrorMessage(error);
      logger.error('Failed to queue invoice for SEF', error);
      if (message === 'Invoice not found') {
        return res.status(404).json({ success: false, error: message });
      }
      if (message.includes('already been processed') || message.includes('missing') || message.includes('Invalid')) {
        return res.status(400).json({ success: false, error: message });
      }
      return res.status(500).json({ success: false, error: 'Failed to queue invoice for SEF' });
    }
  }

  /** Retrieve latest status from SEF */
  static async getStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;
      if (!id) {
        return res.status(400).json({ success: false, error: 'Invoice ID is required' });
      }

      const sefStatus = await InvoiceService.syncStatus(id);

      return res.json(sefStatus);
    } catch (error) {
      const message = getErrorMessage(error);
      logger.error('Failed to get SEF status', error);
      if (message === 'Invoice not found') {
        return res.status(404).json({ success: false, error: message });
      }
      if (message.includes('not been sent')) {
        return res.status(400).json({ success: false, error: message });
      }
      return res.status(500).json({ success: false, error: 'Failed to get invoice status' });
    }
  }

  /** Cancel invoice in SEF system */
  static async cancel(req: Request, res: Response) {
    try {
      const { id } = req.params;
      if (!id) {
        return res.status(400).json({ success: false, error: 'Invoice ID is required' });
      }
      const { reason } = req.body as { reason?: string };
      const authReq = req as AuthenticatedRequest;
      const userId = authReq.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const result = await InvoiceService.cancelInvoice(id, userId, reason);

      logger.info(`Invoice ${id} cancelled in SEF`);
      return res.json(result);
    } catch (error) {
      const message = getErrorMessage(error);
      logger.error('Failed to cancel invoice', error);
      if (message === 'Invoice not found') {
        return res.status(404).json({ success: false, error: message });
      }
      if (message.includes('not been sent')) {
        return res.status(400).json({ success: false, error: message });
      }
      return res.status(500).json({ success: false, error: 'Failed to cancel invoice' });
    }
  }

  /** Export invoice as PDF */
  static async exportPDF(req: Request, res: Response) {
    try {
      const { id } = req.params;
      if (!id) {
        return res.status(400).json({ success: false, error: 'Invoice ID is required' });
      }
      const authReq = req as AuthenticatedRequest;
      const user = authReq.user;

      // Get invoice with company details
      const invoice = await InvoiceService.getInvoice(id, user?.companyId);
      if (!invoice) {
        return res.status(404).json({ success: false, error: 'Invoice not found' });
      }

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
      res.setHeader('Content-Length', pdfBuffer.length);

      return res.send(pdfBuffer);
    } catch (error) {
      const message = getErrorMessage(error);
      logger.error('Failed to export invoice PDF', error);
      if (message === 'Invoice not found') {
        return res.status(404).json({ success: false, error: message });
      }
      return res.status(500).json({ success: false, error: 'Failed to generate PDF' });
    }
  }
}