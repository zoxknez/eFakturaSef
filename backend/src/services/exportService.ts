// Export service for PDF and Excel generation
import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';
import { Response } from 'express';
import { logger } from '../utils/logger';
import { format } from 'date-fns';

/**
 * Generate PDF from invoice data
 */
export async function generateInvoicePDF(invoice: any, res: Response): Promise<void> {
  try {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });

    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=invoice-${invoice.invoiceNumber}.pdf`);

    // Pipe PDF to response
    doc.pipe(res);

    // Header
    doc.fontSize(20).text('FAKTURA', { align: 'center' });
    doc.moveDown();

    // Invoice info
    doc.fontSize(10);
    doc.text(`Broj fakture: ${invoice.invoiceNumber}`, 50, 100);
    doc.text(`Datum izdavanja: ${format(new Date(invoice.issueDate), 'dd.MM.yyyy')}`, 50, 115);
    if (invoice.dueDate) {
      doc.text(`Datum dospeća: ${format(new Date(invoice.dueDate), 'dd.MM.yyyy')}`, 50, 130);
    }

    // Supplier (Issuer)
    doc.moveDown();
    doc.fontSize(12).text('IZDAVALAC:', 50, 160);
    doc.fontSize(10);
    doc.text(invoice.company.name, 50, 180);
    doc.text(`PIB: ${invoice.company.pib}`, 50, 195);
    doc.text(invoice.company.address, 50, 210);
    doc.text(`${invoice.company.postalCode} ${invoice.company.city}`, 50, 225);

    // Buyer
    doc.fontSize(12).text('KUPAC:', 300, 160);
    doc.fontSize(10);
    doc.text(invoice.buyerName, 300, 180);
    doc.text(`PIB: ${invoice.buyerPIB}`, 300, 195);
    if (invoice.buyerAddress) {
      doc.text(invoice.buyerAddress, 300, 210);
    }
    if (invoice.buyerCity && invoice.buyerPostalCode) {
      doc.text(`${invoice.buyerPostalCode} ${invoice.buyerCity}`, 300, 225);
    }

    // Line items table
    const tableTop = 280;
    doc.fontSize(10);

    // Table header
    doc.font('Helvetica-Bold');
    doc.text('Rb', 50, tableTop);
    doc.text('Naziv', 80, tableTop);
    doc.text('Količina', 280, tableTop);
    doc.text('Cena', 340, tableTop);
    doc.text('PDV %', 400, tableTop);
    doc.text('Ukupno', 460, tableTop);

    // Draw line
    doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();

    // Table rows
    doc.font('Helvetica');
    let yPosition = tableTop + 25;

    invoice.lines.forEach((line: any, index: number) => {
      doc.text((index + 1).toString(), 50, yPosition);
      doc.text(line.itemName.substring(0, 30), 80, yPosition);
      doc.text(Number(line.quantity).toFixed(2), 280, yPosition);
      doc.text(Number(line.unitPrice).toFixed(2), 340, yPosition);
      doc.text(Number(line.taxRate).toFixed(0) + '%', 400, yPosition);
      doc.text(Number(line.amount).toFixed(2), 460, yPosition);
      yPosition += 20;
    });

    // Draw line before totals
    doc.moveTo(50, yPosition + 10).lineTo(550, yPosition + 10).stroke();
    yPosition += 25;

    // Totals
    const taxExclusive = Number(invoice.totalAmount) - Number(invoice.taxAmount);
    doc.font('Helvetica-Bold');
    doc.text('Osnovica:', 350, yPosition);
    doc.text(`${taxExclusive.toFixed(2)} ${invoice.currency}`, 460, yPosition);
    yPosition += 20;

    doc.text('PDV:', 350, yPosition);
    doc.text(`${Number(invoice.taxAmount).toFixed(2)} ${invoice.currency}`, 460, yPosition);
    yPosition += 20;

    doc.fontSize(12);
    doc.text('UKUPNO:', 350, yPosition);
    doc.text(`${Number(invoice.totalAmount).toFixed(2)} ${invoice.currency}`, 460, yPosition);

    // Footer
    doc.fontSize(8).font('Helvetica');
    if (invoice.note) {
      doc.text(`Napomena: ${invoice.note}`, 50, 700);
    }
    doc.text(`Status: ${invoice.status}`, 50, 720);
    if (invoice.sefId) {
      doc.text(`SEF ID: ${invoice.sefId}`, 50, 735);
    }

    // Finalize PDF
    doc.end();

    logger.info('PDF generated successfully', {
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
    });
  } catch (error: any) {
    logger.error('Failed to generate PDF', {
      error: error.message,
      invoiceId: invoice.id,
    });
    throw error;
  }
}

/**
 * Generate Excel from invoices data
 */
export async function generateInvoicesExcel(invoices: any[], res: Response): Promise<void> {
  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Fakture');

    // Set column widths
    worksheet.columns = [
      { header: 'Broj fakture', key: 'invoiceNumber', width: 15 },
      { header: 'Datum izdavanja', key: 'issueDate', width: 15 },
      { header: 'Datum dospeća', key: 'dueDate', width: 15 },
      { header: 'Kupac', key: 'buyerName', width: 30 },
      { header: 'PIB kupca', key: 'buyerPIB', width: 12 },
      { header: 'Iznos', key: 'totalAmount', width: 12 },
      { header: 'PDV', key: 'taxAmount', width: 12 },
      { header: 'Valuta', key: 'currency', width: 8 },
      { header: 'Status', key: 'status', width: 12 },
      { header: 'SEF ID', key: 'sefId', width: 20 },
      { header: 'Kreirano', key: 'createdAt', width: 18 },
    ];

    // Style header row
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF2563EB' },
    };
    worksheet.getRow(1).font = { color: { argb: 'FFFFFFFF' }, bold: true };

    // Add data rows
    invoices.forEach((invoice) => {
      worksheet.addRow({
        invoiceNumber: invoice.invoiceNumber,
        issueDate: format(new Date(invoice.issueDate), 'dd.MM.yyyy'),
        dueDate: invoice.dueDate ? format(new Date(invoice.dueDate), 'dd.MM.yyyy') : '',
        buyerName: invoice.buyerName,
        buyerPIB: invoice.buyerPIB,
        totalAmount: Number(invoice.totalAmount),
        taxAmount: Number(invoice.taxAmount),
        currency: invoice.currency,
        status: invoice.status,
        sefId: invoice.sefId || '',
        createdAt: format(new Date(invoice.createdAt), 'dd.MM.yyyy HH:mm'),
      });
    });

    // Format number columns
    worksheet.getColumn('totalAmount').numFmt = '#,##0.00';
    worksheet.getColumn('taxAmount').numFmt = '#,##0.00';

    // Add borders
    worksheet.eachRow((row) => {
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
      });
    });

    // Set response headers
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader('Content-Disposition', `attachment; filename=invoices-${format(new Date(), 'yyyy-MM-dd')}.xlsx`);

    // Write to response
    await workbook.xlsx.write(res);
    res.end();

    logger.info('Excel generated successfully', {
      count: invoices.length,
    });
  } catch (error: any) {
    logger.error('Failed to generate Excel', {
      error: error.message,
    });
    throw error;
  }
}

/**
 * Generate Excel from invoice report (with summary)
 */
export async function generateInvoiceReport(
  invoices: any[],
  summary: any,
  res: Response
): Promise<void> {
  try {
    const workbook = new ExcelJS.Workbook();

    // Sheet 1: Summary
    const summarySheet = workbook.addWorksheet('Pregled');
    summarySheet.addRow(['SEF eFakture - Izveštaj']);
    summarySheet.addRow(['Datum:', format(new Date(), 'dd.MM.yyyy HH:mm')]);
    summarySheet.addRow([]);
    summarySheet.addRow(['STATISTIKA']);
    summarySheet.addRow(['Ukupno faktura:', summary.total || 0]);
    summarySheet.addRow(['Draft:', summary.draft || 0]);
    summarySheet.addRow(['Poslato:', summary.sent || 0]);
    summarySheet.addRow(['Prihvaćeno:', summary.accepted || 0]);
    summarySheet.addRow(['Odbijeno:', summary.rejected || 0]);
    summarySheet.addRow([]);
    summarySheet.addRow(['PRIHODI']);
    summarySheet.addRow(['Ukupan prihod:', summary.totalRevenue || 0, 'RSD']);
    summarySheet.addRow(['Na čekanju:', summary.pendingRevenue || 0, 'RSD']);

    summarySheet.getColumn(1).width = 20;
    summarySheet.getColumn(2).width = 15;

    // Sheet 2: Invoices
    const invoicesSheet = workbook.addWorksheet('Fakture');
    invoicesSheet.columns = [
      { header: 'Broj fakture', key: 'invoiceNumber', width: 15 },
      { header: 'Datum', key: 'issueDate', width: 12 },
      { header: 'Kupac', key: 'buyerName', width: 30 },
      { header: 'PIB', key: 'buyerPIB', width: 12 },
      { header: 'Iznos', key: 'totalAmount', width: 12 },
      { header: 'PDV', key: 'taxAmount', width: 12 },
      { header: 'Status', key: 'status', width: 12 },
      { header: 'SEF ID', key: 'sefId', width: 20 },
    ];

    invoicesSheet.getRow(1).font = { bold: true };
    invoicesSheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF2563EB' },
    };
    invoicesSheet.getRow(1).font = { color: { argb: 'FFFFFFFF' }, bold: true };

    invoices.forEach((inv) => {
      invoicesSheet.addRow({
        invoiceNumber: inv.invoiceNumber,
        issueDate: format(new Date(inv.issueDate), 'dd.MM.yyyy'),
        buyerName: inv.buyerName,
        buyerPIB: inv.buyerPIB,
        totalAmount: Number(inv.totalAmount),
        taxAmount: Number(inv.taxAmount),
        status: inv.status,
        sefId: inv.sefId || '',
      });
    });

    invoicesSheet.getColumn('totalAmount').numFmt = '#,##0.00';
    invoicesSheet.getColumn('taxAmount').numFmt = '#,##0.00';

    // Set response headers
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=invoice-report-${format(new Date(), 'yyyy-MM-dd')}.xlsx`
    );

    await workbook.xlsx.write(res);
    res.end();

    logger.info('Report generated successfully', { count: invoices.length });
  } catch (error: any) {
    logger.error('Failed to generate report', { error: error.message });
    throw error;
  }
}

export default {
  generateInvoicePDF,
  generateInvoicesExcel,
  generateInvoiceReport,
};

