/**
 * PPPDV Service - PDV Prijava Generator
 * Automatski generiše PPPDV obrazac iz SEF podataka
 */

import { prisma } from '../db/prisma';
import { Decimal } from '@prisma/client/runtime/library';
import logger from '../utils/logger';

interface PPPDVData {
  year: number;
  month: number;
  periodType: 'MONTHLY' | 'QUARTERLY';
  
  // Izlazni PDV
  field001: number; // Promet 20% - osnovica
  field002: number; // Promet 20% - PDV
  field003: number; // Promet 10% - osnovica
  field004: number; // Promet 10% - PDV
  field005: number; // Oslobođeno
  field006: number; // Izvoz
  
  // Ulazni PDV
  field101: number; // Nabavka 20% - osnovica
  field102: number; // Nabavka 20% - PDV
  field103: number; // Nabavka 10% - osnovica
  field104: number; // Nabavka 10% - PDV
  field105: number; // Uvoz 20% - PDV
  field106: number; // Uvoz 10% - PDV
  
  // Obračun
  field201: number; // Ukupan izlazni PDV
  field202: number; // Ukupan ulazni PDV
  field203: number; // PDV za uplatu
  field204: number; // PDV za povraćaj
}

export class PPPDVService {
  /**
   * Calculate PPPDV data from invoices
   */
  static async calculatePPPDV(
    companyId: string,
    year: number,
    month: number,
    periodType: 'MONTHLY' | 'QUARTERLY' = 'MONTHLY'
  ): Promise<PPPDVData> {
    // Determine date range
    let startDate: Date;
    let endDate: Date;

    if (periodType === 'QUARTERLY') {
      // For quarterly, month should be 3, 6, 9, or 12
      const quarter = Math.ceil(month / 3);
      startDate = new Date(year, (quarter - 1) * 3, 1);
      endDate = new Date(year, quarter * 3, 0, 23, 59, 59);
    } else {
      startDate = new Date(year, month - 1, 1);
      endDate = new Date(year, month, 0, 23, 59, 59);
    }

    logger.info(`Calculating PPPDV for company ${companyId}`, {
      year,
      month,
      periodType,
      startDate,
      endDate,
    });

    // Get outgoing invoices (sales)
    const outgoingInvoices = await prisma.invoice.findMany({
      where: {
        companyId,
        type: 'OUTGOING',
        status: { in: ['SENT', 'DELIVERED', 'ACCEPTED'] },
        issueDate: { gte: startDate, lte: endDate },
      },
      include: {
        lines: true,
      },
    });

    // Get incoming invoices (purchases)
    const incomingInvoices = await prisma.incomingInvoice.findMany({
      where: {
        companyId,
        status: { in: ['ACCEPTED'] },
        issueDate: { gte: startDate, lte: endDate },
      },
      include: {
        lines: true,
      },
    });

    // Initialize PPPDV fields
    const data: PPPDVData = {
      year,
      month,
      periodType,
      field001: 0, field002: 0,
      field003: 0, field004: 0,
      field005: 0, field006: 0,
      field101: 0, field102: 0,
      field103: 0, field104: 0,
      field105: 0, field106: 0,
      field201: 0, field202: 0,
      field203: 0, field204: 0,
    };

    // Process outgoing invoices (sales)
    for (const invoice of outgoingInvoices) {
      for (const line of invoice.lines) {
        const taxRate = Number(line.taxRate);
        const lineAmount = Number(line.amount);
        const taxAmount = Number(line.taxAmount);
        const netAmount = lineAmount - taxAmount;

        if (taxRate === 20) {
          data.field001 += netAmount;
          data.field002 += taxAmount;
        } else if (taxRate === 10) {
          data.field003 += netAmount;
          data.field004 += taxAmount;
        } else if (taxRate === 0) {
          // Check if it's export or tax-exempt
          // For now, assume domestic tax-exempt
          data.field005 += lineAmount;
        }
      }
    }

    // Process incoming invoices (purchases)
    for (const invoice of incomingInvoices) {
      for (const line of invoice.lines) {
        const taxRate = Number(line.taxRate);
        const lineAmount = Number(line.amount);
        const taxAmount = Number(line.taxAmount);
        const netAmount = lineAmount - taxAmount;

        if (taxRate === 20) {
          data.field101 += netAmount;
          data.field102 += taxAmount;
        } else if (taxRate === 10) {
          data.field103 += netAmount;
          data.field104 += taxAmount;
        }
      }
    }

    // Calculate totals
    data.field201 = data.field002 + data.field004; // Total output VAT
    data.field202 = data.field102 + data.field104 + data.field105 + data.field106; // Total input VAT

    // Calculate balance
    const vatBalance = data.field201 - data.field202;
    if (vatBalance > 0) {
      data.field203 = vatBalance; // VAT to pay
      data.field204 = 0;
    } else {
      data.field203 = 0;
      data.field204 = Math.abs(vatBalance); // VAT refund
    }

    // Round all values to 2 decimal places
    Object.keys(data).forEach((key) => {
      if (typeof data[key as keyof PPPDVData] === 'number' && key.startsWith('field')) {
        (data as any)[key] = Math.round((data as any)[key] * 100) / 100;
      }
    });

    return data;
  }

  /**
   * Create or update PPPDV report
   */
  static async savePPPDVReport(
    companyId: string,
    year: number,
    month: number,
    periodType: 'MONTHLY' | 'QUARTERLY' = 'MONTHLY'
  ) {
    const data = await this.calculatePPPDV(companyId, year, month, periodType);

    const report = await prisma.pPPDVReport.upsert({
      where: {
        companyId_year_month: {
          companyId,
          year,
          month,
        },
      },
      create: {
        companyId,
        year,
        month,
        periodType,
        field001: new Decimal(data.field001),
        field002: new Decimal(data.field002),
        field003: new Decimal(data.field003),
        field004: new Decimal(data.field004),
        field005: new Decimal(data.field005),
        field006: new Decimal(data.field006),
        field101: new Decimal(data.field101),
        field102: new Decimal(data.field102),
        field103: new Decimal(data.field103),
        field104: new Decimal(data.field104),
        field105: new Decimal(data.field105),
        field106: new Decimal(data.field106),
        field201: new Decimal(data.field201),
        field202: new Decimal(data.field202),
        field203: new Decimal(data.field203),
        field204: new Decimal(data.field204),
        status: 'CALCULATED',
      },
      update: {
        periodType,
        field001: new Decimal(data.field001),
        field002: new Decimal(data.field002),
        field003: new Decimal(data.field003),
        field004: new Decimal(data.field004),
        field005: new Decimal(data.field005),
        field006: new Decimal(data.field006),
        field101: new Decimal(data.field101),
        field102: new Decimal(data.field102),
        field103: new Decimal(data.field103),
        field104: new Decimal(data.field104),
        field105: new Decimal(data.field105),
        field106: new Decimal(data.field106),
        field201: new Decimal(data.field201),
        field202: new Decimal(data.field202),
        field203: new Decimal(data.field203),
        field204: new Decimal(data.field204),
        status: 'CALCULATED',
      },
    });

    logger.info(`PPPDV report saved`, { reportId: report.id, year, month });

    return report;
  }

  /**
   * Get PPPDV report
   */
  static async getPPPDVReport(companyId: string, year: number, month: number) {
    return prisma.pPPDVReport.findUnique({
      where: {
        companyId_year_month: {
          companyId,
          year,
          month,
        },
      },
    });
  }

  /**
   * Get all PPPDV reports for a year
   */
  static async getPPPDVReportsForYear(companyId: string, year: number) {
    return prisma.pPPDVReport.findMany({
      where: { companyId, year },
      orderBy: { month: 'asc' },
    });
  }

  /**
   * Get PPPDV report by ID
   */
  static async getPPPDVReportById(reportId: string) {
    return prisma.pPPDVReport.findUnique({
      where: { id: reportId },
      include: { company: true },
    });
  }

  /**
   * Delete draft report
   */
  static async deleteDraftReport(reportId: string) {
    const report = await prisma.pPPDVReport.findUnique({
      where: { id: reportId },
    });

    if (!report) {
      throw new Error('Report not found');
    }

    if (report.status === 'SUBMITTED') {
      throw new Error('Cannot delete submitted report');
    }

    return prisma.pPPDVReport.delete({
      where: { id: reportId },
    });
  }

  /**
   * Mark report as submitted
   */
  static async markAsSubmitted(reportId: string) {
    return prisma.pPPDVReport.update({
      where: { id: reportId },
      data: {
        status: 'SUBMITTED',
        submittedAt: new Date(),
      },
    });
  }

  /**
   * Generate XML for ePorezi submission
   */
  static async generateXML(reportId: string): Promise<string> {
    const report = await prisma.pPPDVReport.findUnique({
      where: { id: reportId },
      include: { company: true },
    });

    if (!report) {
      throw new Error('Report not found');
    }

    // Generate ePorezi compatible XML
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<PPPDV xmlns="http://pid.poreskauprava.gov.rs/xsd/pppdv">
  <Zaglavlje>
    <PIB>${report.company.pib}</PIB>
    <Naziv>${this.escapeXml(report.company.name)}</Naziv>
    <Godina>${report.year}</Godina>
    <Mesec>${report.month}</Mesec>
    <TipPerioda>${report.periodType === 'MONTHLY' ? 'M' : 'K'}</TipPerioda>
  </Zaglavlje>
  <Podaci>
    <!-- Promet dobara i usluga -->
    <Polje001>${report.field001}</Polje001>
    <Polje002>${report.field002}</Polje002>
    <Polje003>${report.field003}</Polje003>
    <Polje004>${report.field004}</Polje004>
    <Polje005>${report.field005}</Polje005>
    <Polje006>${report.field006}</Polje006>
    <!-- Prethodni porez -->
    <Polje101>${report.field101}</Polje101>
    <Polje102>${report.field102}</Polje102>
    <Polje103>${report.field103}</Polje103>
    <Polje104>${report.field104}</Polje104>
    <Polje105>${report.field105}</Polje105>
    <Polje106>${report.field106}</Polje106>
    <!-- Obračun -->
    <Polje201>${report.field201}</Polje201>
    <Polje202>${report.field202}</Polje202>
    <Polje203>${report.field203}</Polje203>
    <Polje204>${report.field204}</Polje204>
  </Podaci>
</PPPDV>`;

    return xml;
  }

  private static escapeXml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}

export default PPPDVService;
