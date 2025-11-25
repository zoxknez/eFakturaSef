import { Request, Response } from 'express';
import { logger } from '../utils/logger';
import { PaymentService, CreatePaymentSchema, ListPaymentsQuerySchema } from '../services/paymentService';

export class PaymentController {
  /**
   * Record a payment for an invoice
   * POST /api/payments
   */
  static async create(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      if (!user?.companyId) {
        return res.status(403).json({ error: 'User not associated with a company' });
      }

      // Validate request body
      const validationResult = CreatePaymentSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({
          error: 'Validation failed',
          details: validationResult.error.format(),
        });
      }

      const result = await PaymentService.createPayment(user.companyId, validationResult.data, user.id);
      return res.status(201).json(result);
    } catch (error: any) {
      logger.error('Failed to record payment:', error);
      if (error.message === 'Invoice not found') {
        return res.status(404).json({ error: error.message });
      }
      if (error.message.includes('exceeds remaining balance')) {
        return res.status(400).json({ error: error.message });
      }
      return res.status(500).json({ error: 'Failed to record payment' });
    }
  }

  /**
   * List payments with filtering
   * GET /api/payments
   */
  static async list(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      if (!user?.companyId) {
        return res.status(403).json({ error: 'User not associated with a company' });
      }

      // Validate query params
      const queryResult = ListPaymentsQuerySchema.safeParse(req.query);
      if (!queryResult.success) {
        return res.status(400).json({
          error: 'Invalid query parameters',
          details: queryResult.error.format(),
        });
      }

      const { page, limit, invoiceId, method, status, dateFrom, dateTo, sortBy, sortOrder } = queryResult.data;

      const result = await PaymentService.listPayments(user.companyId, {
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

      return res.json(result);
    } catch (error: any) {
      logger.error('Failed to list payments:', error);
      return res.status(500).json({ error: 'Failed to fetch payments' });
    }
  }

  /**
   * Get single payment by ID
   * GET /api/payments/:id
   */
  static async get(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const id = req.params.id as string;

      if (!user?.companyId) {
        return res.status(403).json({ error: 'User not associated with a company' });
      }

      const payment = await PaymentService.getPayment(id, user.companyId);
      return res.json(payment);
    } catch (error: any) {
      logger.error('Failed to get payment:', error);
      if (error.message === 'Payment not found') {
        return res.status(404).json({ error: error.message });
      }
      return res.status(500).json({ error: 'Failed to fetch payment' });
    }
  }

  /**
   * Cancel a payment (and revert invoice status)
   * DELETE /api/payments/:id
   */
  static async cancel(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const id = req.params.id as string;

      if (!user?.companyId) {
        return res.status(403).json({ error: 'User not associated with a company' });
      }

      const result = await PaymentService.cancelPayment(id, user.companyId, user.id);
      return res.json(result);
    } catch (error: any) {
      logger.error('Failed to cancel payment:', error);
      if (error.message === 'Payment not found') {
        return res.status(404).json({ error: error.message });
      }
      if (error.message === 'Payment is already cancelled') {
        return res.status(400).json({ error: error.message });
      }
      return res.status(500).json({ error: 'Failed to cancel payment' });
    }
  }

  /**
   * Get payment statistics
   * GET /api/payments/stats
   */
  static async stats(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const { dateFrom, dateTo } = req.query;

      if (!user?.companyId) {
        return res.status(403).json({ error: 'User not associated with a company' });
      }

      const stats = await PaymentService.getStats(
        user.companyId, 
        typeof dateFrom === 'string' ? dateFrom : undefined,
        typeof dateTo === 'string' ? dateTo : undefined
      );
      
      return res.json(stats);
    } catch (error: any) {
      logger.error('Failed to get payment stats:', error);
      return res.status(500).json({ error: 'Failed to fetch payment statistics' });
    }
  }

  /**
   * Get payments for a specific invoice
   * GET /api/invoices/:invoiceId/payments
   */
  static async getInvoicePayments(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const invoiceId = req.params.invoiceId as string;

      if (!user?.companyId) {
        return res.status(403).json({ error: 'User not associated with a company' });
      }

      const payments = await PaymentService.getInvoicePayments(invoiceId, user.companyId);
      return res.json(payments);
    } catch (error: any) {
      logger.error('Failed to get invoice payments:', error);
      if (error.message === 'Invoice not found') {
        return res.status(404).json({ error: error.message });
      }
      return res.status(500).json({ error: 'Failed to fetch invoice payments' });
    }
  }
}
