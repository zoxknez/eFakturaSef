/**
 * IOS Service - Izvod Otvorenih Stavki
 * Statement of Open Items
 */

import { prisma } from '../db/prisma';
import { Decimal } from '@prisma/client/runtime/library';
import logger from '../utils/logger';

interface IOSItemData {
  documentType: string;
  documentNumber: string;
  documentDate: Date;
  dueDate?: Date;
  debitAmount: number;
  creditAmount: number;
  invoiceId?: string;
}

export class IOSService {
  /**
   * Get next IOS number
   */
  private static async getNextNumber(companyId: string, year: number): Promise<string> {
    const count = await prisma.iOSReport.count({
      where: {
        companyId,
        asOfDate: {
          gte: new Date(year, 0, 1),
          lte: new Date(year, 11, 31, 23, 59, 59),
        },
      },
    });

    return `IOS-${year}-${String(count + 1).padStart(4, '0')}`;
  }

  /**
   * Generate IOS for a partner
   */
  static async generateIOS(companyId: string, partnerId: string, asOfDate: Date = new Date()) {
    const partner = await prisma.partner.findUnique({
      where: { id: partnerId },
    });

    if (!partner) {
      throw new Error('Partner not found');
    }

    // Get all transactions with this partner
    const items: IOSItemData[] = [];
    let totalReceivable = 0;
    let totalPayable = 0;

    // Get outgoing invoices (our receivables)
    const outgoingInvoices = await prisma.invoice.findMany({
      where: {
        companyId,
        partnerId,
        type: 'OUTGOING',
        issueDate: { lte: asOfDate },
      },
      orderBy: { issueDate: 'asc' },
    });

    for (const inv of outgoingInvoices) {
      const amount = Number(inv.totalAmount);
      const paidAmount = Number(inv.paidAmount);
      const openAmount = amount - paidAmount;

      if (openAmount > 0.01) {
        items.push({
          documentType: 'INVOICE',
          documentNumber: inv.invoiceNumber,
          documentDate: inv.issueDate,
          dueDate: inv.dueDate || undefined,
          debitAmount: openAmount,
          creditAmount: 0,
          invoiceId: inv.id,
        });
        totalReceivable += openAmount;
      }
    }

    // Get payments received from partner
    const paymentsReceived = await prisma.payment.findMany({
      where: {
        invoice: {
          companyId,
          partnerId,
          type: 'OUTGOING',
        },
        paymentDate: { lte: asOfDate },
        status: 'CLEARED',
      },
      include: { invoice: true },
    });

    for (const payment of paymentsReceived) {
      items.push({
        documentType: 'PAYMENT_RECEIVED',
        documentNumber: payment.reference || `PAY-${payment.id.slice(0, 8)}`,
        documentDate: payment.paymentDate,
        debitAmount: 0,
        creditAmount: Number(payment.amount),
      });
    }

    // Get incoming invoices from partner (our payables)
    const incomingInvoices = await prisma.incomingInvoice.findMany({
      where: {
        companyId,
        supplierPIB: partner.pib,
        issueDate: { lte: asOfDate },
      },
      orderBy: { issueDate: 'asc' },
    });

    for (const inv of incomingInvoices) {
      const amount = Number(inv.totalAmount);
      const paidAmount = Number(inv.paidAmount);
      const openAmount = amount - paidAmount;

      if (openAmount > 0.01) {
        items.push({
          documentType: 'INCOMING_INVOICE',
          documentNumber: inv.invoiceNumber,
          documentDate: inv.issueDate,
          dueDate: inv.dueDate || undefined,
          debitAmount: 0,
          creditAmount: openAmount,
          invoiceId: inv.id,
        });
        totalPayable += openAmount;
      }
    }

    // Calculate balance
    const balance = totalReceivable - totalPayable;

    // Generate IOS number
    const year = asOfDate.getFullYear();
    const number = await this.getNextNumber(companyId, year);

    // Create IOS report
    const ios = await prisma.iOSReport.create({
      data: {
        companyId,
        number,
        partnerId,
        asOfDate,
        totalReceivable: new Decimal(totalReceivable),
        totalPayable: new Decimal(totalPayable),
        balance: new Decimal(balance),
        status: 'DRAFT',
        items: {
          create: items.map(item => ({
            documentType: item.documentType,
            documentNumber: item.documentNumber,
            documentDate: item.documentDate,
            dueDate: item.dueDate,
            debitAmount: new Decimal(item.debitAmount),
            creditAmount: new Decimal(item.creditAmount),
            balance: new Decimal(item.debitAmount - item.creditAmount),
            invoiceId: item.invoiceId,
          })),
        },
      },
      include: {
        items: true,
        partner: true,
      },
    });

    logger.info(`IOS generated`, {
      iosId: ios.id,
      number,
      partnerId,
      totalReceivable,
      totalPayable,
      balance,
    });

    return ios;
  }

  /**
   * Get IOS by ID
   */
  static async getById(iosId: string, companyId: string) {
    return prisma.iOSReport.findUnique({
      where: { id: iosId, companyId },
      include: {
        items: {
          orderBy: { documentDate: 'asc' },
        },
        partner: true,
      },
    });
  }

  /**
   * Get all IOS reports
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
      where.asOfDate = {};
      if (options.fromDate) where.asOfDate.gte = options.fromDate;
      if (options.toDate) where.asOfDate.lte = options.toDate;
    }

    const page = options?.page || 1;
    const limit = options?.limit || 20;

    const [reports, total] = await Promise.all([
      prisma.iOSReport.findMany({
        where,
        include: {
          partner: {
            select: { id: true, name: true, pib: true },
          },
          _count: { select: { items: true } },
        },
        orderBy: { asOfDate: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.iOSReport.count({ where }),
    ]);

    return {
      data: reports,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Mark IOS as sent
   */
  static async markAsSent(iosId: string, companyId: string) {
    return prisma.iOSReport.update({
      where: { id: iosId, companyId },
      data: {
        status: 'SENT',
        sentAt: new Date(),
      },
    });
  }

  /**
   * Confirm IOS (partner confirmed)
   */
  static async confirmIOS(iosId: string, companyId: string, notes?: string) {
    return prisma.iOSReport.update({
      where: { id: iosId, companyId },
      data: {
        status: 'CONFIRMED',
        confirmedAt: new Date(),
        partnerConfirmed: true,
        partnerNotes: notes,
      },
    });
  }

  /**
   * Mark IOS as disputed
   */
  static async disputeIOS(iosId: string, companyId: string, notes: string) {
    return prisma.iOSReport.update({
      where: { id: iosId, companyId },
      data: {
        status: 'DISPUTED',
        partnerConfirmed: false,
        partnerNotes: notes,
      },
    });
  }

  /**
   * Get partner balance summary
   */
  static async getPartnerBalanceSummary(companyId: string) {
    const partners = await prisma.partner.findMany({
      where: { companyId, isActive: true },
    });

    const summaries = await Promise.all(
      partners.map(async (partner) => {
        // Get receivables
        const receivables = await prisma.invoice.aggregate({
          where: {
            companyId,
            partnerId: partner.id,
            type: 'OUTGOING',
            paymentStatus: { in: ['UNPAID', 'PARTIALLY_PAID', 'OVERDUE'] },
          },
          _sum: {
            totalAmount: true,
            paidAmount: true,
          },
        });

        // Get payables
        const payables = await prisma.incomingInvoice.aggregate({
          where: {
            companyId,
            supplierPIB: partner.pib,
            paymentStatus: { in: ['UNPAID', 'PARTIALLY_PAID'] },
          },
          _sum: {
            totalAmount: true,
            paidAmount: true,
          },
        });

        const totalReceivable = 
          Number(receivables._sum.totalAmount || 0) - Number(receivables._sum.paidAmount || 0);
        const totalPayable = 
          Number(payables._sum.totalAmount || 0) - Number(payables._sum.paidAmount || 0);

        return {
          partnerId: partner.id,
          partnerName: partner.name,
          partnerPIB: partner.pib,
          totalReceivable,
          totalPayable,
          balance: totalReceivable - totalPayable,
        };
      })
    );

    // Filter out zero balances and sort by absolute balance
    return summaries
      .filter(s => Math.abs(s.balance) > 0.01)
      .sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance));
  }
}

export default IOSService;
