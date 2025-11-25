/**
 * PDF Generator Service
 * Generates professional PDF invoices and reports
 */

import PDFDocument from 'pdfkit';
import { Decimal } from '@prisma/client/runtime/library';
import { logger } from '../utils/logger';

// ========================================
// INTERFACES
// ========================================

interface CompanyInfo {
  name: string;
  pib: string;
  address: string;
  city: string;
  postalCode: string;
  country?: string;
  email?: string;
  phone?: string;
  bankAccount?: string;
  vatNumber?: string;
}

interface PartnerInfo {
  name: string;
  pib: string;
  address?: string;
  city?: string;
  postalCode?: string;
  country?: string;
}

interface InvoiceLine {
  lineNumber: number;
  itemName: string;
  quantity: number | Decimal;
  unit?: string;
  unitPrice: number | Decimal;
  taxRate: number | Decimal;
  taxAmount: number | Decimal;
  amount: number | Decimal;
}

interface InvoiceData {
  invoiceNumber: string;
  issueDate: Date;
  dueDate?: Date;
  currency: string;
  totalAmount: number | Decimal;
  taxAmount: number | Decimal;
  note?: string;
  paymentStatus?: string;
  sefId?: string;
  supplier: CompanyInfo;
  buyer: PartnerInfo;
  lines: InvoiceLine[];
}

// ========================================
// PDF GENERATOR CLASS
// ========================================

export class PDFGenerator {
  /**
   * Generate invoice PDF
   */
  static async generateInvoicePDF(invoice: InvoiceData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margin: 50,
          info: {
            Title: `Faktura ${invoice.invoiceNumber}`,
            Author: invoice.supplier.name,
            Subject: 'Faktura',
          },
        });

        const chunks: Buffer[] = [];
        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        // Generate content
        this.addHeader(doc, invoice);
        this.addCompanyInfo(doc, invoice.supplier, invoice.buyer);
        this.addInvoiceDetails(doc, invoice);
        this.addLineItems(doc, invoice.lines, invoice.currency);
        this.addTotals(doc, invoice);
        this.addFooter(doc, invoice);

        doc.end();
      } catch (error) {
        logger.error('Error generating PDF:', error);
        reject(error);
      }
    });
  }

  /**
   * Add header with logo and title
   */
  private static addHeader(doc: typeof PDFDocument.prototype, invoice: InvoiceData): void {
    // Title
    doc.fontSize(24)
       .font('Helvetica-Bold')
       .text('FAKTURA', { align: 'center' });

    doc.moveDown(0.5);
    doc.fontSize(12)
       .font('Helvetica')
       .text(`Broj: ${invoice.invoiceNumber}`, { align: 'center' });

    doc.moveDown(1);

    // Horizontal line
    doc.moveTo(50, doc.y)
       .lineTo(545, doc.y)
       .stroke();

    doc.moveDown(1);
  }

  /**
   * Add supplier and buyer info
   */
  private static addCompanyInfo(
    doc: typeof PDFDocument.prototype,
    supplier: CompanyInfo,
    buyer: PartnerInfo
  ): void {
    const startY = doc.y;
    
    // Supplier (left side)
    doc.fontSize(10)
       .font('Helvetica-Bold')
       .text('PRODAVAC:', 50, startY);

    doc.font('Helvetica')
       .text(supplier.name, 50, doc.y + 5);
    
    doc.text(supplier.address || '', 50);
    doc.text(`${supplier.postalCode || ''} ${supplier.city || ''}`, 50);
    doc.text(`PIB: ${supplier.pib}`, 50);
    
    if (supplier.vatNumber) {
      doc.text(`PDV broj: ${supplier.vatNumber}`, 50);
    }
    if (supplier.bankAccount) {
      doc.text(`Tekući račun: ${supplier.bankAccount}`, 50);
    }
    if (supplier.email) {
      doc.text(`Email: ${supplier.email}`, 50);
    }
    if (supplier.phone) {
      doc.text(`Tel: ${supplier.phone}`, 50);
    }

    const supplierEndY = doc.y;

    // Buyer (right side)
    doc.fontSize(10)
       .font('Helvetica-Bold')
       .text('KUPAC:', 300, startY);

    doc.font('Helvetica')
       .text(buyer.name, 300, doc.y + 5);
    
    if (buyer.address) {
      doc.text(buyer.address, 300);
    }
    if (buyer.city || buyer.postalCode) {
      doc.text(`${buyer.postalCode || ''} ${buyer.city || ''}`, 300);
    }
    doc.text(`PIB: ${buyer.pib}`, 300);

    // Move to the lowest point
    doc.y = Math.max(supplierEndY, doc.y) + 20;

    // Horizontal line
    doc.moveTo(50, doc.y)
       .lineTo(545, doc.y)
       .stroke();

    doc.moveDown(1);
  }

  /**
   * Add invoice details (dates, etc.)
   */
  private static addInvoiceDetails(doc: typeof PDFDocument.prototype, invoice: InvoiceData): void {
    const formatDate = (date: Date) => {
      return new Date(date).toLocaleDateString('sr-Latn-RS', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    };

    doc.fontSize(10);

    const detailsY = doc.y;
    
    // Left column
    doc.font('Helvetica-Bold')
       .text('Datum izdavanja:', 50, detailsY, { continued: true })
       .font('Helvetica')
       .text(` ${formatDate(invoice.issueDate)}`);

    if (invoice.dueDate) {
      doc.font('Helvetica-Bold')
         .text('Rok plaćanja:', 50, doc.y, { continued: true })
         .font('Helvetica')
         .text(` ${formatDate(invoice.dueDate)}`);
    }

    // Right column
    doc.font('Helvetica-Bold')
       .text('Valuta:', 300, detailsY, { continued: true })
       .font('Helvetica')
       .text(` ${invoice.currency}`);

    if (invoice.sefId) {
      doc.font('Helvetica-Bold')
         .text('SEF ID:', 300, doc.y, { continued: true })
         .font('Helvetica')
         .text(` ${invoice.sefId}`);
    }

    doc.moveDown(1.5);
  }

  /**
   * Add line items table
   */
  private static addLineItems(
    doc: typeof PDFDocument.prototype,
    lines: InvoiceLine[],
    _currency: string // Prefixed with underscore to indicate intentionally unused
  ): void {
    const tableTop = doc.y;
    const tableHeaders = ['R.br.', 'Opis', 'Kol.', 'JM', 'Cena', 'PDV %', 'PDV', 'Iznos'];
    const colWidths = [35, 165, 40, 30, 65, 45, 55, 65];
    const startX = 50;

    // Format number
    const formatNumber = (num: number | Decimal) => {
      const value = typeof num === 'object' ? Number(num) : num;
      return value.toLocaleString('sr-RS', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    // Table header
    doc.font('Helvetica-Bold').fontSize(9);
    let currentX = startX;

    // Header background
    doc.rect(startX, tableTop - 5, 495, 20).fill('#f0f0f0');
    doc.fillColor('black');

    tableHeaders.forEach((header, i) => {
      const width = colWidths[i] ?? 50;
      doc.text(header, currentX + 2, tableTop, { width: width - 4, align: 'center' });
      currentX += width;
    });

    let currentY = tableTop + 20;

    // Table rows
    doc.font('Helvetica').fontSize(8);

    lines.forEach((line, index) => {
      // Check if we need a new page
      if (currentY > 700) {
        doc.addPage();
        currentY = 50;
      }

      currentX = startX;
      const rowY = currentY;

      // Alternate row background
      if (index % 2 === 1) {
        doc.rect(startX, rowY - 2, 495, 15).fill('#fafafa');
        doc.fillColor('black');
      }

      // Row data
      const rowData = [
        line.lineNumber.toString(),
        line.itemName.substring(0, 40),
        formatNumber(line.quantity),
        line.unit || 'kom',
        formatNumber(line.unitPrice),
        `${Number(line.taxRate).toFixed(0)}%`,
        formatNumber(line.taxAmount),
        formatNumber(line.amount),
      ];

      rowData.forEach((cell, i) => {
        const width = colWidths[i] ?? 50;
        const align = i === 1 ? 'left' : 'right';
        doc.text(cell, currentX + 2, rowY, { width: width - 4, align });
        currentX += width;
      });

      currentY += 15;
    });

    // Bottom line
    doc.moveTo(startX, currentY)
       .lineTo(545, currentY)
       .stroke();

    doc.y = currentY + 10;
  }

  /**
   * Add totals section
   */
  private static addTotals(doc: typeof PDFDocument.prototype, invoice: InvoiceData): void {
    const formatNumber = (num: number | Decimal) => {
      const value = typeof num === 'object' ? Number(num) : num;
      return value.toLocaleString('sr-RS', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    const totalAmount = typeof invoice.totalAmount === 'object' 
      ? Number(invoice.totalAmount) 
      : invoice.totalAmount;
    const taxAmount = typeof invoice.taxAmount === 'object' 
      ? Number(invoice.taxAmount) 
      : invoice.taxAmount;
    const baseAmount = totalAmount - taxAmount;

    const totalsX = 350;
    doc.fontSize(10);

    // Base amount
    doc.font('Helvetica')
       .text('Osnovica:', totalsX, doc.y, { continued: true, width: 100 })
       .text(`${formatNumber(baseAmount)} ${invoice.currency}`, { align: 'right', width: 95 });

    // Tax amount
    doc.font('Helvetica')
       .text('PDV:', totalsX, doc.y, { continued: true, width: 100 })
       .text(`${formatNumber(taxAmount)} ${invoice.currency}`, { align: 'right', width: 95 });

    doc.moveDown(0.3);

    // Total line
    doc.moveTo(totalsX, doc.y)
       .lineTo(545, doc.y)
       .stroke();

    doc.moveDown(0.3);

    // Total
    doc.font('Helvetica-Bold').fontSize(12)
       .text('UKUPNO ZA PLAĆANJE:', totalsX, doc.y, { continued: true, width: 100 });
    doc.text(`${formatNumber(totalAmount)} ${invoice.currency}`, { align: 'right', width: 95 });

    doc.moveDown(2);
  }

  /**
   * Add footer
   */
  private static addFooter(doc: typeof PDFDocument.prototype, invoice: InvoiceData): void {
    // Note
    if (invoice.note) {
      doc.font('Helvetica-Bold').fontSize(9)
         .text('Napomena:', 50);
      doc.font('Helvetica')
         .text(invoice.note, 50, doc.y, { width: 495 });
      doc.moveDown(1);
    }

    // Payment info
    if (invoice.supplier.bankAccount) {
      doc.font('Helvetica-Bold').fontSize(9)
         .text('Podaci za plaćanje:', 50);
      doc.font('Helvetica')
         .text(`Primalac: ${invoice.supplier.name}`, 50)
         .text(`Tekući račun: ${invoice.supplier.bankAccount}`, 50)
         .text(`Poziv na broj: ${invoice.invoiceNumber}`, 50);
    }

    // Signature area
    doc.moveDown(2);
    const signY = Math.max(doc.y, 700);

    doc.moveTo(50, signY)
       .lineTo(200, signY)
       .stroke();
    doc.fontSize(8)
       .text('Potpis i pečat prodavca', 50, signY + 5);

    doc.moveTo(395, signY)
       .lineTo(545, signY)
       .stroke();
    doc.text('Potpis kupca', 395, signY + 5);

    // Footer text
    doc.fontSize(7)
       .text('Dokument je kreiran elektronski i važi bez potpisa i pečata.', 50, 780, { align: 'center' });
  }

  /**
   * Generate financial report PDF
   */
  static async generateReportPDF(
    title: string,
    company: CompanyInfo,
    period: { from: Date; to: Date },
    data: any[],
    columns: { key: string; label: string; width: number; align?: 'left' | 'center' | 'right' }[]
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          layout: 'landscape',
          margin: 40,
          info: {
            Title: title,
            Author: company.name,
          },
        });

        const chunks: Buffer[] = [];
        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        // Header
        doc.fontSize(18)
           .font('Helvetica-Bold')
           .text(title, { align: 'center' });

        doc.fontSize(12)
           .font('Helvetica')
           .text(company.name, { align: 'center' });

        doc.fontSize(10)
           .text(`Period: ${period.from.toLocaleDateString('sr-RS')} - ${period.to.toLocaleDateString('sr-RS')}`, { align: 'center' });

        doc.moveDown(2);

        // Table
        const tableTop = doc.y;
        const startX = 40;
        let currentX = startX;

        // Header
        doc.font('Helvetica-Bold').fontSize(9);
        doc.rect(startX, tableTop - 5, 720, 20).fill('#e0e0e0');
        doc.fillColor('black');

        columns.forEach((col) => {
          doc.text(col.label, currentX + 2, tableTop, { width: col.width - 4, align: col.align || 'left' });
          currentX += col.width;
        });

        let currentY = tableTop + 20;

        // Data rows
        doc.font('Helvetica').fontSize(8);

        data.forEach((row, index) => {
          if (currentY > 500) {
            doc.addPage();
            currentY = 50;
          }

          currentX = startX;

          if (index % 2 === 1) {
            doc.rect(startX, currentY - 2, 720, 15).fill('#fafafa');
            doc.fillColor('black');
          }

          columns.forEach((col) => {
            const value = row[col.key] ?? '';
            const displayValue = typeof value === 'number' 
              ? value.toLocaleString('sr-RS', { minimumFractionDigits: 2 })
              : String(value);
            doc.text(displayValue, currentX + 2, currentY, { width: col.width - 4, align: col.align || 'left' });
            currentX += col.width;
          });

          currentY += 15;
        });

        doc.end();
      } catch (error) {
        logger.error('Error generating report PDF:', error);
        reject(error);
      }
    });
  }
}

export default PDFGenerator;
