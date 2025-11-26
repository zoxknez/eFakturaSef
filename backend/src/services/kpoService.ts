/**
 * KPO Service - Knjiga Prometa Obveznika
 * Za preduzetnike paušalce
 */

import { prisma } from '../db/prisma';
import { Decimal } from '@prisma/client/runtime/library';
import logger from '../utils/logger';

interface KPOEntryData {
  date: Date;
  description: string;
  documentNumber?: string;
  documentType?: string;
  grossIncome: number;
  vatAmount: number;
  netIncome: number;
  expense?: number;
  invoiceId?: string;
}

interface KPOSummary {
  period: { from: Date; to: Date };
  totalGrossIncome: number;
  totalVat: number;
  totalNetIncome: number;
  totalExpenses: number;
  netResult: number;
  entryCount: number;
}

export class KPOService {
  /**
   * Get next ordinal number for KPO entry
   */
  private static async getNextOrdinalNumber(companyId: string, year: number): Promise<number> {
    const startOfYear = new Date(year, 0, 1);
    const endOfYear = new Date(year, 11, 31, 23, 59, 59);

    const lastEntry = await prisma.kPOEntry.findFirst({
      where: {
        companyId,
        date: { gte: startOfYear, lte: endOfYear },
      },
      orderBy: { ordinalNumber: 'desc' },
    });

    return (lastEntry?.ordinalNumber || 0) + 1;
  }

  /**
   * Create KPO entry manually
   */
  static async createEntry(companyId: string, data: KPOEntryData) {
    const year = data.date.getFullYear();
    const ordinalNumber = await this.getNextOrdinalNumber(companyId, year);

    const entry = await prisma.kPOEntry.create({
      data: {
        companyId,
        date: data.date,
        ordinalNumber,
        description: data.description,
        documentNumber: data.documentNumber,
        documentType: data.documentType,
        grossIncome: new Decimal(data.grossIncome || 0),
        vatAmount: new Decimal(data.vatAmount || 0),
        netIncome: new Decimal(data.netIncome || 0),
        expense: new Decimal(data.expense || 0),
        invoiceId: data.invoiceId,
      },
    });

    logger.info(`KPO entry created`, { entryId: entry.id, ordinalNumber });
    return entry;
  }

  /**
   * Create KPO entry from invoice
   */
  static async createFromInvoice(companyId: string, invoiceId: string) {
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { lines: true },
    });

    if (!invoice) {
      throw new Error('Invoice not found');
    }

    // Check if entry already exists for this invoice
    const existingEntry = await prisma.kPOEntry.findFirst({
      where: { companyId, invoiceId },
    });

    if (existingEntry) {
      throw new Error('KPO entry already exists for this invoice');
    }

    const grossIncome = Number(invoice.totalAmount);
    const vatAmount = Number(invoice.taxAmount);
    const netIncome = grossIncome - vatAmount;

    return this.createEntry(companyId, {
      date: invoice.issueDate,
      description: `Faktura ${invoice.invoiceNumber} - ${invoice.buyerName || 'N/A'}`,
      documentNumber: invoice.invoiceNumber,
      documentType: 'FAKTURA',
      grossIncome,
      vatAmount,
      netIncome,
      invoiceId,
    });
  }

  /**
   * Get KPO entries for a period
   */
  static async getEntries(
    companyId: string,
    fromDate: Date,
    toDate: Date
  ) {
    return prisma.kPOEntry.findMany({
      where: {
        companyId,
        date: { gte: fromDate, lte: toDate },
      },
      orderBy: [
        { date: 'asc' },
        { ordinalNumber: 'asc' },
      ],
    });
  }

  /**
   * Get KPO summary for a period
   */
  static async getSummary(
    companyId: string,
    fromDate: Date,
    toDate: Date
  ): Promise<KPOSummary> {
    const entries = await this.getEntries(companyId, fromDate, toDate);

    const summary: KPOSummary = {
      period: { from: fromDate, to: toDate },
      totalGrossIncome: 0,
      totalVat: 0,
      totalNetIncome: 0,
      totalExpenses: 0,
      netResult: 0,
      entryCount: entries.length,
    };

    for (const entry of entries) {
      summary.totalGrossIncome += Number(entry.grossIncome);
      summary.totalVat += Number(entry.vatAmount);
      summary.totalNetIncome += Number(entry.netIncome);
      summary.totalExpenses += Number(entry.expense);
    }

    summary.netResult = summary.totalNetIncome - summary.totalExpenses;

    return summary;
  }

  /**
   * Get monthly KPO summary
   */
  static async getMonthlySummary(companyId: string, year: number) {
    const months = Array.from({ length: 12 }, (_, i) => i + 1);

    const summaries = await Promise.all(
      months.map(async (month) => {
        const fromDate = new Date(year, month - 1, 1);
        const toDate = new Date(year, month, 0, 23, 59, 59);
        
        const summary = await this.getSummary(companyId, fromDate, toDate);
        
        return {
          month,
          monthName: fromDate.toLocaleDateString('sr-Latn-RS', { month: 'long' }),
          ...summary,
        };
      })
    );

    // Calculate yearly totals
    const yearlyTotals = summaries.reduce(
      (acc, m) => ({
        totalGrossIncome: acc.totalGrossIncome + m.totalGrossIncome,
        totalVat: acc.totalVat + m.totalVat,
        totalNetIncome: acc.totalNetIncome + m.totalNetIncome,
        totalExpenses: acc.totalExpenses + m.totalExpenses,
        netResult: acc.netResult + m.netResult,
        entryCount: acc.entryCount + m.entryCount,
      }),
      { totalGrossIncome: 0, totalVat: 0, totalNetIncome: 0, totalExpenses: 0, netResult: 0, entryCount: 0 }
    );

    return {
      year,
      months: summaries,
      totals: yearlyTotals,
    };
  }

  /**
   * Auto-generate KPO entries from invoices for a period
   */
  static async autoGenerateFromInvoices(
    companyId: string,
    fromDate: Date,
    toDate: Date
  ) {
    // Get all outgoing invoices without KPO entries
    const invoices = await prisma.invoice.findMany({
      where: {
        companyId,
        type: 'OUTGOING',
        status: { in: ['SENT', 'DELIVERED', 'ACCEPTED'] },
        issueDate: { gte: fromDate, lte: toDate },
      },
    });

    // Get existing KPO entries with invoice references
    const existingEntries = await prisma.kPOEntry.findMany({
      where: {
        companyId,
        invoiceId: { not: null },
      },
      select: { invoiceId: true },
    });

    const existingInvoiceIds = new Set(existingEntries.map(e => e.invoiceId));

    // Create entries for invoices without KPO entries
    const newEntries = [];
    for (const invoice of invoices) {
      if (!existingInvoiceIds.has(invoice.id)) {
        try {
          const entry = await this.createFromInvoice(companyId, invoice.id);
          newEntries.push(entry);
        } catch (error) {
          logger.warn(`Failed to create KPO entry for invoice ${invoice.id}`, { error });
        }
      }
    }

    logger.info(`Auto-generated ${newEntries.length} KPO entries`, { companyId, fromDate, toDate });

    return {
      created: newEntries.length,
      skipped: invoices.length - newEntries.length,
    };
  }

  /**
   * Delete KPO entry
   */
  static async deleteEntry(entryId: string, companyId: string) {
    return prisma.kPOEntry.delete({
      where: { id: entryId, companyId },
    });
  }

  /**
   * Update KPO entry
   */
  static async updateEntry(
    entryId: string,
    companyId: string,
    data: Partial<KPOEntryData>
  ) {
    return prisma.kPOEntry.update({
      where: { id: entryId, companyId },
      data: {
        ...(data.date && { date: data.date }),
        ...(data.description && { description: data.description }),
        ...(data.documentNumber !== undefined && { documentNumber: data.documentNumber }),
        ...(data.documentType !== undefined && { documentType: data.documentType }),
        ...(data.grossIncome !== undefined && { grossIncome: new Decimal(data.grossIncome) }),
        ...(data.vatAmount !== undefined && { vatAmount: new Decimal(data.vatAmount) }),
        ...(data.netIncome !== undefined && { netIncome: new Decimal(data.netIncome) }),
        ...(data.expense !== undefined && { expense: new Decimal(data.expense) }),
      },
    });
  }
}

export default KPOService;
