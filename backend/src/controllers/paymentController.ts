import { Request, Response } from 'express';
import { logger } from '../utils/logger';
import { PaymentService, CreatePaymentSchema, ListPaymentsQuerySchema } from '../services/paymentService';
import { AuthenticatedRequest } from '../middleware/auth';
import { AppError, Errors, handleControllerError, getAuthenticatedCompanyId } from '../utils/errorHandler';

export class PaymentController {
  /**
   * Record a payment for an invoice
   * POST /api/payments
   */
  static async create(req: Request, res: Response) {
    try {
      const authReq = req as AuthenticatedRequest;
      const companyId = getAuthenticatedCompanyId(authReq.user);
      
      if (!authReq.user?.id) {
        throw Errors.unauthorized('User not authenticated');
      }

      // Validate request body
      const validationResult = CreatePaymentSchema.safeParse(req.body);
      if (!validationResult.success) {
        throw Errors.validationError(validationResult.error.errors);
      }

      const result = await PaymentService.createPayment(companyId, validationResult.data, authReq.user.id);
      return res.status(201).json({ success: true, data: result });
    } catch (error: unknown) {
      return handleControllerError('PaymentController.create', error, res);
    }
  }

  /**
   * List payments with filtering
   * GET /api/payments
   */
  static async list(req: Request, res: Response) {
    try {
      const authReq = req as AuthenticatedRequest;
      const companyId = getAuthenticatedCompanyId(authReq.user);

      // Validate query params
      const queryResult = ListPaymentsQuerySchema.safeParse(req.query);
      if (!queryResult.success) {
        throw Errors.validationError(queryResult.error.errors);
      }

      const { page, limit, invoiceId, method, status, dateFrom, dateTo, sortBy, sortOrder } = queryResult.data;

      const result = await PaymentService.listPayments(companyId, {
        page: parseInt(page),
        limit: parseInt(limit),
        invoiceId,
        method,
        status,
        dateFrom,
        dateTo,
        sortBy,
        sortOrder: sortOrder as 'asc' | 'desc',
      });

      return res.json({ success: true, ...result });
    } catch (error: unknown) {
      return handleControllerError('PaymentController.list', error, res);
    }
  }

  /**
   * Get single payment by ID
   * GET /api/payments/:id
   */
  static async get(req: Request, res: Response) {
    try {
      const authReq = req as AuthenticatedRequest;
      const companyId = getAuthenticatedCompanyId(authReq.user);
      const id = req.params.id as string;
      
      if (!id) {
        throw Errors.badRequest('Payment ID is required');
      }

      const payment = await PaymentService.getPayment(id, companyId);
      return res.json({ success: true, data: payment });
    } catch (error: unknown) {
      return handleControllerError('PaymentController.get', error, res);
    }
  }

  /**
   * Cancel a payment (and revert invoice status)
   * DELETE /api/payments/:id
   */
  static async cancel(req: Request, res: Response) {
    try {
      const authReq = req as AuthenticatedRequest;
      const companyId = getAuthenticatedCompanyId(authReq.user);
      const id = req.params.id as string;
      
      if (!id) {
        throw Errors.badRequest('Payment ID is required');
      }
      
      if (!authReq.user?.id) {
        throw Errors.unauthorized('User not authenticated');
      }

      const result = await PaymentService.cancelPayment(id, companyId, authReq.user.id);
      return res.json({ success: true, data: result });
    } catch (error: unknown) {
      return handleControllerError('PaymentController.cancel', error, res);
    }
  }

  /**
   * Get payment statistics
   * GET /api/payments/stats
   */
  static async stats(req: Request, res: Response) {
    try {
      const authReq = req as AuthenticatedRequest;
      const companyId = getAuthenticatedCompanyId(authReq.user);
      const { dateFrom, dateTo } = req.query;

      const stats = await PaymentService.getStats(
        companyId, 
        typeof dateFrom === 'string' ? dateFrom : undefined,
        typeof dateTo === 'string' ? dateTo : undefined
      );
      
      return res.json({ success: true, data: stats });
    } catch (error: unknown) {
      return handleControllerError('PaymentController.stats', error, res);
    }
  }

  /**
   * Get payments for a specific invoice
   * GET /api/invoices/:invoiceId/payments
   */
  static async getInvoicePayments(req: Request, res: Response) {
    try {
      const authReq = req as AuthenticatedRequest;
      const companyId = getAuthenticatedCompanyId(authReq.user);
      const invoiceId = req.params.invoiceId as string;
      
      if (!invoiceId) {
        throw Errors.badRequest('Invoice ID is required');
      }

      const payments = await PaymentService.getInvoicePayments(invoiceId, companyId);
      return res.json({ success: true, data: payments });
    } catch (error: unknown) {
      return handleControllerError('PaymentController.getInvoicePayments', error, res);
    }
  }
}
