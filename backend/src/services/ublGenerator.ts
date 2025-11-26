import { create } from 'xmlbuilder2';
import { logger } from '../utils/logger';
import { UBLInvoiceSchema, type UBLInvoice } from '@sef-app/shared';
import { ZodError } from 'zod';

// Re-export type for backward compatibility
export type { UBLInvoice };

export class UBLGenerator {
  /**
   * Generate UBL 2.1 XML for SEF
   */
  static generateInvoiceXML(invoice: UBLInvoice): string {
    try {
      // Format dates as YYYY-MM-DD
      const issueDate = invoice.issueDate instanceof Date 
        ? invoice.issueDate.toISOString().split('T')[0]
        : invoice.issueDate;
      const dueDate = invoice.dueDate instanceof Date
        ? invoice.dueDate.toISOString().split('T')[0]
        : invoice.dueDate;

      const doc = create({ version: '1.0', encoding: 'UTF-8' })
        .ele('Invoice', {
          'xmlns': 'urn:oasis:names:specification:ubl:schema:xsd:Invoice-2',
          'xmlns:cac': 'urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2',
          'xmlns:cbc': 'urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2',
        })
          .ele('cbc:UBLVersionID').txt('2.1').up()
          .ele('cbc:CustomizationID').txt('urn:cen.eu:en16931:2017#compliant#urn:fdc:peppol.eu:2017:poacc:billing:3.0').up()
          .ele('cbc:ProfileID').txt('urn:fdc:peppol.eu:2017:poacc:billing:01:1.0').up()
          .ele('cbc:ID').txt(invoice.invoiceNumber).up()
          .ele('cbc:IssueDate').txt(issueDate || '').up();

      if (dueDate) {
        doc.ele('cbc:DueDate').txt(dueDate).up();
      }

      doc.ele('cbc:InvoiceTypeCode').txt('380').up()
        .ele('cbc:DocumentCurrencyCode').txt(invoice.currency).up();

      // Supplier Party
      doc.ele('cac:AccountingSupplierParty')
        .ele('cac:Party')
          .ele('cac:PartyName')
            .ele('cbc:Name').txt(invoice.supplier.name).up()
          .up()
          .ele('cac:PostalAddress')
            .ele('cbc:StreetName').txt(invoice.supplier.address).up()
            .ele('cbc:CityName').txt(invoice.supplier.city).up()
            .ele('cbc:PostalZone').txt(invoice.supplier.postalCode).up()
            .ele('cac:Country')
              .ele('cbc:IdentificationCode').txt(invoice.supplier.country).up()
            .up()
          .up()
          .ele('cac:PartyTaxScheme')
            .ele('cbc:CompanyID').txt(invoice.supplier.pib).up()
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
            .ele('cbc:Name').txt(invoice.buyer.name).up()
          .up()
          .ele('cac:PostalAddress')
            .ele('cbc:StreetName').txt(invoice.buyer.address).up()
            .ele('cbc:CityName').txt(invoice.buyer.city).up()
            .ele('cbc:PostalZone').txt(invoice.buyer.postalCode).up()
            .ele('cac:Country')
              .ele('cbc:IdentificationCode').txt(invoice.buyer.country).up()
            .up()
          .up()
          .ele('cac:PartyTaxScheme')
            .ele('cbc:CompanyID').txt(invoice.buyer.pib).up()
            .ele('cac:TaxScheme')
              .ele('cbc:ID').txt('VAT').up()
            .up()
          .up()
        .up()
      .up();

      // Invoice Lines
      invoice.lines.forEach((line: any) => {
        // Determine tax category code based on rate
        // S = Standard rate (20%), Z = Zero rate (0%), AA = Reduced rate (10%)
        let lineTaxCategoryId = 'S';
        if (line.taxRate === 0) {
          lineTaxCategoryId = 'Z';
        } else if (line.taxRate === 10) {
          lineTaxCategoryId = 'AA';
        }

        doc.ele('cac:InvoiceLine')
          .ele('cbc:ID').txt(line.id.toString()).up()
          .ele('cbc:InvoicedQuantity', { unitCode: line.unitCode }).txt(line.quantity.toString()).up()
          .ele('cbc:LineExtensionAmount', { currencyID: invoice.currency }).txt(line.lineAmount.toFixed(2)).up()
          .ele('cac:Item')
            .ele('cbc:Name').txt(line.name).up()
            .ele('cac:ClassifiedTaxCategory')
              .ele('cbc:ID').txt(lineTaxCategoryId).up()
              .ele('cbc:Percent').txt(line.taxRate.toString()).up()
              .ele('cac:TaxScheme')
                .ele('cbc:ID').txt('VAT').up()
              .up()
            .up()
          .up()
          .ele('cac:Price')
            .ele('cbc:PriceAmount', { currencyID: invoice.currency }).txt(line.unitPrice.toFixed(2)).up()
          .up()
        .up();
      });

      // Group lines by tax rate to calculate TaxSubtotals
      const taxGroups = invoice.lines.reduce((acc: any, line: any) => {
        const rate = line.taxRate;
        if (!acc[rate]) {
          acc[rate] = { taxableAmount: 0, taxAmount: 0 };
        }
        acc[rate].taxableAmount += line.lineAmount;
        acc[rate].taxAmount += line.lineAmount * (rate / 100);
        return acc;
      }, {} as Record<number, { taxableAmount: number; taxAmount: number }>);

      // Tax Total with multiple TaxSubtotals for different rates
      const taxTotal = doc.ele('cac:TaxTotal')
        .ele('cbc:TaxAmount', { currencyID: invoice.currency }).txt(invoice.totals.taxAmount.toFixed(2)).up();

      // Add TaxSubtotal for each tax rate (0%, 10%, 20% in Serbia)
      Object.entries(taxGroups)
        .sort(([a], [b]) => Number(a) - Number(b))
        .forEach(([rate, amounts]: [string, any]) => {
          const taxRate = Number(rate);
          // Determine tax category code based on rate
          // S = Standard rate, Z = Zero rate, AA = Reduced rate
          let categoryId = 'S';
          if (taxRate === 0) {
            categoryId = 'Z';
          } else if (taxRate === 10) {
            categoryId = 'AA'; // Reduced rate
          }

          taxTotal.ele('cac:TaxSubtotal')
            .ele('cbc:TaxableAmount', { currencyID: invoice.currency }).txt(amounts.taxableAmount.toFixed(2)).up()
            .ele('cbc:TaxAmount', { currencyID: invoice.currency }).txt(amounts.taxAmount.toFixed(2)).up()
            .ele('cac:TaxCategory')
              .ele('cbc:ID').txt(categoryId).up()
              .ele('cbc:Percent').txt(taxRate.toString()).up()
              .ele('cac:TaxScheme')
                .ele('cbc:ID').txt('VAT').up()
              .up()
            .up()
          .up();
        });

      taxTotal.up();

      // Legal Monetary Total
      doc.ele('cac:LegalMonetaryTotal')
        .ele('cbc:LineExtensionAmount', { currencyID: invoice.currency }).txt(invoice.totals.taxExclusiveAmount.toFixed(2)).up()
        .ele('cbc:TaxExclusiveAmount', { currencyID: invoice.currency }).txt(invoice.totals.taxExclusiveAmount.toFixed(2)).up()
        .ele('cbc:TaxInclusiveAmount', { currencyID: invoice.currency }).txt(invoice.totals.taxInclusiveAmount.toFixed(2)).up()
        .ele('cbc:PayableAmount', { currencyID: invoice.currency }).txt(invoice.totals.payableAmount.toFixed(2)).up()
      .up();

      const xml = doc.end({ prettyPrint: true });
      logger.info(`Generated UBL XML for invoice ${invoice.invoiceNumber}`);
      return xml;
    } catch (error) {
      logger.error('Failed to generate UBL XML:', error);
      throw new Error('UBL Generation Failed');
    }
  }

  /**
   * Validate UBL structure using Zod schema
   */
  static validateInvoice(invoice: UBLInvoice): { valid: boolean; errors: string[] } {
    try {
      UBLInvoiceSchema.parse(invoice);
      return {
        valid: true,
        errors: [],
      };
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.errors.map(err => {
          const path = err.path.join('.');
          return path ? `${path}: ${err.message}` : err.message;
        });
        
        logger.warn('UBL validation failed', {
          errors,
          invoice: {
            invoiceNumber: invoice.invoiceNumber,
            issueDate: invoice.issueDate,
          },
        });
        
        return {
          valid: false,
          errors,
        };
      }
      
      logger.error('Unknown validation error', error);
      return {
        valid: false,
        errors: ['Unknown validation error occurred'],
      };
    }
  }
}

export default UBLGenerator;
