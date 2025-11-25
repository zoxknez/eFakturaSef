import { prisma } from '../db/prisma';
import { Prisma } from '@prisma/client';
import cacheService, { CachePrefix } from './cacheService';

export interface DashboardOverview {
  totalInvoices: number;
  acceptedInvoices: number;
  pendingInvoices: number;
  totalRevenue: number;
  acceptanceRate: number;
  trends: {
    invoices: { value: string; positive: boolean };
    revenue: { value: string; positive: boolean };
  };
}

export interface DashboardCharts {
  revenueByMonth: { month: string; revenue: number }[];
  invoicesByStatus: { status: string; count: number }[];
}

export interface DashboardAlerts {
  overdueInvoices: { count: number; items: any[] };
  lowStockProducts: { count: number; items: any[] };
  deadlines: {
    critical: number;
    warning: number;
    aging: number;
  };
}

export class DashboardService {
  /**
   * Get Dashboard Overview Statistics
   */
  static async getOverview(companyId: string): Promise<DashboardOverview> {
    // Use cache-aside pattern (1 minute TTL)
    const cacheKey = `${companyId}:overview`;
    return cacheService.getOrSet(
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
  }

  /**
   * Get Dashboard Charts Data
   */
  static async getCharts(companyId: string): Promise<DashboardCharts> {
    // Use cache-aside pattern (5 minutes TTL)
    const cacheKey = `${companyId}:charts`;
    return cacheService.getOrSet(
      CachePrefix.DASHBOARD,
      cacheKey,
      async () => {
        const now = new Date();
        const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);

        // Revenue by month (last 12 months) - using raw query for performance
        const revenueByMonth = await prisma.$queryRawUnsafe<Array<{ month: string; revenue: number }>>(
          `SELECT 
            TO_CHAR(DATE_TRUNC('month', "createdAt"), 'YYYY-MM') as month,
            COALESCE(SUM("totalAmount"), 0)::float as revenue
          FROM "Invoice"
          WHERE 
            "companyId" = $1::uuid
            AND "type" = 'OUTGOING'
            AND "status" = 'ACCEPTED'
            AND "createdAt" >= $2
          GROUP BY DATE_TRUNC('month', "createdAt")
          ORDER BY month ASC`,
          companyId,
          twelveMonthsAgo
        );

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
  }

  /**
   * Get Recent Invoices
   */
  static async getRecent(companyId: string, limit: number = 10) {
    // Use cache-aside pattern (30 seconds TTL)
    const cacheKey = `${companyId}:recent:${limit}`;
    return cacheService.getOrSet(
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
          take: limit
        });

        // Format response with partner fallback
        return recentInvoices.map(invoice => ({
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
      },
      30 // Cache for 30 seconds
    );
  }

  /**
   * Get Dashboard Alerts
   */
  static async getAlerts(companyId: string): Promise<DashboardAlerts> {
    // Use cache-aside pattern (2 minutes TTL)
    const cacheKey = `${companyId}:alerts`;
    return cacheService.getOrSet(
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

          // Low stock products - get tracked products and filter in JS
          prisma.product.findMany({
            where: {
              companyId,
              trackInventory: true,
            },
            select: {
              id: true,
              name: true,
              code: true,
              currentStock: true,
              minStock: true,
              unit: true,
            },
            orderBy: { currentStock: 'asc' },
            take: 100 // Get more to filter
          }).then(products => 
            products
              .filter(p => p.currentStock !== null && p.minStock !== null && Number(p.currentStock) < Number(p.minStock))
              .slice(0, 10)
              .map(p => ({
                id: p.id,
                name: p.name,
                sku: p.code,
                currentStock: Number(p.currentStock),
                minStock: Number(p.minStock),
                unit: p.unit
              }))
          ),

          // Critical deadline (1-2 days) - invoices due within 2 days
          prisma.invoice.count({
            where: {
              companyId,
              type: 'INCOMING',
              status: 'SENT',
              dueDate: { gte: now, lte: twoDaysFromNow }
            }
          }),

          // Warning deadline (3-5 days) - invoices due within 3-5 days
          prisma.invoice.count({
            where: {
              companyId,
              type: 'INCOMING',
              status: 'SENT',
              dueDate: { gt: twoDaysFromNow, lte: fiveDaysFromNow }
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
          totalAmount: Number(invoice.totalAmount),
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
  }
}
