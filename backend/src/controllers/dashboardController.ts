// @ts-nocheck - TODO: Remove after TS server restart (Prisma client needs refresh for Partner/Product relations)
import { Request, Response } from 'express';
import { prisma } from '../db/prisma';
import { logger } from '../utils/logger';
import cacheService, { CachePrefix } from '../services/cacheService';

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
   * 
   * Returns high-level KPIs with month-over-month trends
   */
  static async getOverview(req: Request, res: Response) {
    try {
      const companyId = (req as AuthRequest).user?.companyId;

      if (!companyId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      // Use cache-aside pattern (1 minute TTL)
      const cacheKey = `${companyId}:overview`;
      const overview = await cacheService.getOrSet(
        CachePrefix.DASHBOARD,
        cacheKey,
        async () => {
          // Date ranges
          const now = new Date();
          const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
          const startOfPreviousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          const endOfPreviousMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

          // Current month stats
          const [
            currentMonthInvoices,
            currentMonthAccepted,
            currentMonthRevenue,
            pendingInvoices
          ] = await Promise.all([
            // Total invoices current month
            prisma.invoice.count({
              where: {
                companyId,
                createdAt: { gte: startOfCurrentMonth },
                type: 'OUTGOING'
              }
            }),

            // Accepted invoices current month
            prisma.invoice.count({
              where: {
                companyId,
                createdAt: { gte: startOfCurrentMonth },
                status: 'ACCEPTED',
                type: 'OUTGOING'
              }
            }),

            // Total revenue current month (accepted invoices only)
            prisma.invoice.aggregate({
              where: {
                companyId,
                createdAt: { gte: startOfCurrentMonth },
                status: 'ACCEPTED',
                type: 'OUTGOING'
              },
              _sum: { totalAmount: true }
            }),

            // Pending invoices (SENT status)
            prisma.invoice.count({
              where: {
                companyId,
                status: 'SENT',
                type: 'OUTGOING'
              }
            })
          ]);

          // Previous month stats for trend calculation
          const [
            previousMonthInvoices,
            previousMonthRevenue
          ] = await Promise.all([
            prisma.invoice.count({
              where: {
                companyId,
                createdAt: { gte: startOfPreviousMonth, lte: endOfPreviousMonth },
                type: 'OUTGOING'
              }
            }),

            prisma.invoice.aggregate({
              where: {
                companyId,
                createdAt: { gte: startOfPreviousMonth, lte: endOfPreviousMonth },
                status: 'ACCEPTED',
                type: 'OUTGOING'
              },
              _sum: { totalAmount: true }
            })
          ]);

          // Calculate trends
          const invoicesTrend = previousMonthInvoices > 0
            ? (((currentMonthInvoices - previousMonthInvoices) / previousMonthInvoices) * 100).toFixed(1)
            : '0';

          const currentRevenue = currentMonthRevenue._sum.totalAmount ? Number(currentMonthRevenue._sum.totalAmount) : 0;
          const previousRevenue = previousMonthRevenue._sum.totalAmount ? Number(previousMonthRevenue._sum.totalAmount) : 0;

          const revenueTrend = previousRevenue > 0
            ? (((currentRevenue - previousRevenue) / previousRevenue) * 100).toFixed(1)
            : '0';

          // Acceptance rate
          const acceptanceRate = currentMonthInvoices > 0
            ? ((currentMonthAccepted / currentMonthInvoices) * 100).toFixed(1)
            : '0';

          return {
            totalInvoices: currentMonthInvoices,
            acceptedInvoices: currentMonthAccepted,
            pendingInvoices,
            totalRevenue: currentRevenue,
            acceptanceRate: parseFloat(acceptanceRate),
            trends: {
              invoices: {
                value: invoicesTrend,
                positive: parseFloat(invoicesTrend) >= 0
              },
              revenue: {
                value: revenueTrend,
                positive: parseFloat(revenueTrend) >= 0
              }
            }
          };
        },
        60 // Cache for 1 minute
      );

      res.setHeader('X-Cache-Key', cacheKey);
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
   * 
   * Returns data for charts:
   * - Revenue by month (last 12 months)
   * - Invoices by status (pie chart data)
   */
  static async getCharts(req: Request, res: Response) {
    try {
      const companyId = (req as AuthRequest).user?.companyId;

      if (!companyId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      // Use cache-aside pattern (5 minutes TTL)
      const cacheKey = `${companyId}:charts`;
      const charts = await cacheService.getOrSet(
        CachePrefix.DASHBOARD,
        cacheKey,
        async () => {
          const now = new Date();
          const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);

          // Revenue by month (last 12 months) - using raw query for performance
          const revenueByMonth = await prisma.$queryRaw<Array<{ month: string; revenue: number }>>`
            SELECT 
              TO_CHAR(DATE_TRUNC('month', "createdAt"), 'YYYY-MM') as month,
              COALESCE(SUM("totalAmount"), 0)::float as revenue
            FROM "Invoice"
            WHERE 
              "companyId" = ${companyId}
              AND "type" = 'OUTGOING'
              AND "status" = 'ACCEPTED'
              AND "createdAt" >= ${twelveMonthsAgo}
            GROUP BY DATE_TRUNC('month', "createdAt")
            ORDER BY month ASC
          `;

          // Fill in missing months with zero revenue
          const revenueData: { month: string; revenue: number }[] = [];
          for (let i = 11; i >= 0; i--) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            const found = revenueByMonth.find(r => r.month === monthKey);
            revenueData.push({
              month: monthKey,
              revenue: found ? found.revenue : 0
            });
          }

          // Invoices by status (for pie chart)
          const invoicesByStatus = await prisma.invoice.groupBy({
            by: ['status'],
            where: {
              companyId,
              type: 'OUTGOING'
            },
            _count: { id: true }
          });

          const statusData = invoicesByStatus.map(item => ({
            status: item.status,
            count: item._count.id
          }));

          return {
            revenueByMonth: revenueData,
            invoicesByStatus: statusData
          };
        },
        300 // Cache for 5 minutes
      );

      res.setHeader('X-Cache-Key', cacheKey);
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
   * 
   * Returns last 10 invoices with partner data included
   */
  static async getRecent(req: Request, res: Response) {
    try {
      const companyId = (req as AuthRequest).user?.companyId;
      const { limit = 10 } = req.query;

      if (!companyId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      // Use cache-aside pattern (30 seconds TTL)
      const cacheKey = `${companyId}:recent:${limit}`;
      const recent = await cacheService.getOrSet(
        CachePrefix.DASHBOARD,
        cacheKey,
        async () => {
          const recentInvoices = await prisma.invoice.findMany({
            where: { companyId },
            include: {
              partner: {
                select: {
                  id: true,
                  name: true,
                  pib: true,
                  type: true
                }
              }
            },
            orderBy: { createdAt: 'desc' },
            take: Number(limit)
          });

          // Format response with partner fallback
          const formattedInvoices = recentInvoices.map(invoice => ({
            id: invoice.id,
            invoiceNumber: invoice.invoiceNumber,
            partnerName: invoice.partner?.name || invoice.buyerName || 'N/A',
            partnerPIB: invoice.partner?.pib || invoice.buyerPIB || 'N/A',
            partnerType: invoice.partner?.type || null,
            hasPartner: !!invoice.partnerId,
            totalAmount: Number(invoice.totalAmount),
            currency: invoice.currency,
            status: invoice.status,
            type: invoice.type,
            createdAt: invoice.createdAt,
            issueDate: invoice.issueDate
          }));

          return formattedInvoices;
        },
        30 // Cache for 30 seconds
      );

      res.setHeader('X-Cache-Key', cacheKey);
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
   * 
   * Returns:
   * - Overdue invoices
   * - Low stock products
   * - Incoming invoices near decision deadline
   */
  static async getAlerts(req: Request, res: Response) {
    try {
      const companyId = (req as AuthRequest).user?.companyId;

      if (!companyId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      // Use cache-aside pattern (2 minutes TTL)
      const cacheKey = `${companyId}:alerts`;
      const alerts = await cacheService.getOrSet(
        CachePrefix.DASHBOARD,
        cacheKey,
        async () => {
          const now = new Date();
          now.setHours(0, 0, 0, 0); // Start of today

          // Calculate deadline zones
          const twoDaysFromNow = new Date(now);
          twoDaysFromNow.setDate(twoDaysFromNow.getDate() + 2);

          const fiveDaysFromNow = new Date(now);
          fiveDaysFromNow.setDate(fiveDaysFromNow.getDate() + 5);

          const sevenDaysAgo = new Date(now);
          sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

          const [
            overdueInvoices,
            lowStockProducts,
            criticalDeadlineInvoices,
            warningDeadlineInvoices,
            agingSentInvoices
          ] = await Promise.all([
            // Overdue invoices
            prisma.invoice.findMany({
              where: {
                companyId,
                type: 'OUTGOING',
                dueDate: { lt: now },
                paymentStatus: { not: 'PAID' }
              },
              include: {
                partner: {
                  select: {
                    id: true,
                    name: true,
                    pib: true
                  }
                }
              },
              orderBy: { dueDate: 'asc' },
              take: 10
            }),

            // Low stock products (currentStock < minStock using raw SQL)
            prisma.$queryRaw`
              SELECT id, name, code as sku, "currentStock", "minStock", unit
              FROM "products"
              WHERE "companyId" = ${companyId}::uuid
                AND "trackInventory" = true
                AND "currentStock" < "minStock"
              ORDER BY "currentStock" ASC
              LIMIT 10
            `,

            // Critical deadline (1-2 days)
            prisma.invoice.count({
              where: {
                companyId,
                type: 'INCOMING',
                status: 'SENT',
                createdAt: { gte: twoDaysFromNow, lt: fiveDaysFromNow }
              }
            }),

            // Warning deadline (3-5 days)
            prisma.invoice.count({
              where: {
                companyId,
                type: 'INCOMING',
                status: 'SENT',
                createdAt: { gte: fiveDaysFromNow }
              }
            }),

            // Aging sent invoices (7+ days)
            prisma.invoice.count({
              where: {
                companyId,
                type: 'OUTGOING',
                status: 'SENT',
                createdAt: { lt: sevenDaysAgo }
              }
            })
          ]);

          // Format overdue invoices
          const formattedOverdueInvoices = overdueInvoices.map(invoice => ({
            id: invoice.id,
            invoiceNumber: invoice.invoiceNumber,
            partnerName: invoice.partner?.name || invoice.buyerName || 'N/A',
            totalAmount: invoice.totalAmount.toNumber(),
            dueDate: invoice.dueDate,
            daysOverdue: invoice.dueDate ? Math.floor((now.getTime() - invoice.dueDate.getTime()) / (1000 * 60 * 60 * 24)) : 0
          }));

          return {
            overdueInvoices: {
              count: overdueInvoices.length,
              items: formattedOverdueInvoices
            },
            lowStockProducts: {
              count: lowStockProducts.length,
              items: lowStockProducts
            },
            deadlines: {
              critical: criticalDeadlineInvoices,
              warning: warningDeadlineInvoices,
              aging: agingSentInvoices
            }
          };
        },
        120 // Cache for 2 minutes
      );

      res.setHeader('X-Cache-Key', cacheKey);
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
