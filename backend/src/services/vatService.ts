/**
 * VAT (PDV) Service
 * Handles VAT records and reporting for Serbian tax compliance
 */

import { prisma } from '../db/prisma';
import { VATRecordType, Prisma } from '@prisma/client';
import { logger } from '../utils/logger';
import { z } from 'zod';
import { toDecimal, toNumber } from '../utils/decimal';

// ========================================
// VALIDATION SCHEMAS
// ========================================

export const CreateVATRecordSchema = z.object({
  year: z.number().int().min(2000).max(2100),
  month: z.number().int().min(1).max(12),
  type: z.nativeEnum(VATRecordType),
  documentNumber: z.string().min(1),
  documentDate: z.coerce.date(),
  partnerName: z.string().min(1),
  partnerPIB: z.string().min(8).max(13),
  taxBase20: z.number().min(0).default(0),
  vatAmount20: z.number().min(0).default(0),
  taxBase10: z.number().min(0).default(0),
  vatAmount10: z.number().min(0).default(0),
  exemptAmount: z.number().min(0).default(0),
  invoiceId: z.string().uuid().optional(),
});

export type CreateVATRecordDTO = z.infer<typeof CreateVATRecordSchema>;

// ========================================
// VAT REPORTING INTERFACES
// ========================================

interface VATSummary {
  period: { year: number; month: number };
  output: {
    taxBase20: number;
    vatAmount20: number;
    taxBase10: number;
    vatAmount10: number;
    exemptAmount: number;
    totalBase: number;
    totalVAT: number;
  };
  input: {
    taxBase20: number;
    vatAmount20: number;
    taxBase10: number;
    vatAmount10: number;
    exemptAmount: number;
    totalBase: number;
    totalVAT: number;
  };
  balance: number; // Positive = obaveza, Negative = preplata
}

interface PPPDVData {
  // PPPDV obrazac fields
  period: { year: number; month: number };
  companyInfo: {
    name: string;
    pib: string;
    address: string;
  };
  
  // Section I - Promet dobara i usluga
  section1: {
    line101: number; // Promet po stopi 20%
    line102: number; // Promet po stopi 10%
    line103: number; // Promet oslobođen PDV
    line104: number; // Ukupan promet
  };
  
  // Section II - PDV obaveze
  section2: {
    line201: number; // Obračunati PDV 20%
    line202: number; // Obračunati PDV 10%
    line203: number; // Ukupno obračunati PDV
  };
  
  // Section III - Prethodni PDV
  section3: {
    line301: number; // Prethodni PDV 20%
    line302: number; // Prethodni PDV 10%
    line303: number; // Ukupan prethodni PDV
  };
  
  // Section IV - PDV obaveza/preplata
  section4: {
    line401: number; // PDV za plaćanje (ako 203 > 303)
    line402: number; // PDV za povraćaj/prenos (ako 303 > 203)
  };
}

// ========================================
// SERVICE CLASS
// ========================================

export class VATService {
  /**
   * Create VAT record from invoice
   */
  static async createVATRecordFromInvoice(
    invoiceId: string,
    companyId: string
  ): Promise<void> {
    const invoice = await prisma.invoice.findFirst({
      where: { id: invoiceId, companyId },
      include: { lines: true, partner: true },
    });

    if (!invoice) {
      throw new Error('Invoice not found');
    }

    const documentDate = invoice.issueDate;
    const year = documentDate.getFullYear();
    const month = documentDate.getMonth() + 1;

    // Check if record already exists
    const existing = await prisma.vATRecord.findFirst({
      where: { companyId, invoiceId },
    });

    if (existing) {
      logger.warn(`VAT record already exists for invoice ${invoiceId}`);
      return;
    }

    // Calculate tax bases by rate
    let taxBase20 = 0;
    let vatAmount20 = 0;
    let taxBase10 = 0;
    let vatAmount10 = 0;
    let exemptAmount = 0;

    for (const line of invoice.lines) {
      const taxRate = Number(line.taxRate);
      const lineBase = Number(line.amount) - Number(line.taxAmount);
      const lineVAT = Number(line.taxAmount);

      if (taxRate === 20) {
        taxBase20 += lineBase;
        vatAmount20 += lineVAT;
      } else if (taxRate === 10) {
        taxBase10 += lineBase;
        vatAmount10 += lineVAT;
      } else if (taxRate === 0) {
        exemptAmount += lineBase;
      }
    }

    await prisma.vATRecord.create({
      data: {
        year,
        month,
        type: invoice.type === 'OUTGOING' ? VATRecordType.OUTPUT : VATRecordType.INPUT,
        documentNumber: invoice.invoiceNumber,
        documentDate,
        partnerName: invoice.buyerName || invoice.partner?.name || 'N/A',
        partnerPIB: invoice.buyerPIB || invoice.partner?.pib || '',
        taxBase20: toNumber(toDecimal(taxBase20)),
        vatAmount20: toNumber(toDecimal(vatAmount20)),
        taxBase10: toNumber(toDecimal(taxBase10)),
        vatAmount10: toNumber(toDecimal(vatAmount10)),
        exemptAmount: toNumber(toDecimal(exemptAmount)),
        totalAmount: Number(invoice.totalAmount),
        invoiceId,
        companyId,
      },
    });

    logger.info(`VAT record created for invoice ${invoice.invoiceNumber}`);
  }

  /**
   * Get VAT records for a period
   */
  static async getVATRecords(
    companyId: string,
    options?: {
      year?: number;
      month?: number;
      type?: VATRecordType;
      page?: number;
      limit?: number;
    }
  ) {
    const page = options?.page || 1;
    const limit = options?.limit || 50;
    const skip = (page - 1) * limit;

    const where: Prisma.VATRecordWhereInput = { companyId };

    if (options?.year) {
      where.year = options.year;
    }
    if (options?.month) {
      where.month = options.month;
    }
    if (options?.type) {
      where.type = options.type;
    }

    const [records, total] = await Promise.all([
      prisma.vATRecord.findMany({
        where,
        orderBy: [
          { documentDate: 'desc' },
          { documentNumber: 'desc' },
        ],
        skip,
        take: limit,
      }),
      prisma.vATRecord.count({ where }),
    ]);

    return {
      data: records,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get VAT summary for a period (KPO/KPR)
   */
  static async getVATSummary(
    companyId: string,
    year: number,
    month: number
  ): Promise<VATSummary> {
    const outputRecords = await prisma.vATRecord.aggregate({
      where: { companyId, year, month, type: VATRecordType.OUTPUT },
      _sum: {
        taxBase20: true,
        vatAmount20: true,
        taxBase10: true,
        vatAmount10: true,
        exemptAmount: true,
      },
    });

    const inputRecords = await prisma.vATRecord.aggregate({
      where: { companyId, year, month, type: VATRecordType.INPUT },
      _sum: {
        taxBase20: true,
        vatAmount20: true,
        taxBase10: true,
        vatAmount10: true,
        exemptAmount: true,
      },
    });

    const output = {
      taxBase20: Number(outputRecords._sum.taxBase20 || 0),
      vatAmount20: Number(outputRecords._sum.vatAmount20 || 0),
      taxBase10: Number(outputRecords._sum.taxBase10 || 0),
      vatAmount10: Number(outputRecords._sum.vatAmount10 || 0),
      exemptAmount: Number(outputRecords._sum.exemptAmount || 0),
      totalBase: 0,
      totalVAT: 0,
    };
    output.totalBase = output.taxBase20 + output.taxBase10 + output.exemptAmount;
    output.totalVAT = output.vatAmount20 + output.vatAmount10;

    const input = {
      taxBase20: Number(inputRecords._sum.taxBase20 || 0),
      vatAmount20: Number(inputRecords._sum.vatAmount20 || 0),
      taxBase10: Number(inputRecords._sum.taxBase10 || 0),
      vatAmount10: Number(inputRecords._sum.vatAmount10 || 0),
      exemptAmount: Number(inputRecords._sum.exemptAmount || 0),
      totalBase: 0,
      totalVAT: 0,
    };
    input.totalBase = input.taxBase20 + input.taxBase10 + input.exemptAmount;
    input.totalVAT = input.vatAmount20 + input.vatAmount10;

    return {
      period: { year, month },
      output,
      input,
      balance: output.totalVAT - input.totalVAT,
    };
  }

  /**
   * Generate PPPDV form data
   */
  static async generatePPPDV(
    companyId: string,
    year: number,
    month: number
  ): Promise<PPPDVData> {
    const company = await prisma.company.findUnique({
      where: { id: companyId },
    });

    if (!company) {
      throw new Error('Company not found');
    }

    const summary = await this.getVATSummary(companyId, year, month);

    const section1 = {
      line101: summary.output.taxBase20,
      line102: summary.output.taxBase10,
      line103: summary.output.exemptAmount,
      line104: summary.output.totalBase,
    };

    const section2 = {
      line201: summary.output.vatAmount20,
      line202: summary.output.vatAmount10,
      line203: summary.output.totalVAT,
    };

    const section3 = {
      line301: summary.input.vatAmount20,
      line302: summary.input.vatAmount10,
      line303: summary.input.totalVAT,
    };

    const section4 = {
      line401: summary.balance > 0 ? summary.balance : 0,
      line402: summary.balance < 0 ? Math.abs(summary.balance) : 0,
    };

    return {
      period: { year, month },
      companyInfo: {
        name: company.name,
        pib: company.pib,
        address: `${company.address}, ${company.postalCode} ${company.city}`,
      },
      section1,
      section2,
      section3,
      section4,
    };
  }

  /**
   * Get annual VAT summary
   */
  static async getAnnualVATSummary(companyId: string, year: number) {
    const monthlySummaries = await Promise.all(
      Array.from({ length: 12 }, (_, i) => 
        this.getVATSummary(companyId, year, i + 1)
      )
    );

    const annual = monthlySummaries.reduce(
      (acc, month) => ({
        output: {
          taxBase20: acc.output.taxBase20 + month.output.taxBase20,
          vatAmount20: acc.output.vatAmount20 + month.output.vatAmount20,
          taxBase10: acc.output.taxBase10 + month.output.taxBase10,
          vatAmount10: acc.output.vatAmount10 + month.output.vatAmount10,
          exemptAmount: acc.output.exemptAmount + month.output.exemptAmount,
          totalBase: acc.output.totalBase + month.output.totalBase,
          totalVAT: acc.output.totalVAT + month.output.totalVAT,
        },
        input: {
          taxBase20: acc.input.taxBase20 + month.input.taxBase20,
          vatAmount20: acc.input.vatAmount20 + month.input.vatAmount20,
          taxBase10: acc.input.taxBase10 + month.input.taxBase10,
          vatAmount10: acc.input.vatAmount10 + month.input.vatAmount10,
          exemptAmount: acc.input.exemptAmount + month.input.exemptAmount,
          totalBase: acc.input.totalBase + month.input.totalBase,
          totalVAT: acc.input.totalVAT + month.input.totalVAT,
        },
        balance: acc.balance + month.balance,
      }),
      {
        output: { taxBase20: 0, vatAmount20: 0, taxBase10: 0, vatAmount10: 0, exemptAmount: 0, totalBase: 0, totalVAT: 0 },
        input: { taxBase20: 0, vatAmount20: 0, taxBase10: 0, vatAmount10: 0, exemptAmount: 0, totalBase: 0, totalVAT: 0 },
        balance: 0,
      }
    );

    return {
      year,
      monthly: monthlySummaries,
      annual,
    };
  }

  /**
   * Export KPO (Knjiga primljenih računa za nabavku)
   */
  static async exportKPO(
    companyId: string,
    year: number,
    month: number
  ) {
    const records = await prisma.vATRecord.findMany({
      where: {
        companyId,
        year,
        month,
        type: VATRecordType.INPUT,
      },
      orderBy: { documentDate: 'asc' },
    });

    return records.map((record, index) => ({
      redBr: index + 1,
      datumRacuna: record.documentDate,
      brojRacuna: record.documentNumber,
      nazivDobavljaca: record.partnerName,
      pibDobavljaca: record.partnerPIB,
      osnovica20: record.taxBase20,
      pdv20: record.vatAmount20,
      osnovica10: record.taxBase10,
      pdv10: record.vatAmount10,
      oslobodeno: record.exemptAmount,
      ukupno: record.totalAmount,
    }));
  }

  /**
   * Export KPR (Knjiga izdatih računa)
   */
  static async exportKPR(
    companyId: string,
    year: number,
    month: number
  ) {
    const records = await prisma.vATRecord.findMany({
      where: {
        companyId,
        year,
        month,
        type: VATRecordType.OUTPUT,
      },
      orderBy: { documentDate: 'asc' },
    });

    return records.map((record, index) => ({
      redBr: index + 1,
      datumRacuna: record.documentDate,
      brojRacuna: record.documentNumber,
      nazivKupca: record.partnerName,
      pibKupca: record.partnerPIB,
      osnovica20: record.taxBase20,
      pdv20: record.vatAmount20,
      osnovica10: record.taxBase10,
      pdv10: record.vatAmount10,
      oslobodeno: record.exemptAmount,
      ukupno: record.totalAmount,
    }));
  }

  /**
   * Recalculate VAT records for a period
   * Useful after corrections
   */
  static async recalculateVATRecords(
    companyId: string,
    year: number,
    month: number
  ): Promise<{ created: number; updated: number; deleted: number }> {
    // Get all invoices for the period
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const invoices = await prisma.invoice.findMany({
      where: {
        companyId,
        issueDate: { gte: startDate, lte: endDate },
        status: { in: ['SENT', 'DELIVERED', 'ACCEPTED'] },
      },
      include: { lines: true },
    });

    let created = 0;
    let updated = 0;

    for (const invoice of invoices) {
      const existing = await prisma.vATRecord.findFirst({
        where: { companyId, invoiceId: invoice.id },
      });

      if (existing) {
        // Update existing
        await prisma.vATRecord.delete({ where: { id: existing.id } });
      }

      await this.createVATRecordFromInvoice(invoice.id, companyId);

      if (existing) {
        updated++;
      } else {
        created++;
      }
    }

    // Delete orphaned records
    const deletedRecords = await prisma.vATRecord.deleteMany({
      where: {
        companyId,
        year,
        month,
        invoiceId: { not: null },
        NOT: {
          invoiceId: { in: invoices.map(i => i.id) },
        },
      },
    });

    logger.info(`VAT records recalculated for ${year}-${month}`, {
      created,
      updated,
      deleted: deletedRecords.count,
    });

    return { created, updated, deleted: deletedRecords.count };
  }

  /**
   * Get VAT records for a date range (for PP-PDV form)
   */
  static async getVATRecordsForPeriod(
    companyId: string,
    fromDate: Date,
    toDate: Date
  ) {
    const records = await prisma.vATRecord.findMany({
      where: {
        companyId,
        documentDate: {
          gte: fromDate,
          lte: toDate,
        },
      },
      orderBy: { documentDate: 'asc' },
    });

    // Map to a format suitable for PP-PDV calculations
    return records.map(record => ({
      id: record.id,
      type: record.type,
      documentNumber: record.documentNumber,
      documentDate: record.documentDate,
      partnerName: record.partnerName,
      partnerPIB: record.partnerPIB,
      vatRate: 20, // Primary rate
      baseAmount: Number(record.taxBase20) + Number(record.taxBase10),
      vatAmount: Number(record.vatAmount20) + Number(record.vatAmount10),
      // Detailed breakdown
      taxBase20: Number(record.taxBase20),
      vatAmount20: Number(record.vatAmount20),
      taxBase10: Number(record.taxBase10),
      vatAmount10: Number(record.vatAmount10),
      exemptAmount: Number(record.exemptAmount),
      totalAmount: Number(record.totalAmount),
    }));
  }
}

export default VATService;
