import { Request, Response } from 'express';
import { logger } from '../utils/logger';
import { DashboardService } from '../services/dashboardService';

interface AuthRequest extends Request {
  user?: {
    id: string;
    companyId: string;
  };
}

export class DashboardController {
  /**
   * Dashboard Overview Statistics
   * GET /api/dashboard/overview
   */
  static async getOverview(req: Request, res: Response) {
    try {
      const companyId = (req as AuthRequest).user?.companyId;

      if (!companyId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      const overview = await DashboardService.getOverview(companyId);
      return res.json({ success: true, data: overview });
    } catch (error: any) {
      logger.error('[Dashboard Overview Error]', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch dashboard overview'
      });
    }
  }

  /**
   * Dashboard Charts Data
   * GET /api/dashboard/charts
   */
  static async getCharts(req: Request, res: Response) {
    try {
      const companyId = (req as AuthRequest).user?.companyId;

      if (!companyId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      const charts = await DashboardService.getCharts(companyId);
      return res.json({ success: true, data: charts });
    } catch (error: any) {
      logger.error('[Dashboard Charts Error]', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch dashboard charts data'
      });
    }
  }

  /**
   * Recent Invoices
   * GET /api/dashboard/recent
   */
  static async getRecent(req: Request, res: Response) {
    try {
      const companyId = (req as AuthRequest).user?.companyId;
      const { limit = 10 } = req.query;

      if (!companyId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      const recent = await DashboardService.getRecent(companyId, Number(limit));
      return res.json({ success: true, data: recent });
    } catch (error: any) {
      logger.error('[Recent Invoices Error]', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch recent invoices'
      });
    }
  }

  /**
   * Dashboard Alerts
   * GET /api/dashboard/alerts
   */
  static async getAlerts(req: Request, res: Response) {
    try {
      const companyId = (req as AuthRequest).user?.companyId;

      if (!companyId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      const alerts = await DashboardService.getAlerts(companyId);
      return res.json({ success: true, data: alerts });
    } catch (error: any) {
      logger.error('[Dashboard Alerts Error]', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch dashboard alerts'
      });
    }
  }

  /**
   * LEGACY: Get dashboard stats (kept for backward compatibility)
   * @deprecated Use getOverview instead
   */
  static async getStats(req: Request, res: Response) {
    return DashboardController.getOverview(req, res);
  }

  /**
   * LEGACY: Get recent activity (kept for backward compatibility)
   * @deprecated Use getRecent instead
   */
  static async getRecentActivity(req: Request, res: Response) {
    return DashboardController.getRecent(req, res);
  }
}
