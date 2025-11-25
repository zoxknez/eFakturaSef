/**
 * Credit Note (Knjižno Odobrenje) Service
 * Handles credit notes for refunds and corrections
 */

import { prisma } from '../db/prisma';
import { CreditNoteStatus, Prisma } from '@prisma/client';
import { logger } from '../utils/logger';
import { z } from 'zod';
import { toDecimal, toNumber, calculateLineTotal } from '../utils/decimal';
import { SEFService } from './sefService';
import cacheService from './cacheService';

// ========================================
// VALIDATION SCHEMAS
// ========================================

const CreditNoteLineSchema = z.object({
  itemName: z.string().min(1),
  quantity: z.number().positive(),
  unitPrice: z.number().min(0),
  taxRate: z.number().min(0).max(100),
});

export const CreateCreditNoteSchema = z.object({
  originalInvoiceId: z.string().uuid(),
  reason: z.string().min(1).max(1000),
  lines: z.array(CreditNoteLineSchema).min(1),
  issueDate: z.coerce.date().optional(),
});

export type CreateCreditNoteDTO = z.infer<typeof CreateCreditNoteSchema>;

// ========================================
// SERVICE CLASS
// ========================================

export class CreditNoteService {
  /**
   * Generate next credit note number
   */
  private static async generateCreditNoteNumber(companyId: string): Promise<string> {
    const year = new Date().getFullYear();
    
    const lastCreditNote = await prisma.creditNote.findFirst({
      where: {
        companyId,
        creditNoteNumber: { startsWith: `CN-${year}` },
      },
      orderBy: { creditNoteNumber: 'desc' },
      select: { creditNoteNumber: true },
    });

    const lastNumber = lastCreditNote
      ? parseInt(lastCreditNote.creditNoteNumber.split('-').pop() || '0')
      : 0;

    return `CN-${year}-${String(lastNumber + 1).padStart(6, '0')}`;
  }

  /**
   * Create a credit note
   */
  static async createCreditNote(
    companyId: string,
    data: CreateCreditNoteDTO,
    userId: string
  ) {
    // Validate original invoice
    const originalInvoice = await prisma.invoice.findFirst({
      where: { id: data.originalInvoiceId, companyId },
      include: { partner: true },
    });

    if (!originalInvoice) {
      throw new Error('Original invoice not found');
    }

    if (!['SENT', 'DELIVERED', 'ACCEPTED'].includes(originalInvoice.status)) {
      throw new Error('Credit note can only be created for sent/accepted invoices');
    }

    // Generate credit note number
    const creditNoteNumber = await this.generateCreditNoteNumber(companyId);

    // Calculate line totals
    const linesWithTotals = data.lines.map((line, index) => {
      const lineTotals = calculateLineTotal(
        toDecimal(line.quantity),
        toDecimal(line.unitPrice),
        toDecimal(line.taxRate)
      );

      return {
        lineNumber: index + 1,
        itemName: line.itemName,
        quantity: toNumber(toDecimal(line.quantity)),
        unitPrice: toNumber(toDecimal(line.unitPrice)),
        taxRate: toNumber(toDecimal(line.taxRate)),
        taxAmount: toNumber(lineTotals.taxAmount),
        amount: toNumber(lineTotals.totalAmount),
      };
    });

    const totalAmount = linesWithTotals.reduce((sum, l) => sum + l.amount, 0);
    const taxAmount = linesWithTotals.reduce((sum, l) => sum + l.taxAmount, 0);

    // Create credit note
    const creditNote = await prisma.creditNote.create({
      data: {
        creditNoteNumber,
        originalInvoiceId: data.originalInvoiceId,
        partnerId: originalInvoice.partnerId,
        partnerName: originalInvoice.buyerName || originalInvoice.partner?.name || 'N/A',
        partnerPIB: originalInvoice.buyerPIB || originalInvoice.partner?.pib || '',
        issueDate: data.issueDate || new Date(),
        totalAmount,
        taxAmount,
        reason: data.reason,
        companyId,
        lines: {
          create: linesWithTotals,
        },
      },
      include: {
        lines: true,
      },
    });

    logger.info(`Credit note created: ${creditNoteNumber}`, {
      companyId,
      originalInvoiceId: data.originalInvoiceId,
      userId,
    });

    // Invalidate cache
    await cacheService.invalidate.dashboard(companyId);

    return creditNote;
  }

  /**
   * Get credit note by ID
   */
  static async getCreditNote(id: string, companyId: string) {
    const creditNote = await prisma.creditNote.findFirst({
      where: { id, companyId },
      include: {
        lines: { orderBy: { lineNumber: 'asc' } },
      },
    });

    if (!creditNote) {
      throw new Error('Credit note not found');
    }

    return creditNote;
  }

  /**
   * List credit notes
   */
  static async listCreditNotes(
    companyId: string,
    options?: {
      page?: number;
      limit?: number;
      status?: CreditNoteStatus;
      fromDate?: Date;
      toDate?: Date;
      search?: string;
    }
  ) {
    const page = options?.page || 1;
    const limit = options?.limit || 50;
    const skip = (page - 1) * limit;

    const where: Prisma.CreditNoteWhereInput = { companyId };

    if (options?.status) {
      where.status = options.status;
    }
    if (options?.fromDate || options?.toDate) {
      where.issueDate = {};
      if (options.fromDate) where.issueDate.gte = options.fromDate;
      if (options.toDate) where.issueDate.lte = options.toDate;
    }
    if (options?.search) {
      where.OR = [
        { creditNoteNumber: { contains: options.search } },
        { partnerName: { contains: options.search, mode: 'insensitive' } },
      ];
    }

    const [creditNotes, total] = await Promise.all([
      prisma.creditNote.findMany({
        where,
        include: {
          lines: { orderBy: { lineNumber: 'asc' } },
        },
        orderBy: { issueDate: 'desc' },
        skip,
        take: limit,
      }),
      prisma.creditNote.count({ where }),
    ]);

    return {
      data: creditNotes,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Send credit note to SEF
   */
  static async sendToSEF(id: string, companyId: string, userId: string) {
    const creditNote = await prisma.creditNote.findFirst({
      where: { id, companyId },
      include: {
        lines: true,
        company: true,
      },
    });

    if (!creditNote) {
      throw new Error('Credit note not found');
    }

    if (creditNote.status !== CreditNoteStatus.DRAFT) {
      throw new Error('Only draft credit notes can be sent to SEF');
    }

    if (!creditNote.company?.sefApiKey) {
      throw new Error('Company SEF API key not configured');
    }

    // Generate UBL XML for credit note (InvoiceTypeCode = 381)
    const ublXml = this.generateCreditNoteUBL(creditNote);

    const sefService = new SEFService({
      apiKey: creditNote.company.sefApiKey,
      baseUrl: creditNote.company.sefEnvironment === 'production'
        ? 'https://efaktura.mfin.gov.rs'
        : 'https://demoefaktura.mfin.gov.rs',
    });

    const result = await sefService.sendInvoice(ublXml);

    // Update credit note
    const updated = await prisma.creditNote.update({
      where: { id },
      data: {
        status: CreditNoteStatus.SENT,
        sefId: result.invoiceId?.toString() || result.id?.toString(),
        sefStatus: result.status,
        sentAt: new Date(),
      },
      include: { lines: true },
    });

    logger.info(`Credit note sent to SEF: ${creditNote.creditNoteNumber}`, {
      sefId: updated.sefId,
      userId,
    });

    return updated;
  }

  /**
   * Generate UBL XML for credit note
   */
  private static generateCreditNoteUBL(creditNote: any): string {
    const { create } = require('xmlbuilder2');
    
    const issueDate = creditNote.issueDate.toISOString().split('T')[0];
    const company = creditNote.company;

    const doc = create({ version: '1.0', encoding: 'UTF-8' })
      .ele('Invoice', {
        'xmlns': 'urn:oasis:names:specification:ubl:schema:xsd:Invoice-2',
        'xmlns:cac': 'urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2',
        'xmlns:cbc': 'urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2',
      })
        .ele('cbc:UBLVersionID').txt('2.1').up()
        .ele('cbc:CustomizationID').txt('urn:cen.eu:en16931:2017#compliant#urn:fdc:peppol.eu:2017:poacc:billing:3.0').up()
        .ele('cbc:ProfileID').txt('urn:fdc:peppol.eu:2017:poacc:billing:01:1.0').up()
        .ele('cbc:ID').txt(creditNote.creditNoteNumber).up()
        .ele('cbc:IssueDate').txt(issueDate).up()
        .ele('cbc:InvoiceTypeCode').txt('381').up() // 381 = Credit Note
        .ele('cbc:DocumentCurrencyCode').txt('RSD').up()
        .ele('cbc:BuyerReference').txt(creditNote.originalInvoiceId).up();

    // Billing Reference (original invoice)
    doc.ele('cac:BillingReference')
      .ele('cac:InvoiceDocumentReference')
        .ele('cbc:ID').txt(creditNote.originalInvoiceId).up()
      .up()
    .up();

    // Supplier Party
    doc.ele('cac:AccountingSupplierParty')
      .ele('cac:Party')
        .ele('cac:PartyName')
          .ele('cbc:Name').txt(company.name).up()
        .up()
        .ele('cac:PostalAddress')
          .ele('cbc:StreetName').txt(company.address || '').up()
          .ele('cbc:CityName').txt(company.city || '').up()
          .ele('cbc:PostalZone').txt(company.postalCode || '').up()
          .ele('cac:Country')
            .ele('cbc:IdentificationCode').txt(company.country || 'RS').up()
          .up()
        .up()
        .ele('cac:PartyTaxScheme')
          .ele('cbc:CompanyID').txt(company.pib).up()
          .ele('cac:TaxScheme')
            .ele('cbc:ID').txt('VAT').up()
          .up()
        .up()
      .up()
    .up();

    // Customer Party
    doc.ele('cac:AccountingCustomerParty')
      .ele('cac:Party')
        .ele('cac:PartyName')
          .ele('cbc:Name').txt(creditNote.partnerName).up()
        .up()
        .ele('cac:PartyTaxScheme')
          .ele('cbc:CompanyID').txt(creditNote.partnerPIB).up()
          .ele('cac:TaxScheme')
            .ele('cbc:ID').txt('VAT').up()
          .up()
        .up()
      .up()
    .up();

    // Credit note lines
    creditNote.lines.forEach((line: any) => {
      doc.ele('cac:InvoiceLine')
        .ele('cbc:ID').txt(line.lineNumber.toString()).up()
        .ele('cbc:InvoicedQuantity', { unitCode: 'C62' }).txt(line.quantity.toString()).up()
        .ele('cbc:LineExtensionAmount', { currencyID: 'RSD' }).txt((line.amount - line.taxAmount).toFixed(2)).up()
        .ele('cac:Item')
          .ele('cbc:Name').txt(line.itemName).up()
          .ele('cac:ClassifiedTaxCategory')
            .ele('cbc:ID').txt('S').up()
            .ele('cbc:Percent').txt(line.taxRate.toString()).up()
            .ele('cac:TaxScheme')
              .ele('cbc:ID').txt('VAT').up()
            .up()
          .up()
        .up()
        .ele('cac:Price')
          .ele('cbc:PriceAmount', { currencyID: 'RSD' }).txt(line.unitPrice.toFixed(2)).up()
        .up()
      .up();
    });

    // Tax Total
    const totalWithoutTax = Number(creditNote.totalAmount) - Number(creditNote.taxAmount);
    doc.ele('cac:TaxTotal')
      .ele('cbc:TaxAmount', { currencyID: 'RSD' }).txt(Number(creditNote.taxAmount).toFixed(2)).up()
      .ele('cac:TaxSubtotal')
        .ele('cbc:TaxableAmount', { currencyID: 'RSD' }).txt(totalWithoutTax.toFixed(2)).up()
        .ele('cbc:TaxAmount', { currencyID: 'RSD' }).txt(Number(creditNote.taxAmount).toFixed(2)).up()
        .ele('cac:TaxCategory')
          .ele('cbc:ID').txt('S').up()
          .ele('cbc:Percent').txt('20').up()
          .ele('cac:TaxScheme')
            .ele('cbc:ID').txt('VAT').up()
          .up()
        .up()
      .up()
    .up();

    // Legal Monetary Total
    doc.ele('cac:LegalMonetaryTotal')
      .ele('cbc:LineExtensionAmount', { currencyID: 'RSD' }).txt(totalWithoutTax.toFixed(2)).up()
      .ele('cbc:TaxExclusiveAmount', { currencyID: 'RSD' }).txt(totalWithoutTax.toFixed(2)).up()
      .ele('cbc:TaxInclusiveAmount', { currencyID: 'RSD' }).txt(Number(creditNote.totalAmount).toFixed(2)).up()
      .ele('cbc:PayableAmount', { currencyID: 'RSD' }).txt(Number(creditNote.totalAmount).toFixed(2)).up()
    .up();

    return doc.end({ prettyPrint: true });
  }

  /**
   * Cancel a credit note
   */
  static async cancelCreditNote(id: string, companyId: string, reason: string) {
    const creditNote = await prisma.creditNote.findFirst({
      where: { id, companyId },
    });

    if (!creditNote) {
      throw new Error('Credit note not found');
    }

    if (creditNote.status === CreditNoteStatus.CANCELLED) {
      throw new Error('Credit note is already cancelled');
    }

    const updated = await prisma.creditNote.update({
      where: { id },
      data: {
        status: CreditNoteStatus.CANCELLED,
      },
    });

    logger.info(`Credit note cancelled: ${creditNote.creditNoteNumber}`, { reason });

    return updated;
  }

  /**
   * Delete draft credit note
   */
  static async deleteCreditNote(id: string, companyId: string) {
    const creditNote = await prisma.creditNote.findFirst({
      where: { id, companyId },
    });

    if (!creditNote) {
      throw new Error('Credit note not found');
    }

    if (creditNote.status !== CreditNoteStatus.DRAFT) {
      throw new Error('Only draft credit notes can be deleted');
    }

    await prisma.creditNote.delete({ where: { id } });

    logger.info(`Credit note deleted: ${creditNote.creditNoteNumber}`);

    return { message: 'Credit note deleted' };
  }
}

export default CreditNoteService;
