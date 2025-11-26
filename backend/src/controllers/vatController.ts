/**
 * VAT Controller
 * Handles VAT/PDV recording and reporting
 */

import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { VATService } from '../services/vatService';
import { handleControllerError } from '../utils/errorHandler';
import { VATRecordType } from '@prisma/client';

export class VATController {
  /**
   * Parse date parameters - supports both year/month and fromDate/toDate
   */
  private static parseDateParams(query: Record<string, any>): { year: number; month: number } | null {
    const { year, month, fromDate, toDate } = query;
    
    // If year and month provided directly
    if (year && month) {
      return { year: parseInt(year), month: parseInt(month) };
    }
    
    // If fromDate provided, extract year and month from it
    if (fromDate) {
      const date = new Date(fromDate);
      if (!isNaN(date.getTime())) {
        return { year: date.getFullYear(), month: date.getMonth() + 1 };
      }
    }
    
    // Default to current month
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1 };
  }

  /**
   * Get VAT summary for period
   * GET /api/vat/summary
   */
  static async getSummary(req: Request, res: Response) {
    try {
      const authReq = req as AuthenticatedRequest;
      const companyId = authReq.user?.companyId;

      if (!companyId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      const dateParams = VATController.parseDateParams(req.query);
      
      if (!dateParams) {
        return res.status(400).json({
          success: false,
          error: 'Invalid date parameters',
        });
      }

      const summary = await VATService.getVATSummary(
        companyId,
        dateParams.year,
        dateParams.month
      );

      return res.json({ success: true, data: summary });
    } catch (error) {
      return handleControllerError('GetVATSummary', error, res);
    }
  }

  /**
   * Generate PP-PDV form data
   * GET /api/vat/pppdv
   */
  static async generatePPPDV(req: Request, res: Response) {
    try {
      const authReq = req as AuthenticatedRequest;
      const companyId = authReq.user?.companyId;

      if (!companyId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      const dateParams = VATController.parseDateParams(req.query);

      if (!dateParams) {
        return res.status(400).json({
          success: false,
          error: 'Invalid date parameters',
        });
      }

      const pppdv = await VATService.generatePPPDV(
        companyId,
        dateParams.year,
        dateParams.month
      );

      return res.json({ success: true, data: pppdv });
    } catch (error) {
      return handleControllerError('GeneratePPPDV', error, res);
    }
  }

  /**
   * Get VAT records list
   * GET /api/vat/records
   */
  static async getRecords(req: Request, res: Response) {
    try {
      const authReq = req as AuthenticatedRequest;
      const companyId = authReq.user?.companyId;

      if (!companyId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      const { type, page, limit } = req.query;
      const dateParams = VATController.parseDateParams(req.query);

      const records = await VATService.getVATRecords(companyId, {
        year: dateParams?.year,
        month: dateParams?.month,
        type: type as VATRecordType,
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
      });

      return res.json({ success: true, ...records });
    } catch (error) {
      return handleControllerError('GetVATRecords', error, res);
    }
  }

  /**
   * Export KPO (Knjiga Primljenih Računa - Purchase Book)
   * GET /api/vat/export/kpo
   */
  static async exportKPO(req: Request, res: Response) {
    try {
      const authReq = req as AuthenticatedRequest;
      const companyId = authReq.user?.companyId;

      if (!companyId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      const { format } = req.query;
      const dateParams = VATController.parseDateParams(req.query);

      if (!dateParams) {
        return res.status(400).json({
          success: false,
          error: 'Invalid date parameters',
        });
      }

      const kpoData = await VATService.exportKPO(
        companyId,
        dateParams.year,
        dateParams.month
      );

      // Return based on format
      if (format === 'csv') {
        const csvContent = VATController.convertKPOToCSV(kpoData);
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="KPO_${dateParams.year}_${dateParams.month}.csv"`);
        return res.send('\ufeff' + csvContent); // BOM for Excel UTF-8
      }

      return res.json({ success: true, data: kpoData });
    } catch (error) {
      return handleControllerError('ExportKPO', error, res);
    }
  }

  /**
   * Export KPR (Knjiga Izdatih Računa - Sales Book)
   * GET /api/vat/export/kpr
   */
  static async exportKPR(req: Request, res: Response) {
    try {
      const authReq = req as AuthenticatedRequest;
      const companyId = authReq.user?.companyId;

      if (!companyId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      const { format } = req.query;
      const dateParams = VATController.parseDateParams(req.query);

      if (!dateParams) {
        return res.status(400).json({
          success: false,
          error: 'Invalid date parameters',
        });
      }

      const kprData = await VATService.exportKPR(
        companyId,
        dateParams.year,
        dateParams.month
      );

      // Return based on format
      if (format === 'csv') {
        const csvContent = VATController.convertKPRToCSV(kprData);
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="KPR_${dateParams.year}_${dateParams.month}.csv"`);
        return res.send('\ufeff' + csvContent); // BOM for Excel UTF-8
      }

      return res.json({ success: true, data: kprData });
    } catch (error) {
      return handleControllerError('ExportKPR', error, res);
    }
  }

  /**
   * Calculate VAT from invoice
   * POST /api/vat/calculate
   */
  static async calculateFromInvoice(req: Request, res: Response) {
    try {
      const authReq = req as AuthenticatedRequest;
      const companyId = authReq.user?.companyId;

      if (!companyId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      const { invoiceId } = req.body;

      if (!invoiceId) {
        return res.status(400).json({
          success: false,
          error: 'invoiceId is required',
        });
      }

      await VATService.createVATRecordFromInvoice(invoiceId, companyId);
      return res.status(201).json({ success: true, message: 'VAT record created' });
    } catch (error) {
      return handleControllerError('CalculateVATFromInvoice', error, res);
    }
  }

  /**
   * Recalculate VAT records for a period
   * POST /api/vat/recalculate
   */
  static async recalculateVATRecords(req: Request, res: Response) {
    try {
      const authReq = req as AuthenticatedRequest;
      const companyId = authReq.user?.companyId;

      if (!companyId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      const { year, month } = req.body;

      if (!year || !month) {
        return res.status(400).json({
          success: false,
          error: 'year and month are required',
        });
      }

      const result = await VATService.recalculateVATRecords(companyId, year, month);
      return res.json({ success: true, data: result });
    } catch (error) {
      return handleControllerError('RecalculateVATRecords', error, res);
    }
  }

  /**
   * Get quarterly VAT report
   * GET /api/vat/quarterly
   */
  static async getQuarterlyReport(req: Request, res: Response) {
    try {
      const authReq = req as AuthenticatedRequest;
      const companyId = authReq.user?.companyId;

      if (!companyId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      const { year, quarter } = req.query;

      if (!year || !quarter) {
        return res.status(400).json({
          success: false,
          error: 'year and quarter query parameters are required',
        });
      }

      const yearNum = parseInt(year as string);
      const quarterNum = parseInt(quarter as string);

      if (quarterNum < 1 || quarterNum > 4) {
        return res.status(400).json({
          success: false,
          error: 'quarter must be between 1 and 4',
        });
      }

      // Get quarterly data by aggregating months
      const startMonth = (quarterNum - 1) * 3 + 1;
      const months = [startMonth, startMonth + 1, startMonth + 2];
      
      const summaries = await Promise.all(
        months.map(m => VATService.getVATSummary(companyId, yearNum, m))
      );

      // Aggregate quarterly data
      const quarterSummary = {
        output: {
          taxBase20: summaries.reduce((s, m) => s + m.output.taxBase20, 0),
          vatAmount20: summaries.reduce((s, m) => s + m.output.vatAmount20, 0),
          taxBase10: summaries.reduce((s, m) => s + m.output.taxBase10, 0),
          vatAmount10: summaries.reduce((s, m) => s + m.output.vatAmount10, 0),
          exemptAmount: summaries.reduce((s, m) => s + m.output.exemptAmount, 0),
          totalBase: summaries.reduce((s, m) => s + m.output.totalBase, 0),
          totalVAT: summaries.reduce((s, m) => s + m.output.totalVAT, 0),
        },
        input: {
          taxBase20: summaries.reduce((s, m) => s + m.input.taxBase20, 0),
          vatAmount20: summaries.reduce((s, m) => s + m.input.vatAmount20, 0),
          taxBase10: summaries.reduce((s, m) => s + m.input.taxBase10, 0),
          vatAmount10: summaries.reduce((s, m) => s + m.input.vatAmount10, 0),
          exemptAmount: summaries.reduce((s, m) => s + m.input.exemptAmount, 0),
          totalBase: summaries.reduce((s, m) => s + m.input.totalBase, 0),
          totalVAT: summaries.reduce((s, m) => s + m.input.totalVAT, 0),
        },
        balance: summaries.reduce((s, m) => s + m.balance, 0),
      };

      return res.json({
        success: true,
        data: {
          period: {
            year: yearNum,
            quarter: quarterNum,
            months,
          },
          summary: quarterSummary,
          monthlySummaries: summaries,
        },
      });
    } catch (error) {
      return handleControllerError('GetQuarterlyReport', error, res);
    }
  }

  /**
   * Get annual VAT summary
   * GET /api/vat/annual
   */
  static async getAnnualSummary(req: Request, res: Response) {
    try {
      const authReq = req as AuthenticatedRequest;
      const companyId = authReq.user?.companyId;

      if (!companyId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      const { year } = req.query;
      const targetYear = year ? parseInt(year as string) : new Date().getFullYear();

      const annualSummary = await VATService.getAnnualVATSummary(companyId, targetYear);

      return res.json({
        success: true,
        data: annualSummary,
      });
    } catch (error) {
      return handleControllerError('GetAnnualSummary', error, res);
    }
  }

  // ========================================
  // HELPER METHODS
  // ========================================

  private static convertKPOToCSV(kpoData: Awaited<ReturnType<typeof VATService.exportKPO>>): string {
    const headers = [
      'R.br.',
      'Datum',
      'Broj fakture',
      'Dobavljač',
      'PIB dobavljača',
      'Osnovica 20%',
      'PDV 20%',
      'Osnovica 10%',
      'PDV 10%',
      'Oslobođeno',
      'Ukupno',
    ];

    // Calculate totals
    const totals = kpoData.reduce(
      (acc, record) => ({
        osnovica20: acc.osnovica20 + Number(record.osnovica20),
        pdv20: acc.pdv20 + Number(record.pdv20),
        osnovica10: acc.osnovica10 + Number(record.osnovica10),
        pdv10: acc.pdv10 + Number(record.pdv10),
        oslobodeno: acc.oslobodeno + Number(record.oslobodeno),
        ukupno: acc.ukupno + Number(record.ukupno),
      }),
      { osnovica20: 0, pdv20: 0, osnovica10: 0, pdv10: 0, oslobodeno: 0, ukupno: 0 }
    );

    const rows: (string | number)[][] = kpoData.map((record) => [
      record.redBr,
      new Date(record.datumRacuna).toLocaleDateString('sr-RS'),
      record.brojRacuna,
      record.nazivDobavljaca,
      record.pibDobavljaca,
      Number(record.osnovica20).toFixed(2),
      Number(record.pdv20).toFixed(2),
      Number(record.osnovica10).toFixed(2),
      Number(record.pdv10).toFixed(2),
      Number(record.oslobodeno).toFixed(2),
      Number(record.ukupno).toFixed(2),
    ]);

    // Add totals row
    rows.push([
      '',
      '',
      '',
      'UKUPNO:',
      '',
      totals.osnovica20.toFixed(2),
      totals.pdv20.toFixed(2),
      totals.osnovica10.toFixed(2),
      totals.pdv10.toFixed(2),
      totals.oslobodeno.toFixed(2),
      totals.ukupno.toFixed(2),
    ]);

    return [headers.join(';'), ...rows.map((r: (string | number)[]) => r.join(';'))].join('\n');
  }

  private static convertKPRToCSV(kprData: Awaited<ReturnType<typeof VATService.exportKPR>>): string {
    const headers = [
      'R.br.',
      'Datum',
      'Broj fakture',
      'Kupac',
      'PIB kupca',
      'Osnovica 20%',
      'PDV 20%',
      'Osnovica 10%',
      'PDV 10%',
      'Oslobođeno',
      'Ukupno',
    ];

    // Calculate totals
    const totals = kprData.reduce(
      (acc, record) => ({
        osnovica20: acc.osnovica20 + Number(record.osnovica20),
        pdv20: acc.pdv20 + Number(record.pdv20),
        osnovica10: acc.osnovica10 + Number(record.osnovica10),
        pdv10: acc.pdv10 + Number(record.pdv10),
        oslobodeno: acc.oslobodeno + Number(record.oslobodeno),
        ukupno: acc.ukupno + Number(record.ukupno),
      }),
      { osnovica20: 0, pdv20: 0, osnovica10: 0, pdv10: 0, oslobodeno: 0, ukupno: 0 }
    );

    const rows: (string | number)[][] = kprData.map((record) => [
      record.redBr,
      new Date(record.datumRacuna).toLocaleDateString('sr-RS'),
      record.brojRacuna,
      record.nazivKupca,
      record.pibKupca,
      Number(record.osnovica20).toFixed(2),
      Number(record.pdv20).toFixed(2),
      Number(record.osnovica10).toFixed(2),
      Number(record.pdv10).toFixed(2),
      Number(record.oslobodeno).toFixed(2),
      Number(record.ukupno).toFixed(2),
    ]);

    // Add totals row
    rows.push([
      '',
      '',
      '',
      'UKUPNO:',
      '',
      totals.osnovica20.toFixed(2),
      totals.pdv20.toFixed(2),
      totals.osnovica10.toFixed(2),
      totals.pdv10.toFixed(2),
      totals.oslobodeno.toFixed(2),
      totals.ukupno.toFixed(2),
    ]);

    return [headers.join(';'), ...rows.map((r: (string | number)[]) => r.join(';'))].join('\n');
  }

  /**
   * Get PP-PDV data for frontend form
   * GET /api/vat/pppdv-data
   */
  static async getPPPDVData(req: Request, res: Response) {
    try {
      const authReq = req as AuthenticatedRequest;
      const companyId = authReq.user?.companyId;

      if (!companyId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      const { fromDate, toDate, isQuarterly } = req.query;

      if (!fromDate || !toDate) {
        return res.status(400).json({
          success: false,
          error: 'fromDate and toDate are required',
        });
      }

      const from = new Date(fromDate as string);
      const to = new Date(toDate as string);

      // Get VAT records for the period
      const records = await VATService.getVATRecordsForPeriod(companyId, from, to);

      // Calculate PP-PDV fields
      const outputRecords = records.filter(r => r.type === 'OUTPUT');
      const inputRecords = records.filter(r => r.type === 'INPUT');

      // Calculate by VAT rate
      const output20Base = outputRecords.reduce((sum, r) => sum + Number(r.taxBase20), 0);
      const output20VAT = outputRecords.reduce((sum, r) => sum + Number(r.vatAmount20), 0);
      const output10Base = outputRecords.reduce((sum, r) => sum + Number(r.taxBase10), 0);
      const output10VAT = outputRecords.reduce((sum, r) => sum + Number(r.vatAmount10), 0);

      const input20Base = inputRecords.reduce((sum, r) => sum + Number(r.taxBase20), 0);
      const input20VAT = inputRecords.reduce((sum, r) => sum + Number(r.vatAmount20), 0);
      const input10Base = inputRecords.reduce((sum, r) => sum + Number(r.taxBase10), 0);
      const input10VAT = inputRecords.reduce((sum, r) => sum + Number(r.vatAmount10), 0);

      // Exports (0% VAT with export flag)
      const exports = outputRecords.reduce((sum, r) => sum + Number(r.exemptAmount), 0);

      const totalOutputVAT = output20VAT + output10VAT;
      const totalInputVAT = input20VAT + input10VAT;

      return res.json({
        success: true,
        data: {
          fields: {
            '001': output20Base,
            '002': output20VAT,
            '003': output10Base,
            '004': output10VAT,
            '101': input20Base,
            '102': input20VAT,
            '103': input10Base,
            '104': input10VAT,
            '301': exports,
          },
          totalInputVAT,
          totalOutputVAT,
          balance: totalOutputVAT - totalInputVAT,
        },
      });
    } catch (error) {
      return handleControllerError('GetPPPDVData', error, res);
    }
  }

  /**
   * Export PP-PDV as PDF
   * GET /api/vat/pppdv/pdf
   */
  static async exportPPPDVPDF(req: Request, res: Response) {
    try {
      const authReq = req as AuthenticatedRequest;
      const companyId = authReq.user?.companyId;

      if (!companyId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      const dateParams = VATController.parseDateParams(req.query);

      if (!dateParams) {
        return res.status(400).json({
          success: false,
          error: 'Invalid date parameters',
        });
      }

      // Import PDF service dynamically to avoid circular dependencies
      const { pdfService } = await import('../services/pdfService');

      // Get PP-PDV data
      const pppdv = await VATService.generatePPPDV(
        companyId,
        dateParams.year,
        dateParams.month
      );

      // Get company info
      const { prisma } = await import('../db/prisma');
      const company = await prisma.company.findUnique({
        where: { id: companyId },
      });

      if (!company) {
        return res.status(404).json({ success: false, error: 'Company not found' });
      }

      // Generate PDF
      const pdfBuffer = await pdfService.generatePPPDVPDF({
        period: {
          year: dateParams.year,
          month: dateParams.month,
        },
        taxpayer: {
          pib: company.pib,
          name: company.name,
          address: company.address,
          municipality: company.city,
        },
        fields: [
          { code: '101', label: 'Promet dobara i usluga (20%) - Osnovica', value: pppdv.section1?.line101 || 0 },
          { code: '102', label: 'Promet dobara i usluga (10%) - Osnovica', value: pppdv.section1?.line102 || 0 },
          { code: '103', label: 'Promet oslobođen PDV-a', value: pppdv.section1?.line103 || 0 },
          { code: '104', label: 'Ukupna osnovica', value: pppdv.section1?.line104 || 0 },
          { code: '201', label: 'PDV po stopi od 20%', value: pppdv.section2?.line201 || 0 },
          { code: '202', label: 'PDV po stopi od 10%', value: pppdv.section2?.line202 || 0 },
          { code: '203', label: 'Ukupan izlazni PDV', value: pppdv.section2?.line203 || 0 },
          { code: '301', label: 'Prethodni PDV (20%)', value: pppdv.section3?.line301 || 0 },
          { code: '302', label: 'Prethodni PDV (10%)', value: pppdv.section3?.line302 || 0 },
          { code: '303', label: 'Ukupan prethodni PDV', value: pppdv.section3?.line303 || 0 },
          { code: '401', label: 'PDV za uplatu', value: pppdv.section4?.line401 || 0 },
          { code: '402', label: 'PDV za povrat', value: pppdv.section4?.line402 || 0 },
        ],
        totalInputVAT: pppdv.section3?.line303 || 0,
        totalOutputVAT: pppdv.section2?.line203 || 0,
        balance: (pppdv.section4?.line401 || 0) - (pppdv.section4?.line402 || 0),
      });

      // Send PDF response
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="PPPDV_${dateParams.year}_${dateParams.month}.pdf"`);
      return res.send(pdfBuffer);
    } catch (error) {
      return handleControllerError('ExportPPPDVPDF', error, res);
    }
  }

  /**
   * Get PP-PDV field label by code
   */
  private static getPPPDVFieldLabel(code: string): string {
    const labels: Record<string, string> = {
      '001': 'Promet dobara i usluga po opštoj stopi (20%) - Osnovica',
      '002': 'PDV po opštoj stopi (20%)',
      '003': 'Promet dobara i usluga po posebnoj stopi (10%) - Osnovica',
      '004': 'PDV po posebnoj stopi (10%)',
      '005': 'Promet bez naknade - Osnovica',
      '006': 'PDV za promet bez naknade',
      '007': 'Avansne uplate - Osnovica',
      '008': 'PDV na avansne uplate',
      '009': 'Ukupan izlazni PDV',
      '101': 'Nabavka dobara i usluga (20%) - Osnovica',
      '102': 'Prethodni PDV po opštoj stopi (20%)',
      '103': 'Nabavka dobara i usluga (10%) - Osnovica',
      '104': 'Prethodni PDV po posebnoj stopi (10%)',
      '105': 'PDV plaćen pri uvozu',
      '106': 'Korekcija pretporeza',
      '107': 'Srazmerni odbitak prethodnog PDV (%)',
      '108': 'Ukupan prethodni PDV',
      '201': 'PDV za uplatu',
      '202': 'PDV za povrat',
      '203': 'PDV kredit prenesen iz prethodnog perioda',
      '204': 'PDV kredit za prenos u naredni period',
      '301': 'Izvoz dobara',
      '302': 'Promet oslobođen bez prava na odbitak',
      '303': 'Promet u slobodnoj zoni',
    };
    return labels[code] || code;
  }
}

export default VATController;
