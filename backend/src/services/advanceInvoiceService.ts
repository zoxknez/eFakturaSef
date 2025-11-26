/**
 * Advance Invoice Service - Avansne fakture
 */

import { prisma } from '../db/prisma';
import { Decimal } from '@prisma/client/runtime/library';
import logger from '../utils/logger';

interface CreateAdvanceInvoiceData {
  partnerId: string;
  issueDate: Date;
  advanceAmount: number;
  taxRate: number; // 20 or 10
  currency?: string;
  note?: string;
}

export class AdvanceInvoiceService {
  /**
   * Get next advance invoice number
   */
  private static async getNextNumber(companyId: string, year: number): Promise<string> {
    const count = await prisma.advanceInvoice.count({
      where: {
        companyId,
        issueDate: {
          gte: new Date(year, 0, 1),
          lte: new Date(year, 11, 31, 23, 59, 59),
        },
      },
    });

    return `AV-${year}-${String(count + 1).padStart(4, '0')}`;
  }

  /**
   * Create advance invoice
   */
  static async create(companyId: string, data: CreateAdvanceInvoiceData) {
    const year = data.issueDate.getFullYear();
    const invoiceNumber = await this.getNextNumber(companyId, year);

    // Calculate tax
    const taxAmount = data.advanceAmount * (data.taxRate / 100);
    const totalAmount = data.advanceAmount + taxAmount;

    const advanceInvoice = await prisma.advanceInvoice.create({
      data: {
        companyId,
        invoiceNumber,
        issueDate: data.issueDate,
        partnerId: data.partnerId,
        advanceAmount: new Decimal(data.advanceAmount),
        taxAmount: new Decimal(taxAmount),
        totalAmount: new Decimal(totalAmount),
        currency: data.currency || 'RSD',
        usedAmount: new Decimal(0),
        remainingAmount: new Decimal(totalAmount),
        status: 'DRAFT',
      },
      include: {
        partner: true,
      },
    });

    logger.info(`Advance invoice created`, {
      advanceInvoiceId: advanceInvoice.id,
      invoiceNumber,
      totalAmount,
    });

    return advanceInvoice;
  }

  /**
   * Get advance invoice by ID
   */
  static async getById(id: string, companyId: string) {
    return prisma.advanceInvoice.findUnique({
      where: { id, companyId },
      include: {
        partner: true,
        company: true,
      },
    });
  }

  /**
   * Get all advance invoices
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
      where.issueDate = {};
      if (options.fromDate) where.issueDate.gte = options.fromDate;
      if (options.toDate) where.issueDate.lte = options.toDate;
    }

    const page = options?.page || 1;
    const limit = options?.limit || 20;

    const [invoices, total] = await Promise.all([
      prisma.advanceInvoice.findMany({
        where,
        include: {
          partner: {
            select: { id: true, name: true, pib: true },
          },
        },
        orderBy: { issueDate: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.advanceInvoice.count({ where }),
    ]);

    return {
      data: invoices,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get available advances for a partner (for closing)
   */
  static async getAvailableForPartner(companyId: string, partnerId: string) {
    return prisma.advanceInvoice.findMany({
      where: {
        companyId,
        partnerId,
        status: { in: ['SENT', 'PARTIALLY_USED'] },
        remainingAmount: { gt: 0 },
      },
      orderBy: { issueDate: 'asc' },
    });
  }

  /**
   * Use advance against final invoice
   */
  static async useAdvance(
    advanceInvoiceId: string,
    companyId: string,
    amount: number,
    finalInvoiceId: string
  ) {
    const advance = await prisma.advanceInvoice.findUnique({
      where: { id: advanceInvoiceId, companyId },
    });

    if (!advance) {
      throw new Error('Advance invoice not found');
    }

    const remaining = Number(advance.remainingAmount);
    if (amount > remaining) {
      throw new Error(`Cannot use ${amount}, only ${remaining} available`);
    }

    const newUsed = Number(advance.usedAmount) + amount;
    const newRemaining = remaining - amount;

    // Determine new status
    let newStatus = advance.status;
    if (newRemaining <= 0.01) {
      newStatus = 'FULLY_USED';
    } else if (newUsed > 0) {
      newStatus = 'PARTIALLY_USED';
    }

    // Update advance invoice
    const updated = await prisma.advanceInvoice.update({
      where: { id: advanceInvoiceId },
      data: {
        usedAmount: new Decimal(newUsed),
        remainingAmount: new Decimal(newRemaining),
        status: newStatus,
        closedByInvoices: advance.closedByInvoices
          ? [...(advance.closedByInvoices as string[]), finalInvoiceId]
          : [finalInvoiceId],
      },
    });

    logger.info(`Advance used`, {
      advanceInvoiceId,
      amount,
      finalInvoiceId,
      newRemaining,
      newStatus,
    });

    return updated;
  }

  /**
   * Cancel advance invoice
   */
  static async cancel(id: string, companyId: string) {
    const advance = await prisma.advanceInvoice.findUnique({
      where: { id, companyId },
    });

    if (!advance) {
      throw new Error('Advance invoice not found');
    }

    if (Number(advance.usedAmount) > 0) {
      throw new Error('Cannot cancel advance invoice that has been partially or fully used');
    }

    return prisma.advanceInvoice.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });
  }

  /**
   * Mark as sent to SEF
   */
  static async markAsSent(id: string, companyId: string, sefId: string, sefStatus: string) {
    return prisma.advanceInvoice.update({
      where: { id, companyId },
      data: {
        status: 'SENT',
        sefId,
        sefStatus,
        sentAt: new Date(),
      },
    });
  }

  /**
   * Get advance invoice summary for a period
   */
  static async getSummary(companyId: string, fromDate: Date, toDate: Date) {
    const advances = await prisma.advanceInvoice.findMany({
      where: {
        companyId,
        issueDate: { gte: fromDate, lte: toDate },
        status: { not: 'CANCELLED' },
      },
    });

    return {
      count: advances.length,
      totalAdvanceAmount: advances.reduce((sum, a) => sum + Number(a.advanceAmount), 0),
      totalTaxAmount: advances.reduce((sum, a) => sum + Number(a.taxAmount), 0),
      totalUsed: advances.reduce((sum, a) => sum + Number(a.usedAmount), 0),
      totalRemaining: advances.reduce((sum, a) => sum + Number(a.remainingAmount), 0),
      byStatus: {
        draft: advances.filter(a => a.status === 'DRAFT').length,
        sent: advances.filter(a => a.status === 'SENT').length,
        partiallyUsed: advances.filter(a => a.status === 'PARTIALLY_USED').length,
        fullyUsed: advances.filter(a => a.status === 'FULLY_USED').length,
      },
    };
  }
}

export default AdvanceInvoiceService;
