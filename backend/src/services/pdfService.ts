/**
 * PDF Generation Service
 * Generates PDF documents for invoices, reports, and other business documents
 */

import PDFDocument from 'pdfkit';
import { logger } from '../utils/logger';
import { Decimal } from 'decimal.js';

interface InvoiceData {
  id: string;
  invoiceNumber: string;
  issueDate: Date;
  dueDate: Date;
  seller: {
    name: string;
    pib: string;
    address: string;
    city: string;
    bankAccount?: string;
  };
  buyer: {
    name: string;
    pib: string;
    address: string;
    city: string;
  };
  items: Array<{
    name: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    vatRate: number;
    totalPrice: number;
  }>;
  subtotal: number;
  vatAmount: number;
  totalAmount: number;
  currencyCode: string;
  note?: string;
  sefId?: string;
}

interface PPPDVData {
  period: {
    year: number;
    month?: number;
    quarter?: number;
  };
  taxpayer: {
    pib: string;
    name: string;
    address: string;
    municipality: string;
  };
  fields: Array<{
    code: string;
    label: string;
    value: number;
  }>;
  totalInputVAT: number;
  totalOutputVAT: number;
  balance: number;
}

class PDFService {
  private readonly primaryColor = '#2563EB';
  private readonly textColor = '#1F2937';
  private readonly lightGray = '#F3F4F6';
  private readonly mediumGray = '#9CA3AF';

  /**
   * Generate invoice PDF
   */
  async generateInvoicePDF(invoice: InvoiceData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const chunks: Buffer[] = [];
        const doc = new PDFDocument({
          size: 'A4',
          margin: 50,
          info: {
            Title: `Faktura ${invoice.invoiceNumber}`,
            Author: invoice.seller.name,
            Subject: 'Elektronska faktura',
            Creator: 'SEF eFakture',
          }
        });

        doc.on('data', (chunk: Buffer) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        this.generateInvoiceContent(doc, invoice);
        doc.end();
      } catch (error) {
        logger.error('PDF generation error:', error);
        reject(error);
      }
    });
  }

  private generateInvoiceContent(doc: PDFKit.PDFDocument, invoice: InvoiceData): void {
    const pageWidth = doc.page.width - 100;

    // Header
    doc.fontSize(24)
       .fillColor(this.primaryColor)
       .text('FAKTURA', 50, 50);
    
    doc.fontSize(12)
       .fillColor(this.textColor)
       .text(`Broj: ${invoice.invoiceNumber}`, 50, 80);

    // SEF ID if available
    if (invoice.sefId) {
      doc.fontSize(10)
         .fillColor(this.mediumGray)
         .text(`SEF ID: ${invoice.sefId}`, 50, 95);
    }

    // Dates on the right
    doc.fontSize(10)
       .fillColor(this.textColor)
       .text(`Datum izdavanja: ${this.formatDate(invoice.issueDate)}`, 400, 50)
       .text(`Datum valute: ${this.formatDate(invoice.dueDate)}`, 400, 65);

    // Horizontal line
    doc.moveTo(50, 120)
       .lineTo(pageWidth + 50, 120)
       .strokeColor(this.lightGray)
       .stroke();

    // Seller and Buyer info
    let yPos = 140;

    // Seller (left column)
    doc.fontSize(10)
       .fillColor(this.mediumGray)
       .text('PRODAVAC', 50, yPos);
    
    yPos += 15;
    doc.fontSize(11)
       .fillColor(this.textColor)
       .font('Helvetica-Bold')
       .text(invoice.seller.name, 50, yPos);
    
    yPos += 15;
    doc.font('Helvetica')
       .fontSize(10)
       .text(`PIB: ${invoice.seller.pib}`, 50, yPos);
    
    yPos += 12;
    doc.text(invoice.seller.address, 50, yPos);
    
    yPos += 12;
    doc.text(invoice.seller.city, 50, yPos);

    if (invoice.seller.bankAccount) {
      yPos += 12;
      doc.text(`Račun: ${invoice.seller.bankAccount}`, 50, yPos);
    }

    // Buyer (right column)
    yPos = 140;
    doc.fontSize(10)
       .fillColor(this.mediumGray)
       .text('KUPAC', 300, yPos);
    
    yPos += 15;
    doc.fontSize(11)
       .fillColor(this.textColor)
       .font('Helvetica-Bold')
       .text(invoice.buyer.name, 300, yPos);
    
    yPos += 15;
    doc.font('Helvetica')
       .fontSize(10)
       .text(`PIB: ${invoice.buyer.pib}`, 300, yPos);
    
    yPos += 12;
    doc.text(invoice.buyer.address, 300, yPos);
    
    yPos += 12;
    doc.text(invoice.buyer.city, 300, yPos);

    // Items table
    yPos = 260;
    
    // Table header
    doc.rect(50, yPos, pageWidth, 25)
       .fill(this.lightGray);
    
    doc.fillColor(this.textColor)
       .fontSize(9)
       .font('Helvetica-Bold')
       .text('R.br', 55, yPos + 8, { width: 30 })
       .text('Naziv', 90, yPos + 8, { width: 180 })
       .text('Kol.', 275, yPos + 8, { width: 40, align: 'right' })
       .text('JM', 320, yPos + 8, { width: 30 })
       .text('Cena', 355, yPos + 8, { width: 70, align: 'right' })
       .text('PDV%', 430, yPos + 8, { width: 40, align: 'right' })
       .text('Iznos', 475, yPos + 8, { width: 70, align: 'right' });

    yPos += 25;
    doc.font('Helvetica');

    // Table rows
    invoice.items.forEach((item, index) => {
      const rowHeight = 22;
      
      if (index % 2 === 1) {
        doc.rect(50, yPos, pageWidth, rowHeight)
           .fill('#FAFAFA');
      }

      doc.fillColor(this.textColor)
         .fontSize(9)
         .text(String(index + 1), 55, yPos + 6, { width: 30 })
         .text(item.name, 90, yPos + 6, { width: 180 })
         .text(this.formatNumber(item.quantity), 275, yPos + 6, { width: 40, align: 'right' })
         .text(item.unit, 320, yPos + 6, { width: 30 })
         .text(this.formatMoney(item.unitPrice), 355, yPos + 6, { width: 70, align: 'right' })
         .text(`${item.vatRate}%`, 430, yPos + 6, { width: 40, align: 'right' })
         .text(this.formatMoney(item.totalPrice), 475, yPos + 6, { width: 70, align: 'right' });

      yPos += rowHeight;

      // Check if we need a new page
      if (yPos > 700) {
        doc.addPage();
        yPos = 50;
      }
    });

    // Totals section
    yPos += 20;
    
    doc.moveTo(350, yPos)
       .lineTo(pageWidth + 50, yPos)
       .strokeColor(this.lightGray)
       .stroke();

    yPos += 10;

    // Subtotal
    doc.fontSize(10)
       .fillColor(this.mediumGray)
       .text('Osnovica:', 350, yPos, { width: 100 })
       .fillColor(this.textColor)
       .text(this.formatMoney(invoice.subtotal) + ' ' + invoice.currencyCode, 450, yPos, { width: 95, align: 'right' });

    yPos += 18;

    // VAT
    doc.fillColor(this.mediumGray)
       .text('PDV:', 350, yPos, { width: 100 })
       .fillColor(this.textColor)
       .text(this.formatMoney(invoice.vatAmount) + ' ' + invoice.currencyCode, 450, yPos, { width: 95, align: 'right' });

    yPos += 18;
    
    doc.moveTo(350, yPos)
       .lineTo(pageWidth + 50, yPos)
       .strokeColor(this.mediumGray)
       .stroke();

    yPos += 10;

    // Total
    doc.fontSize(12)
       .font('Helvetica-Bold')
       .fillColor(this.primaryColor)
       .text('UKUPNO:', 350, yPos, { width: 100 })
       .text(this.formatMoney(invoice.totalAmount) + ' ' + invoice.currencyCode, 450, yPos, { width: 95, align: 'right' });

    // Note
    if (invoice.note) {
      yPos += 50;
      doc.font('Helvetica')
         .fontSize(9)
         .fillColor(this.mediumGray)
         .text('Napomena:', 50, yPos);
      
      yPos += 12;
      doc.fillColor(this.textColor)
         .text(invoice.note, 50, yPos, { width: pageWidth });
    }

    // Footer
    const footerY = doc.page.height - 80;
    doc.fontSize(8)
       .fillColor(this.mediumGray)
       .text('Dokument je generisan elektronski i validan je bez potpisa i pečata.', 50, footerY, { align: 'center', width: pageWidth })
       .text('SEF eFakture - Sistem Elektronskih Faktura', 50, footerY + 12, { align: 'center', width: pageWidth });
  }

  /**
   * Generate PP-PDV report PDF
   */
  async generatePPPDVPDF(data: PPPDVData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const chunks: Buffer[] = [];
        const doc = new PDFDocument({
          size: 'A4',
          margin: 50,
          info: {
            Title: `PP-PDV ${data.period.year}/${data.period.month || data.period.quarter}`,
            Author: data.taxpayer.name,
            Subject: 'Poreska prijava za PDV',
            Creator: 'SEF eFakture',
          }
        });

        doc.on('data', (chunk: Buffer) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        this.generatePPPDVContent(doc, data);
        doc.end();
      } catch (error) {
        logger.error('PP-PDV PDF generation error:', error);
        reject(error);
      }
    });
  }

  private generatePPPDVContent(doc: PDFKit.PDFDocument, data: PPPDVData): void {
    const pageWidth = doc.page.width - 100;

    // Header
    doc.fontSize(16)
       .fillColor(this.primaryColor)
       .font('Helvetica-Bold')
       .text('PORESKA PRIJAVA POREZA NA DODATU VREDNOST', 50, 50, { align: 'center', width: pageWidth });

    doc.fontSize(12)
       .text('OBRAZAC PP-PDV', 50, 75, { align: 'center', width: pageWidth });

    // Period
    let periodText = `Za period: ${data.period.year}`;
    if (data.period.quarter) {
      periodText += ` / ${data.period.quarter}. kvartal`;
    } else if (data.period.month) {
      periodText += ` / ${data.period.month}. mesec`;
    }
    
    doc.fontSize(11)
       .font('Helvetica')
       .fillColor(this.textColor)
       .text(periodText, 50, 100, { align: 'center', width: pageWidth });

    // Taxpayer info
    let yPos = 140;
    doc.rect(50, yPos, pageWidth, 80)
       .strokeColor(this.mediumGray)
       .stroke();

    yPos += 10;
    doc.fontSize(10)
       .fillColor(this.mediumGray)
       .text('PODACI O PORESKOM OBVEZNIKU', 60, yPos);

    yPos += 18;
    doc.fillColor(this.textColor)
       .font('Helvetica-Bold')
       .text(`PIB: ${data.taxpayer.pib}`, 60, yPos);

    yPos += 15;
    doc.font('Helvetica')
       .text(`Naziv: ${data.taxpayer.name}`, 60, yPos);

    yPos += 15;
    doc.text(`Adresa: ${data.taxpayer.address}, ${data.taxpayer.municipality}`, 60, yPos);

    // Fields table
    yPos = 250;

    // Group fields by category
    const outputFields = data.fields.filter(f => f.code.startsWith('0'));
    const inputFields = data.fields.filter(f => f.code.startsWith('1'));
    const balanceFields = data.fields.filter(f => f.code.startsWith('2'));
    const otherFields = data.fields.filter(f => f.code.startsWith('3'));

    yPos = this.drawPPPDVSection(doc, 'I. IZLAZNI PDV', outputFields, yPos, pageWidth);
    yPos = this.drawPPPDVSection(doc, 'II. ULAZNI PDV (PRETPOREZ)', inputFields, yPos + 20, pageWidth);
    yPos = this.drawPPPDVSection(doc, 'III. PORESKA OBAVEZA/KREDIT', balanceFields, yPos + 20, pageWidth);
    
    if (otherFields.length > 0) {
      yPos = this.drawPPPDVSection(doc, 'IV. OSTALO', otherFields, yPos + 20, pageWidth);
    }

    // Summary box
    yPos += 30;
    doc.rect(300, yPos, pageWidth - 250, 80)
       .fillAndStroke(this.lightGray, this.mediumGray);

    yPos += 15;
    doc.fontSize(10)
       .fillColor(this.textColor)
       .text(`Ukupan izlazni PDV: ${this.formatMoney(data.totalOutputVAT)} RSD`, 310, yPos)
       .text(`Ukupan ulazni PDV: ${this.formatMoney(data.totalInputVAT)} RSD`, 310, yPos + 18);

    yPos += 40;
    doc.font('Helvetica-Bold')
       .fontSize(11);
    
    if (data.balance > 0) {
      doc.fillColor('#DC2626')
         .text(`PDV ZA UPLATU: ${this.formatMoney(data.balance)} RSD`, 310, yPos);
    } else {
      doc.fillColor('#059669')
         .text(`PDV ZA POVRAT: ${this.formatMoney(Math.abs(data.balance))} RSD`, 310, yPos);
    }

    // Footer
    const footerY = doc.page.height - 80;
    doc.font('Helvetica')
       .fontSize(8)
       .fillColor(this.mediumGray)
       .text(`Generisano: ${new Date().toLocaleDateString('sr-Latn-RS')}`, 50, footerY)
       .text('SEF eFakture - Sistem Elektronskih Faktura', 50, footerY + 12, { align: 'center', width: pageWidth });
  }

  private drawPPPDVSection(
    doc: PDFKit.PDFDocument,
    title: string,
    fields: Array<{ code: string; label: string; value: number }>,
    startY: number,
    pageWidth: number
  ): number {
    let yPos = startY;

    // Section title
    doc.fontSize(10)
       .font('Helvetica-Bold')
       .fillColor(this.primaryColor)
       .text(title, 50, yPos);

    yPos += 18;

    // Fields
    doc.font('Helvetica')
       .fontSize(9);

    fields.forEach(field => {
      doc.fillColor(this.textColor)
         .text(field.code, 50, yPos, { width: 30 })
         .text(field.label, 85, yPos, { width: 350 })
         .text(this.formatMoney(field.value), 440, yPos, { width: 100, align: 'right' });

      yPos += 16;
    });

    return yPos;
  }

  /**
   * Generate report PDF (generic)
   */
  async generateReportPDF(title: string, data: any[], columns: { key: string; label: string; format?: 'number' | 'money' | 'date' }[]): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const chunks: Buffer[] = [];
        const doc = new PDFDocument({
          size: 'A4',
          layout: 'landscape',
          margin: 40,
          info: {
            Title: title,
            Creator: 'SEF eFakture',
          }
        });

        doc.on('data', (chunk: Buffer) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        const pageWidth = doc.page.width - 80;

        // Header
        doc.fontSize(16)
           .fillColor(this.primaryColor)
           .text(title, 40, 40, { align: 'center', width: pageWidth });

        doc.fontSize(10)
           .fillColor(this.mediumGray)
           .text(`Generisano: ${new Date().toLocaleDateString('sr-Latn-RS')}`, 40, 65, { align: 'center', width: pageWidth });

        // Table
        let yPos = 100;
        const colWidth = pageWidth / columns.length;

        // Header row
        doc.rect(40, yPos, pageWidth, 25)
           .fill(this.lightGray);

        doc.fillColor(this.textColor)
           .fontSize(9)
           .font('Helvetica-Bold');

        columns.forEach((col, i) => {
          doc.text(col.label, 45 + (i * colWidth), yPos + 8, { width: colWidth - 10, align: col.format === 'money' || col.format === 'number' ? 'right' : 'left' });
        });

        yPos += 25;
        doc.font('Helvetica');

        // Data rows
        data.forEach((row, rowIndex) => {
          if (rowIndex % 2 === 1) {
            doc.rect(40, yPos, pageWidth, 20)
               .fill('#FAFAFA');
          }

          doc.fillColor(this.textColor);

          columns.forEach((col, i) => {
            let value = row[col.key];
            
            if (col.format === 'money') {
              value = this.formatMoney(value);
            } else if (col.format === 'number') {
              value = this.formatNumber(value);
            } else if (col.format === 'date' && value) {
              value = this.formatDate(new Date(value));
            }

            doc.text(String(value ?? ''), 45 + (i * colWidth), yPos + 5, { 
              width: colWidth - 10, 
              align: col.format === 'money' || col.format === 'number' ? 'right' : 'left' 
            });
          });

          yPos += 20;

          // New page if needed
          if (yPos > doc.page.height - 60) {
            doc.addPage();
            yPos = 40;
          }
        });

        doc.end();
      } catch (error) {
        logger.error('Report PDF generation error:', error);
        reject(error);
      }
    });
  }

  // Helper methods
  private formatDate(date: Date): string {
    return date.toLocaleDateString('sr-Latn-RS', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  private formatMoney(amount: number): string {
    return new Decimal(amount || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }

  private formatNumber(num: number): string {
    return new Decimal(num || 0).toFixed(2);
  }
}

// Export both class and instance
export { PDFService };
export const pdfService = new PDFService();
export default pdfService;
