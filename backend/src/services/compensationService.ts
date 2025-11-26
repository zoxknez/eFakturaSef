/**
 * Compensation Service - Kompenzacije
 * Prebijanje dugovanja i potraživanja
 */

import { prisma } from '../db/prisma';
import { Decimal } from '@prisma/client/runtime/library';
import logger from '../utils/logger';

interface CompensationItemData {
  type: 'RECEIVABLE' | 'PAYABLE';
  invoiceId?: string;
  documentNumber: string;
  documentDate: Date;
  originalAmount: number;
  compensatedAmount: number;
}

interface CreateCompensationData {
  partnerId: string;
  date: Date;
  items: CompensationItemData[];
  note?: string;
}

export class CompensationService {
  /**
   * Get next compensation number
   */
  private static async getNextNumber(companyId: string, year: number): Promise<string> {
    const count = await prisma.compensation.count({
      where: {
        companyId,
        date: {
          gte: new Date(year, 0, 1),
          lte: new Date(year, 11, 31, 23, 59, 59),
        },
      },
    });

    return `KOMP-${year}-${String(count + 1).padStart(4, '0')}`;
  }

  /**
   * Get open items for a partner (for compensation)
   */
  static async getOpenItemsForPartner(companyId: string, partnerId: string) {
    // Get unpaid outgoing invoices (our receivables)
    const receivables = await prisma.invoice.findMany({
      where: {
        companyId,
        partnerId,
        type: 'OUTGOING',
        paymentStatus: { in: ['UNPAID', 'PARTIALLY_PAID', 'OVERDUE'] },
      },
      select: {
        id: true,
        invoiceNumber: true,
        issueDate: true,
        dueDate: true,
        totalAmount: true,
        paidAmount: true,
      },
    });

    // Get unpaid incoming invoices from partner (our payables)
    const partner = await prisma.partner.findUnique({
      where: { id: partnerId },
    });

    const payables = await prisma.incomingInvoice.findMany({
      where: {
        companyId,
        supplierPIB: partner?.pib,
        paymentStatus: { in: ['UNPAID', 'PARTIALLY_PAID'] },
      },
      select: {
        id: true,
        invoiceNumber: true,
        issueDate: true,
        dueDate: true,
        totalAmount: true,
        paidAmount: true,
      },
    });

    return {
      receivables: receivables.map(inv => ({
        type: 'RECEIVABLE' as const,
        invoiceId: inv.id,
        documentNumber: inv.invoiceNumber,
        documentDate: inv.issueDate,
        dueDate: inv.dueDate,
        originalAmount: Number(inv.totalAmount),
        paidAmount: Number(inv.paidAmount),
        openAmount: Number(inv.totalAmount) - Number(inv.paidAmount),
      })),
      payables: payables.map(inv => ({
        type: 'PAYABLE' as const,
        invoiceId: inv.id,
        documentNumber: inv.invoiceNumber,
        documentDate: inv.issueDate,
        dueDate: inv.dueDate,
        originalAmount: Number(inv.totalAmount),
        paidAmount: Number(inv.paidAmount),
        openAmount: Number(inv.totalAmount) - Number(inv.paidAmount),
      })),
      summary: {
        totalReceivables: receivables.reduce((sum, inv) => 
          sum + Number(inv.totalAmount) - Number(inv.paidAmount), 0),
        totalPayables: payables.reduce((sum, inv) => 
          sum + Number(inv.totalAmount) - Number(inv.paidAmount), 0),
      },
    };
  }

  /**
   * Create a new compensation
   */
  static async createCompensation(companyId: string, data: CreateCompensationData) {
    const year = data.date.getFullYear();
    const number = await this.getNextNumber(companyId, year);

    // Calculate total compensation amount
    const totalReceivables = data.items
      .filter(i => i.type === 'RECEIVABLE')
      .reduce((sum, i) => sum + i.compensatedAmount, 0);
    
    const totalPayables = data.items
      .filter(i => i.type === 'PAYABLE')
      .reduce((sum, i) => sum + i.compensatedAmount, 0);

    // Compensation amount should be the minimum of receivables and payables
    const totalAmount = Math.min(totalReceivables, totalPayables);

    if (totalAmount <= 0) {
      throw new Error('Compensation amount must be greater than zero');
    }

    if (Math.abs(totalReceivables - totalPayables) > 0.01) {
      throw new Error('Receivables and payables must be balanced for compensation');
    }

    const compensation = await prisma.compensation.create({
      data: {
        companyId,
        number,
        date: data.date,
        partnerId: data.partnerId,
        totalAmount: new Decimal(totalAmount),
        note: data.note,
        status: 'DRAFT',
        items: {
          create: data.items.map(item => ({
            type: item.type,
            invoiceId: item.invoiceId,
            documentNumber: item.documentNumber,
            documentDate: item.documentDate,
            originalAmount: new Decimal(item.originalAmount),
            compensatedAmount: new Decimal(item.compensatedAmount),
            remainingAmount: new Decimal(item.originalAmount - item.compensatedAmount),
          })),
        },
      },
      include: {
        items: true,
        partner: true,
      },
    });

    logger.info(`Compensation created`, { compensationId: compensation.id, number, totalAmount });

    return compensation;
  }

  /**
   * Sign/confirm compensation
   */
  static async signCompensation(compensationId: string, companyId: string) {
    const compensation = await prisma.compensation.findUnique({
      where: { id: compensationId, companyId },
      include: { items: true },
    });

    if (!compensation) {
      throw new Error('Compensation not found');
    }

    if (compensation.status !== 'DRAFT' && compensation.status !== 'PENDING') {
      throw new Error('Compensation cannot be signed in current status');
    }

    // Update invoice payment amounts
    for (const item of compensation.items) {
      if (item.invoiceId) {
        if (item.type === 'RECEIVABLE') {
          // Update outgoing invoice
          await prisma.invoice.update({
            where: { id: item.invoiceId },
            data: {
              paidAmount: {
                increment: item.compensatedAmount,
              },
            },
          });

          // Check if fully paid
          const invoice = await prisma.invoice.findUnique({
            where: { id: item.invoiceId },
          });
          if (invoice && Number(invoice.paidAmount) >= Number(invoice.totalAmount)) {
            await prisma.invoice.update({
              where: { id: item.invoiceId },
              data: { paymentStatus: 'PAID' },
            });
          } else if (invoice && Number(invoice.paidAmount) > 0) {
            await prisma.invoice.update({
              where: { id: item.invoiceId },
              data: { paymentStatus: 'PARTIALLY_PAID' },
            });
          }
        } else {
          // Update incoming invoice
          await prisma.incomingInvoice.update({
            where: { id: item.invoiceId },
            data: {
              paidAmount: {
                increment: item.compensatedAmount,
              },
            },
          });

          const invoice = await prisma.incomingInvoice.findUnique({
            where: { id: item.invoiceId },
          });
          if (invoice && Number(invoice.paidAmount) >= Number(invoice.totalAmount)) {
            await prisma.incomingInvoice.update({
              where: { id: item.invoiceId },
              data: { paymentStatus: 'PAID' },
            });
          } else if (invoice && Number(invoice.paidAmount) > 0) {
            await prisma.incomingInvoice.update({
              where: { id: item.invoiceId },
              data: { paymentStatus: 'PARTIALLY_PAID' },
            });
          }
        }
      }
    }

    // Update compensation status
    const updated = await prisma.compensation.update({
      where: { id: compensationId },
      data: {
        status: 'SIGNED',
        signedAt: new Date(),
      },
      include: {
        items: true,
        partner: true,
      },
    });

    logger.info(`Compensation signed`, { compensationId, number: updated.number });

    return updated;
  }

  /**
   * Get compensation by ID
   */
  static async getById(compensationId: string, companyId: string) {
    return prisma.compensation.findUnique({
      where: { id: compensationId, companyId },
      include: {
        items: true,
        partner: true,
      },
    });
  }

  /**
   * Get all compensations
   */
  static async getAll(
    companyId: string,
    options?: {
      partnerId?: string;
      status?: string;
      fromDate?: Date;
      toDate?: Date;
      page?: number;
      limit?: number;
    }
  ) {
    const where: any = { companyId };

    if (options?.partnerId) where.partnerId = options.partnerId;
    if (options?.status) where.status = options.status;
    if (options?.fromDate || options?.toDate) {
      where.date = {};
      if (options.fromDate) where.date.gte = options.fromDate;
      if (options.toDate) where.date.lte = options.toDate;
    }

    const page = options?.page || 1;
    const limit = options?.limit || 20;

    const [compensations, total] = await Promise.all([
      prisma.compensation.findMany({
        where,
        include: {
          partner: {
            select: { id: true, name: true, pib: true },
          },
          _count: { select: { items: true } },
        },
        orderBy: { date: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.compensation.count({ where }),
    ]);

    return {
      data: compensations,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Cancel compensation
   */
  static async cancelCompensation(compensationId: string, companyId: string) {
    const compensation = await prisma.compensation.findUnique({
      where: { id: compensationId, companyId },
      include: { items: true },
    });

    if (!compensation) {
      throw new Error('Compensation not found');
    }

    if (compensation.status === 'SIGNED') {
      // Reverse the payment updates
      for (const item of compensation.items) {
        if (item.invoiceId) {
          if (item.type === 'RECEIVABLE') {
            await prisma.invoice.update({
              where: { id: item.invoiceId },
              data: {
                paidAmount: {
                  decrement: item.compensatedAmount,
                },
                paymentStatus: 'UNPAID', // Will be recalculated
              },
            });
          } else {
            await prisma.incomingInvoice.update({
              where: { id: item.invoiceId },
              data: {
                paidAmount: {
                  decrement: item.compensatedAmount,
                },
                paymentStatus: 'UNPAID',
              },
            });
          }
        }
      }
    }

    return prisma.compensation.update({
      where: { id: compensationId },
      data: { status: 'CANCELLED' },
    });
  }
}

export default CompensationService;
