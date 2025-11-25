import { Prisma } from '@prisma/client';
import { prisma } from '../db/prisma';
import { logger } from '../utils/logger';
import { z } from 'zod';

// ========================================
// ZOD VALIDATION SCHEMAS
// ========================================

export const CreatePaymentSchema = z.object({
  invoiceId: z.string().uuid('Invalid invoice ID'),
  amount: z.number().positive('Payment amount must be positive'),
  currency: z.string().default('RSD'),
  paymentDate: z.string().datetime().optional(), // ISO datetime string
  method: z.enum(['CASH', 'BANK_TRANSFER', 'CARD', 'CHECK', 'COMPENSATION', 'OTHER']),
  bankAccount: z.string().optional(),
  reference: z.string().optional(),
  note: z.string().optional(),
});

export const ListPaymentsQuerySchema = z.object({
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

export type CreatePaymentDTO = z.infer<typeof CreatePaymentSchema>;

export interface PaymentListParams {
  page?: number;
  limit?: number;
  invoiceId?: string;
  method?: 'CASH' | 'BANK_TRANSFER' | 'CARD' | 'CHECK' | 'COMPENSATION' | 'OTHER';
  status?: 'PENDING' | 'CLEARED' | 'BOUNCED' | 'CANCELLED';
  dateFrom?: string;
  dateTo?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export class PaymentService {
  /**
   * Record a payment for an invoice
   */
  static async createPayment(companyId: string, data: CreatePaymentDTO, userId: string) {
    // Check if invoice exists and belongs to user's company
    const invoice = await prisma.invoice.findFirst({
      where: {
        id: data.invoiceId,
        companyId,
      },
    });

    if (!invoice) {
      throw new Error('Invoice not found');
    }

    const totalAmount = Number(invoice.totalAmount || 0);
    const paidAmount = Number(invoice.paidAmount || 0);
    const remainingAmount = totalAmount - paidAmount;

    // Check if payment amount is valid
    if (data.amount > remainingAmount) {
      throw new Error(`Payment amount exceeds remaining balance. Remaining: ${remainingAmount}, Attempted: ${data.amount}`);
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
          description: data.note,
          status: 'CLEARED',
          createdBy: userId,
        },
      });

      // Calculate new paid amount
      const newPaidAmount = paidAmount + data.amount;

      // Determine new payment status
      let paymentStatus: 'UNPAID' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE';
      if (newPaidAmount === 0) {
        paymentStatus = 'UNPAID';
      } else if (newPaidAmount < totalAmount) {
        paymentStatus = 'PARTIALLY_PAID';
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

    return result;
  }

  /**
   * List payments with filtering
   */
  static async listPayments(companyId: string, params: PaymentListParams) {
    const { 
      page = 1, 
      limit = 50, 
      invoiceId, 
      method, 
      status, 
      dateFrom, 
      dateTo, 
      sortBy = 'paymentDate', 
      sortOrder = 'desc' 
    } = params;

    const skip = (page - 1) * limit;

    // Build where clause
    const where: Prisma.PaymentWhereInput = {
      invoice: {
        companyId,
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
      take: limit,
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

    return {
      data: payments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get single payment by ID
   */
  static async getPayment(id: string, companyId: string) {
    const payment = await prisma.payment.findFirst({
      where: {
        id,
        invoice: {
          companyId,
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
      throw new Error('Payment not found');
    }

    return payment;
  }

  /**
   * Cancel a payment (and revert invoice status)
   */
  static async cancelPayment(id: string, companyId: string, userId: string) {
    // Check if payment exists
    const payment = await prisma.payment.findFirst({
      where: {
        id,
        invoice: {
          companyId,
        },
      },
      include: {
        invoice: true,
      },
    });

    if (!payment) {
      throw new Error('Payment not found');
    }

    if (payment.status === 'CANCELLED') {
      throw new Error('Payment is already cancelled');
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
      let paymentStatus: 'UNPAID' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE';
      if (newPaidAmount === 0) {
        paymentStatus = 'UNPAID';
      } else if (newPaidAmount < totalAmount) {
        paymentStatus = 'PARTIALLY_PAID';
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

    return result;
  }

  /**
   * Get payment statistics
   */
  static async getStats(companyId: string, dateFrom?: string, dateTo?: string) {
    // Build where clause
    const where: Prisma.PaymentWhereInput = {
      invoice: {
        companyId,
      },
      status: 'CLEARED',
    };

    if (dateFrom || dateTo) {
      where.paymentDate = {};
      if (dateFrom) {
        where.paymentDate.gte = new Date(dateFrom);
      }
      if (dateTo) {
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

    return {
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
  }

  /**
   * Get payments for a specific invoice
   */
  static async getInvoicePayments(invoiceId: string, companyId: string) {
    // Check if invoice exists
    const invoice = await prisma.invoice.findFirst({
      where: {
        id: invoiceId,
        companyId,
      },
    });

    if (!invoice) {
      throw new Error('Invoice not found');
    }

    // Get all payments for this invoice
    return prisma.payment.findMany({
      where: {
        invoiceId,
      },
      orderBy: {
        paymentDate: 'desc',
      },
    });
  }
}
