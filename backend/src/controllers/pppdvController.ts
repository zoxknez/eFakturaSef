/**
 * PPPDV Controller
 * PDV prijava endpoints
 */

import { Response, NextFunction } from 'express';
import PPPDVService from '../services/pppdvService';
import logger from '../utils/logger';
import { AuthenticatedRequest } from '../middleware/auth';

export class PPPDVController {
  /**
   * Get all PPPDV reports
   */
  static async getReports(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const companyId = req.user!.companyId;
      const { year } = req.query;

      const reports = await PPPDVService.getPPPDVReportsForYear(
        companyId,
        year ? parseInt(year as string) : new Date().getFullYear()
      );

      res.json({ success: true, data: reports });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get report by ID
   */
  static async getReportById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const report = await PPPDVService.getPPPDVReportById(id);

      if (!report) {
        return res.status(404).json({
          success: false,
          error: 'Report not found',
        });
      }

      res.json({ success: true, data: report });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Calculate PPPDV for a period
   */
  static async calculate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const companyId = req.user!.companyId;
      const { year, month, periodType } = req.query;

      if (!year || !month) {
        return res.status(400).json({
          success: false,
          error: 'Year and month are required',
        });
      }

      const data = await PPPDVService.calculatePPPDV(
        companyId,
        parseInt(year as string),
        parseInt(month as string),
        (periodType as 'MONTHLY' | 'QUARTERLY') || 'MONTHLY'
      );

      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Save PPPDV report
   */
  static async save(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const companyId = req.user!.companyId;
      const { year, month, periodType } = req.body;

      if (!year || !month) {
        return res.status(400).json({
          success: false,
          error: 'Year and month are required',
        });
      }

      const report = await PPPDVService.savePPPDVReport(
        companyId,
        year,
        month,
        periodType || 'MONTHLY'
      );

      res.json({ success: true, data: report });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get PPPDV report
   */
  static async get(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const companyId = req.user!.companyId;
      const { year, month } = req.params;

      const report = await PPPDVService.getPPPDVReport(
        companyId,
        parseInt(year),
        parseInt(month)
      );

      if (!report) {
        return res.status(404).json({
          success: false,
          error: 'Report not found',
        });
      }

      res.json({ success: true, data: report });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all reports for a year
   */
  static async getForYear(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const companyId = req.user!.companyId;
      const { year } = req.params;

      const reports = await PPPDVService.getPPPDVReportsForYear(
        companyId,
        parseInt(year)
      );

      res.json({ success: true, data: reports });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Mark as submitted
   */
  static async submit(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const report = await PPPDVService.markAsSubmitted(id);

      res.json({ success: true, data: report });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Generate XML for ePorezi
   */
  static async generateXml(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const xml = await PPPDVService.generateXML(id);

      res.setHeader('Content-Type', 'application/xml');
      res.setHeader('Content-Disposition', `attachment; filename="pppdv-${id}.xml"`);
      res.send(xml);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete draft report
   */
  static async delete(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      await PPPDVService.deleteDraftReport(id);

      res.json({ success: true, message: 'Report deleted' });
    } catch (error) {
      next(error);
    }
  }
}

export default PPPDVController;
