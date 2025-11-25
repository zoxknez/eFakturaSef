/**
 * Credit Note Controller
 * Handles Credit Notes (Knjižna Odobrenja)
 */

import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { CreditNoteService, CreateCreditNoteSchema } from '../services/creditNoteService';
import { handleControllerError, Errors } from '../utils/errorHandler';
import { CreditNoteStatus } from '@prisma/client';

/**
 * Helper to get validated company ID from request
 */
function getCompanyId(req: Request): string {
  const authReq = req as AuthenticatedRequest;
  const companyId = authReq.user?.companyId;
  if (!companyId) {
    throw Errors.unauthorized('Company context required');
  }
  return companyId;
}

/**
 * Helper to get validated user ID from request
 */
function getUserId(req: Request): string {
  const authReq = req as AuthenticatedRequest;
  const userId = authReq.user?.id;
  if (!userId) {
    throw Errors.unauthorized('User context required');
  }
  return userId;
}

/**
 * Helper to get validated ID from params
 */
function getParamId(req: Request, paramName: string = 'id'): string {
  const id = req.params[paramName];
  if (!id) {
    throw Errors.badRequest(`${paramName} is required`);
  }
  return id;
}

export class CreditNoteController {
  /**
   * List credit notes
   * GET /api/credit-notes
   */
  static async list(req: Request, res: Response) {
    try {
      const companyId = getCompanyId(req);
      const { page, limit, status, fromDate, toDate, search } = req.query;

      const result = await CreditNoteService.listCreditNotes(companyId, {
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
        status: status as CreditNoteStatus,
        fromDate: fromDate ? new Date(fromDate as string) : undefined,
        toDate: toDate ? new Date(toDate as string) : undefined,
        search: search as string,
      });

      return res.json({ success: true, ...result });
    } catch (error) {
      return handleControllerError('ListCreditNotes', error, res);
    }
  }

  /**
   * Get single credit note
   * GET /api/credit-notes/:id
   */
  static async get(req: Request, res: Response) {
    try {
      const companyId = getCompanyId(req);
      const id = getParamId(req);

      const creditNote = await CreditNoteService.getCreditNote(id, companyId);
      return res.json({ success: true, data: creditNote });
    } catch (error) {
      return handleControllerError('GetCreditNote', error, res);
    }
  }

  /**
   * Create credit note
   * POST /api/credit-notes
   */
  static async create(req: Request, res: Response) {
    try {
      const companyId = getCompanyId(req);
      const userId = getUserId(req);

      const validation = CreateCreditNoteSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: validation.error.format(),
        });
      }

      const creditNote = await CreditNoteService.createCreditNote(companyId, validation.data, userId);
      return res.status(201).json({ success: true, data: creditNote });
    } catch (error) {
      return handleControllerError('CreateCreditNote', error, res);
    }
  }

  /**
   * Send credit note to SEF
   * POST /api/credit-notes/:id/send
   */
  static async sendToSEF(req: Request, res: Response) {
    try {
      const companyId = getCompanyId(req);
      const userId = getUserId(req);
      const id = getParamId(req);

      const result = await CreditNoteService.sendToSEF(id, companyId, userId);
      return res.json({ success: true, data: result, message: 'Credit note sent to SEF' });
    } catch (error) {
      return handleControllerError('SendCreditNoteToSEF', error, res);
    }
  }

  /**
   * Cancel credit note
   * POST /api/credit-notes/:id/cancel
   */
  static async cancel(req: Request, res: Response) {
    try {
      const companyId = getCompanyId(req);
      const id = getParamId(req);
      const { reason } = req.body;

      if (!reason) {
        return res.status(400).json({ success: false, error: 'Reason is required' });
      }

      const result = await CreditNoteService.cancelCreditNote(id, companyId, reason);
      return res.json({ success: true, data: result, message: 'Credit note cancelled' });
    } catch (error) {
      return handleControllerError('CancelCreditNote', error, res);
    }
  }

  /**
   * Delete credit note (draft only)
   * DELETE /api/credit-notes/:id
   */
  static async delete(req: Request, res: Response) {
    try {
      const companyId = getCompanyId(req);
      const id = getParamId(req);

      const result = await CreditNoteService.deleteCreditNote(id, companyId);
      return res.json({ success: true, ...result });
    } catch (error) {
      return handleControllerError('DeleteCreditNote', error, res);
    }
  }

  /**
   * Get credit note PDF
   * GET /api/credit-notes/:id/pdf
   */
  static async getPDF(req: Request, res: Response) {
    try {
      const companyId = getCompanyId(req);
      const id = getParamId(req);

      // Get credit note with all relations
      const creditNote = await CreditNoteService.getCreditNote(id, companyId);
      
      // Generate PDF using PDFGenerator
      const { PDFGenerator } = await import('../services/pdfGenerator');
      
      // Use generic report PDF generator for credit notes
      const pdfBuffer = await PDFGenerator.generateReportPDF(
        `Knjižno Odobrenje - ${creditNote.creditNoteNumber}`,
        {
          name: 'Company', // Would come from company data
          pib: '',
          address: '',
          city: '',
          postalCode: '',
          country: 'RS',
        },
        {
          from: creditNote.issueDate,
          to: creditNote.issueDate,
        },
        creditNote.lines.map((line) => ({
          lineNumber: line.lineNumber,
          itemName: line.itemName,
          quantity: Number(line.quantity),
          unitPrice: Number(line.unitPrice),
          taxRate: Number(line.taxRate),
          amount: Number(line.amount),
        })),
        [
          { key: 'lineNumber', label: 'R.br.', width: 50 },
          { key: 'itemName', label: 'Naziv', width: 200 },
          { key: 'quantity', label: 'Količina', width: 80, align: 'right' as const },
          { key: 'unitPrice', label: 'Jed. cena', width: 100, align: 'right' as const },
          { key: 'taxRate', label: 'PDV %', width: 80, align: 'right' as const },
          { key: 'amount', label: 'Iznos', width: 100, align: 'right' as const },
        ]
      );

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="credit-note-${creditNote.creditNoteNumber}.pdf"`);
      return res.send(pdfBuffer);
    } catch (error) {
      return handleControllerError('GetCreditNotePDF', error, res);
    }
  }
}

export default CreditNoteController;
