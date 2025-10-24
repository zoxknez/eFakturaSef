// @ts-nocheck - Temporary workaround for Prisma Client cache issue (Payment model not recognized by TS Server)
import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../db/prisma';
import { logger } from '../utils/logger';
import { Decimal } from '@prisma/client/runtime/library';

// ========================================
// ZOD VALIDATION SCHEMAS
// ========================================

const CreatePaymentSchema = z.object({
  invoiceId: z.string().uuid('Invalid invoice ID'),
  amount: z.number().positive('Payment amount must be positive'),
  currency: z.string().default('RSD'),
  paymentDate: z.string().datetime().optional(), // ISO datetime string
  method: z.enum(['CASH', 'BANK_TRANSFER', 'CARD', 'CHECK', 'COMPENSATION', 'OTHER']),
  bankAccount: z.string().optional(),
  reference: z.string().optional(),
  note: z.string().optional(),
});

const ListPaymentsQuerySchema = z.object({
  page: z.string().optional().default('1'),
  limit: z.string().optional().default('50'),
  invoiceId: z.string().uuid().optional(),
  method: z.enum(['CASH', 'BANK_TRANSFER', 'CARD', 'CHECK', 'COMPENSATION', 'OTHER']).optional(),
  status: z.enum(['PENDING', 'CLEARED', 'BOUNCED', 'CANCELLED']).optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  sortBy: z.enum(['paymentDate', 'amount', 'createdAt']).optional().default('paymentDate'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

// ========================================
// PAYMENT CONTROLLER
// ========================================

export class PaymentController {
  /**
   * Record a payment for an invoice
   * POST /api/payments
   */
  static async create(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;

      // Get user's company
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { companyId: true },
      });

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

      const data = validationResult.data;

      // Check if invoice exists and belongs to user's company
      const invoice = await prisma.invoice.findFirst({
        where: {
          id: data.invoiceId,
          companyId: user.companyId,
        },
      });

      if (!invoice) {
        return res.status(404).json({ error: 'Invoice not found' });
      }

      const totalAmount = Number(invoice.totalAmount || 0);
      const paidAmount = Number(invoice.paidAmount || 0);
      const remainingAmount = totalAmount - paidAmount;

      // Check if payment amount is valid
      if (data.amount > remainingAmount) {
        return res.status(400).json({
          error: 'Payment amount exceeds remaining balance',
          totalAmount,
          paidAmount,
          remainingAmount,
          attemptedPayment: data.amount,
        });
      }

      // Create payment and update invoice in a transaction
      const result = await prisma.$transaction(async (tx) => {
        // Create payment
        const payment = await tx.payment.create({
          data: {
            invoiceId: data.invoiceId,
            amount: data.amount,
            currency: data.currency,
            paymentDate: data.paymentDate ? new Date(data.paymentDate) : new Date(),
            method: data.method,
            bankAccount: data.bankAccount,
            reference: data.reference,
            note: data.note,
            status: 'CLEARED',
            createdBy: userId,
          },
        });

        // Calculate new paid amount
        const newPaidAmount = paidAmount + data.amount;

        // Determine new payment status
        let paymentStatus: 'UNPAID' | 'PARTIAL' | 'PAID' | 'OVERDUE';
        if (newPaidAmount === 0) {
          paymentStatus = 'UNPAID';
        } else if (newPaidAmount < totalAmount) {
          paymentStatus = 'PARTIAL';
        } else {
          paymentStatus = 'PAID';
        }

        // Update invoice
        const updatedInvoice = await tx.invoice.update({
          where: { id: data.invoiceId },
          data: {
            paidAmount: newPaidAmount,
            paymentStatus,
          },
        });

        return { payment, invoice: updatedInvoice };
      });

      logger.info(
        `Payment recorded: ${result.payment.id} for invoice ${data.invoiceId} ` +
        `(${data.amount} ${data.currency}, new status: ${result.invoice.paymentStatus}) by user ${userId}`
      );

      res.status(201).json(result);
    } catch (error: any) {
      logger.error('Failed to record payment:', error);
      res.status(500).json({ error: 'Failed to record payment' });
    }
  }

  /**
   * List payments with filtering
   * GET /api/payments
   */
  static async list(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;

      // Get user's company
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { companyId: true },
      });

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
      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);
      const skip = (pageNum - 1) * limitNum;

      // Build where clause
      const where: any = {
        invoice: {
          companyId: user.companyId,
        },
      };

      if (invoiceId) {
        where.invoiceId = invoiceId;
      }

      if (method) {
        where.method = method;
      }

      if (status) {
        where.status = status;
      }

      if (dateFrom || dateTo) {
        where.paymentDate = {};
        if (dateFrom) {
          where.paymentDate.gte = new Date(dateFrom);
        }
        if (dateTo) {
          where.paymentDate.lte = new Date(dateTo);
        }
      }

      // Get total count
      const total = await prisma.payment.count({ where });

      // Get payments
      const payments = await prisma.payment.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { [sortBy]: sortOrder },
        include: {
          invoice: {
            select: {
              invoiceNumber: true,
              totalAmount: true,
              paidAmount: true,
              paymentStatus: true,
              partner: {
                select: {
                  name: true,
                  pib: true,
                },
              },
            },
          },
        },
      });

      res.json({
        data: payments,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      });
    } catch (error: any) {
      logger.error('Failed to list payments:', error);
      res.status(500).json({ error: 'Failed to fetch payments' });
    }
  }

  /**
   * Get single payment by ID
   * GET /api/payments/:id
   */
  static async get(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      const { id } = req.params;

      // Get user's company
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { companyId: true },
      });

      if (!user?.companyId) {
        return res.status(403).json({ error: 'User not associated with a company' });
      }

      const payment = await prisma.payment.findFirst({
        where: {
          id,
          invoice: {
            companyId: user.companyId,
          },
        },
        include: {
          invoice: {
            select: {
              invoiceNumber: true,
              totalAmount: true,
              paidAmount: true,
              paymentStatus: true,
              issueDate: true,
              dueDate: true,
              partner: {
                select: {
                  name: true,
                  pib: true,
                },
              },
            },
          },
        },
      });

      if (!payment) {
        return res.status(404).json({ error: 'Payment not found' });
      }

      res.json(payment);
    } catch (error: any) {
      logger.error('Failed to get payment:', error);
      res.status(500).json({ error: 'Failed to fetch payment' });
    }
  }

  /**
   * Cancel a payment (and revert invoice status)
   * DELETE /api/payments/:id
   */
  static async cancel(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      const { id } = req.params;

      // Get user's company
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { companyId: true },
      });

      if (!user?.companyId) {
        return res.status(403).json({ error: 'User not associated with a company' });
      }

      // Check if payment exists
      const payment = await prisma.payment.findFirst({
        where: {
          id,
          invoice: {
            companyId: user.companyId,
          },
        },
        include: {
          invoice: true,
        },
      });

      if (!payment) {
        return res.status(404).json({ error: 'Payment not found' });
      }

      if (payment.status === 'CANCELLED') {
        return res.status(400).json({ error: 'Payment is already cancelled' });
      }

      // Cancel payment and update invoice in a transaction
      const result = await prisma.$transaction(async (tx) => {
        // Mark payment as cancelled
        const cancelledPayment = await tx.payment.update({
          where: { id },
          data: { status: 'CANCELLED' },
        });

        // Calculate new paid amount (subtract this payment)
        const invoice = payment.invoice;
        const totalAmount = Number(invoice.totalAmount || 0);
        const currentPaidAmount = Number(invoice.paidAmount || 0);
        const newPaidAmount = Math.max(0, currentPaidAmount - Number(payment.amount));

        // Determine new payment status
        let paymentStatus: 'UNPAID' | 'PARTIAL' | 'PAID' | 'OVERDUE';
        if (newPaidAmount === 0) {
          paymentStatus = 'UNPAID';
        } else if (newPaidAmount < totalAmount) {
          paymentStatus = 'PARTIAL';
        } else {
          paymentStatus = 'PAID';
        }

        // Update invoice
        const updatedInvoice = await tx.invoice.update({
          where: { id: invoice.id },
          data: {
            paidAmount: newPaidAmount,
            paymentStatus,
          },
        });

        return { payment: cancelledPayment, invoice: updatedInvoice };
      });

      logger.info(
        `Payment cancelled: ${id} for invoice ${payment.invoiceId} ` +
        `(reverted ${payment.amount} ${payment.currency}, new status: ${result.invoice.paymentStatus}) by user ${userId}`
      );

      res.json(result);
    } catch (error: any) {
      logger.error('Failed to cancel payment:', error);
      res.status(500).json({ error: 'Failed to cancel payment' });
    }
  }

  /**
   * Get payment statistics
   * GET /api/payments/stats
   */
  static async stats(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      const { dateFrom, dateTo } = req.query;

      // Get user's company
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { companyId: true },
      });

      if (!user?.companyId) {
        return res.status(403).json({ error: 'User not associated with a company' });
      }

      // Build where clause
      const where: any = {
        invoice: {
          companyId: user.companyId,
        },
        status: 'CLEARED',
      };

      if (dateFrom || dateTo) {
        where.paymentDate = {};
        if (dateFrom && typeof dateFrom === 'string') {
          where.paymentDate.gte = new Date(dateFrom);
        }
        if (dateTo && typeof dateTo === 'string') {
          where.paymentDate.lte = new Date(dateTo);
        }
      }

      // Get all completed payments
      const payments = await prisma.payment.findMany({
        where,
        select: {
          amount: true,
          currency: true,
          method: true,
        },
      });

      const stats = {
        totalPayments: payments.length,
        totalAmount: payments.reduce((sum, p) => sum + Number(p.amount || 0), 0),
        byMethod: {
          cash: payments.filter(p => p.method === 'CASH').reduce((sum, p) => sum + Number(p.amount || 0), 0),
          bankTransfer: payments.filter(p => p.method === 'BANK_TRANSFER').reduce((sum, p) => sum + Number(p.amount || 0), 0),
          card: payments.filter(p => p.method === 'CARD').reduce((sum, p) => sum + Number(p.amount || 0), 0),
          check: payments.filter(p => p.method === 'CHECK').reduce((sum, p) => sum + Number(p.amount || 0), 0),
          other: payments.filter(p => p.method === 'OTHER').reduce((sum, p) => sum + Number(p.amount || 0), 0),
        },
      };

      res.json(stats);
    } catch (error: any) {
      logger.error('Failed to get payment stats:', error);
      res.status(500).json({ error: 'Failed to fetch payment statistics' });
    }
  }

  /**
   * Get payments for a specific invoice
   * GET /api/invoices/:invoiceId/payments
   */
  static async getInvoicePayments(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      const { invoiceId } = req.params;

      // Get user's company
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { companyId: true },
      });

      if (!user?.companyId) {
        return res.status(403).json({ error: 'User not associated with a company' });
      }

      // Check if invoice exists
      const invoice = await prisma.invoice.findFirst({
        where: {
          id: invoiceId,
          companyId: user.companyId,
        },
      });

      if (!invoice) {
        return res.status(404).json({ error: 'Invoice not found' });
      }

      // Get all payments for this invoice
      const payments = await prisma.payment.findMany({
        where: {
          invoiceId,
        },
        orderBy: {
          paymentDate: 'desc',
        },
      });

      res.json(payments);
    } catch (error: any) {
      logger.error('Failed to get invoice payments:', error);
      res.status(500).json({ error: 'Failed to fetch invoice payments' });
    }
  }
}
