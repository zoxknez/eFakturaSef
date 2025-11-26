import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';
import { Response } from 'express';
import { FinancialReportsService } from './financialReportsService';

export class ReportExportService {
  
  /**
   * Export Balance Sheet to PDF
   */
  static async exportBalanceSheetPDF(
    companyId: string,
    asOfDate: Date,
    res: Response
  ): Promise<void> {
    const data = await FinancialReportsService.generateBalanceSheet(companyId, asOfDate);
    
    const doc = new PDFDocument({ margin: 50 });
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=bilans-stanja-${asOfDate.toISOString().split('T')[0]}.pdf`);
    
    doc.pipe(res);
    
    // Header
    doc.fontSize(20).text('Bilans Stanja', { align: 'center' });
    doc.fontSize(12).text(`Kompanija: ${data.companyName}`, { align: 'center' });
    doc.text(`Na dan: ${asOfDate.toLocaleDateString('sr-RS')}`, { align: 'center' });
    doc.moveDown(2);
    
    // Assets
    doc.fontSize(16).text('AKTIVA', { underline: true });
    doc.moveDown(0.5);
    
    const drawItem = (name: string, amount: number, indent: number = 0, bold: boolean = false) => {
      const y = doc.y;
      doc.fontSize(10).font(bold ? 'Helvetica-Bold' : 'Helvetica')
         .text(name, 50 + indent, y)
         .text(amount.toLocaleString('sr-RS', { minimumFractionDigits: 2 }), 400, y, { align: 'right' });
      doc.moveDown(0.5);
    };
    
    doc.fontSize(12).font('Helvetica-Bold').text('Stalna Imovina');
    data.assets.fixedAssets.forEach(item => {
      drawItem(item.name, item.amount, 20);
      item.children?.forEach(child => drawItem(child.name, child.amount, 40));
    });
    
    doc.moveDown();
    doc.fontSize(12).font('Helvetica-Bold').text('Obrtna Imovina');
    data.assets.currentAssets.forEach(item => {
      drawItem(item.name, item.amount, 20);
      item.children?.forEach(child => drawItem(child.name, child.amount, 40));
    });
    
    doc.moveDown();
    doc.fontSize(12).font('Helvetica-Bold').text('UKUPNA AKTIVA', 50, doc.y);
    doc.text(data.assets.totalAssets.toLocaleString('sr-RS', { minimumFractionDigits: 2 }), 400, doc.y, { align: 'right' });
    
    doc.addPage();
    
    // Liabilities
    doc.fontSize(16).text('PASIVA', { underline: true });
    doc.moveDown(0.5);
    
    doc.fontSize(12).font('Helvetica-Bold').text('Kapital');
    data.liabilities.equity.forEach(item => {
      drawItem(item.name, item.amount, 20);
      item.children?.forEach(child => drawItem(child.name, child.amount, 40));
    });
    
    doc.moveDown();
    doc.fontSize(12).font('Helvetica-Bold').text('Dugoročne Obaveze');
    data.liabilities.longTermLiabilities.forEach(item => {
      drawItem(item.name, item.amount, 20);
      item.children?.forEach(child => drawItem(child.name, child.amount, 40));
    });
    
    doc.moveDown();
    doc.fontSize(12).font('Helvetica-Bold').text('Kratkoročne Obaveze');
    data.liabilities.shortTermLiabilities.forEach(item => {
      drawItem(item.name, item.amount, 20);
      item.children?.forEach(child => drawItem(child.name, child.amount, 40));
    });
    
    doc.moveDown();
    doc.fontSize(12).font('Helvetica-Bold').text('UKUPNA PASIVA', 50, doc.y);
    doc.text(data.liabilities.totalLiabilities.toLocaleString('sr-RS', { minimumFractionDigits: 2 }), 400, doc.y, { align: 'right' });
    
    doc.end();
  }
  
  /**
   * Export Balance Sheet to Excel
   */
  static async exportBalanceSheetExcel(
    companyId: string,
    asOfDate: Date,
    res: Response
  ): Promise<void> {
    const data = await FinancialReportsService.generateBalanceSheet(companyId, asOfDate);
    
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Bilans Stanja');
    
    sheet.columns = [
      { header: 'Pozicija', key: 'name', width: 50 },
      { header: 'AOP', key: 'code', width: 10 },
      { header: 'Iznos', key: 'amount', width: 20 },
    ];
    
    sheet.addRow(['Bilans Stanja', '', '']);
    sheet.addRow([`Kompanija: ${data.companyName}`, '', '']);
    sheet.addRow([`Na dan: ${asOfDate.toLocaleDateString('sr-RS')}`, '', '']);
    sheet.addRow([]);
    
    const addSection = (title: string, items: any[]) => {
      sheet.addRow([title, '', '']).font = { bold: true };
      items.forEach(item => {
        sheet.addRow([item.name, item.code, item.amount]);
        if (item.children) {
          item.children.forEach((child: any) => {
            const row = sheet.addRow([`  ${child.name}`, child.code, child.amount]);
            row.getCell(1).alignment = { indent: 1 };
          });
        }
      });
      sheet.addRow([]);
    };
    
    sheet.addRow(['AKTIVA', '', '']).font = { bold: true, size: 14 };
    addSection('Stalna Imovina', data.assets.fixedAssets);
    addSection('Obrtna Imovina', data.assets.currentAssets);
    sheet.addRow(['UKUPNA AKTIVA', '', data.assets.totalAssets]).font = { bold: true };
    
    sheet.addRow([]);
    sheet.addRow(['PASIVA', '', '']).font = { bold: true, size: 14 };
    addSection('Kapital', data.liabilities.equity);
    addSection('Dugoročne Obaveze', data.liabilities.longTermLiabilities);
    addSection('Kratkoročne Obaveze', data.liabilities.shortTermLiabilities);
    sheet.addRow(['UKUPNA PASIVA', '', data.liabilities.totalLiabilities]).font = { bold: true };
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=bilans-stanja-${asOfDate.toISOString().split('T')[0]}.xlsx`);
    
    await workbook.xlsx.write(res);
    res.end();
  }

  /**
   * Export Income Statement to PDF
   */
  static async exportIncomeStatementPDF(
    companyId: string,
    fromDate: Date,
    toDate: Date,
    res: Response
  ): Promise<void> {
    const data = await FinancialReportsService.generateIncomeStatement(companyId, fromDate, toDate);
    
    const doc = new PDFDocument({ margin: 50 });
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=bilans-uspeha-${fromDate.toISOString().split('T')[0]}.pdf`);
    
    doc.pipe(res);
    
    // Header
    doc.fontSize(20).text('Bilans Uspeha', { align: 'center' });
    doc.fontSize(12).text(`Kompanija: ${data.companyName}`, { align: 'center' });
    doc.text(`Period: ${fromDate.toLocaleDateString('sr-RS')} - ${toDate.toLocaleDateString('sr-RS')}`, { align: 'center' });
    doc.moveDown(2);
    
    const drawItem = (name: string, amount: number, indent: number = 0, bold: boolean = false) => {
      const y = doc.y;
      doc.fontSize(10).font(bold ? 'Helvetica-Bold' : 'Helvetica')
         .text(name, 50 + indent, y)
         .text(amount.toLocaleString('sr-RS', { minimumFractionDigits: 2 }), 400, y, { align: 'right' });
      doc.moveDown(0.5);
    };
    
    // Revenue
    doc.fontSize(14).font('Helvetica-Bold').text('PRIHODI');
    doc.moveDown(0.5);
    
    doc.fontSize(12).text('Poslovni Prihodi');
    data.revenue.operatingRevenue.forEach(item => drawItem(item.name, item.amount, 20));
    
    doc.fontSize(12).text('Finansijski Prihodi');
    data.revenue.financialRevenue.forEach(item => drawItem(item.name, item.amount, 20));
    
    doc.fontSize(12).text('Ostali Prihodi');
    data.revenue.otherRevenue.forEach(item => drawItem(item.name, item.amount, 20));
    
    doc.moveDown();
    doc.fontSize(12).font('Helvetica-Bold').text('UKUPNI PRIHODI', 50, doc.y);
    doc.text(data.revenue.totalRevenue.toLocaleString('sr-RS', { minimumFractionDigits: 2 }), 400, doc.y, { align: 'right' });
    
    doc.moveDown();
    
    // Expenses
    doc.fontSize(14).font('Helvetica-Bold').text('RASHODI');
    doc.moveDown(0.5);
    
    doc.fontSize(12).text('Poslovni Rashodi');
    data.expenses.operatingExpenses.forEach(item => drawItem(item.name, item.amount, 20));
    
    doc.fontSize(12).text('Finansijski Rashodi');
    data.expenses.financialExpenses.forEach(item => drawItem(item.name, item.amount, 20));
    
    doc.fontSize(12).text('Ostali Rashodi');
    data.expenses.otherExpenses.forEach(item => drawItem(item.name, item.amount, 20));
    
    doc.moveDown();
    doc.fontSize(12).font('Helvetica-Bold').text('UKUPNI RASHODI', 50, doc.y);
    doc.text(data.expenses.totalExpenses.toLocaleString('sr-RS', { minimumFractionDigits: 2 }), 400, doc.y, { align: 'right' });
    
    doc.moveDown(2);
    
    // Result
    doc.fontSize(14).font('Helvetica-Bold').text('REZULTAT');
    doc.moveDown(0.5);
    
    drawItem('Bruto Dobit', data.grossProfit, 0, true);
    drawItem('Neto Dobit', data.netProfit, 0, true);
    
    doc.end();
  }

  /**
   * Export Income Statement to Excel
   */
  static async exportIncomeStatementExcel(
    companyId: string,
    fromDate: Date,
    toDate: Date,
    res: Response
  ): Promise<void> {
    const data = await FinancialReportsService.generateIncomeStatement(companyId, fromDate, toDate);
    
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Bilans Uspeha');
    
    sheet.columns = [
      { header: 'Pozicija', key: 'name', width: 50 },
      { header: 'AOP', key: 'code', width: 10 },
      { header: 'Iznos', key: 'amount', width: 20 },
    ];
    
    sheet.addRow(['Bilans Uspeha', '', '']);
    sheet.addRow([`Kompanija: ${data.companyName}`, '', '']);
    sheet.addRow([`Period: ${fromDate.toLocaleDateString('sr-RS')} - ${toDate.toLocaleDateString('sr-RS')}`, '', '']);
    sheet.addRow([]);
    
    const addSection = (title: string, items: any[]) => {
      sheet.addRow([title, '', '']).font = { bold: true };
      items.forEach(item => {
        sheet.addRow([item.name, item.code, item.amount]);
      });
      sheet.addRow([]);
    };
    
    sheet.addRow(['PRIHODI', '', '']).font = { bold: true, size: 14 };
    addSection('Poslovni Prihodi', data.revenue.operatingRevenue);
    addSection('Finansijski Prihodi', data.revenue.financialRevenue);
    addSection('Ostali Prihodi', data.revenue.otherRevenue);
    sheet.addRow(['UKUPNI PRIHODI', '', data.revenue.totalRevenue]).font = { bold: true };
    
    sheet.addRow([]);
    sheet.addRow(['RASHODI', '', '']).font = { bold: true, size: 14 };
    addSection('Poslovni Rashodi', data.expenses.operatingExpenses);
    addSection('Finansijski Rashodi', data.expenses.financialExpenses);
    addSection('Ostali Rashodi', data.expenses.otherExpenses);
    sheet.addRow(['UKUPNI RASHODI', '', data.expenses.totalExpenses]).font = { bold: true };
    
    sheet.addRow([]);
    sheet.addRow(['REZULTAT', '', '']).font = { bold: true, size: 14 };
    sheet.addRow(['Bruto Dobit', '', data.grossProfit]).font = { bold: true };
    sheet.addRow(['Neto Dobit', '', data.netProfit]).font = { bold: true };
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=bilans-uspeha-${fromDate.toISOString().split('T')[0]}.xlsx`);
    
    await workbook.xlsx.write(res);
    res.end();
  }
}
