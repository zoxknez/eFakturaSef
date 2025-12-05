import { prisma } from '../db/prisma';
import { Prisma } from '@prisma/client';
import cacheService, { CachePrefix } from './cacheService';
import type { 
  DashboardOverview, 
  DashboardCharts, 
  DashboardAlerts,
  DashboardInvoice 
} from '@sef-app/shared';

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
        const invoicesTrendValue = previousMonthInvoices > 0
          ? ((currentMonthInvoices - previousMonthInvoices) / previousMonthInvoices) * 100
          : 0;

        const currentRevenue = currentMonthRevenue._sum.totalAmount ? Number(currentMonthRevenue._sum.totalAmount) : 0;
        const previousRevenue = previousMonthRevenue._sum.totalAmount ? Number(previousMonthRevenue._sum.totalAmount) : 0;

        const revenueTrendValue = previousRevenue > 0
          ? ((currentRevenue - previousRevenue) / previousRevenue) * 100
          : 0;

        // Acceptance rate
        const acceptanceRate = currentMonthInvoices > 0
          ? (currentMonthAccepted / currentMonthInvoices) * 100
          : 0;

        // Get rejected count
        const rejectedInvoices = await prisma.invoice.count({
          where: {
            companyId,
            createdAt: { gte: startOfCurrentMonth },
            status: 'REJECTED',
            type: 'OUTGOING'
          }
        });

        return {
          totalInvoices: currentMonthInvoices,
          acceptedInvoices: currentMonthAccepted,
          pendingInvoices,
          rejectedInvoices,
          totalRevenue: currentRevenue,
          acceptanceRate: Math.round(acceptanceRate * 10) / 10,
          trends: {
            invoices: {
              value: Math.round(invoicesTrendValue * 10) / 10,
              positive: invoicesTrendValue >= 0
            },
            revenue: {
              value: Math.round(revenueTrendValue * 10) / 10,
              positive: revenueTrendValue >= 0
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

        // Revenue by month (last 12 months) - using Prisma query builder for safety
        const revenueByMonth = await prisma.$queryRaw<Array<{ month: string; revenue: number }>>(
          Prisma.sql`
            SELECT 
              TO_CHAR(DATE_TRUNC('month', "created_at"), 'YYYY-MM') as month,
              COALESCE(SUM("total_amount"), 0)::float as revenue
            FROM "invoices"
            WHERE 
              "company_id" = ${companyId}::uuid
              AND "type" = 'OUTGOING'
              AND "status" = 'ACCEPTED'
              AND "created_at" >= ${twelveMonthsAgo}
            GROUP BY DATE_TRUNC('month', "created_at")
            ORDER BY month ASC
          `
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

        // Status color mapping
        const statusColors: Record<string, string> = {
          'DRAFT': '#9CA3AF',      // gray-400
          'SENT': '#3B82F6',       // blue-500
          'DELIVERED': '#8B5CF6',  // violet-500
          'ACCEPTED': '#10B981',   // emerald-500
          'REJECTED': '#EF4444',   // red-500
          'CANCELLED': '#F59E0B',  // amber-500
          'STORNO': '#6B7280',     // gray-500
          'EXPIRED': '#DC2626'     // red-600
        };

        const statusData = invoicesByStatus.map(item => ({
          status: item.status,
          count: item._count.id,
          color: statusColors[item.status] || '#9CA3AF'
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
  static async getRecent(companyId: string, limit: number = 10): Promise<DashboardInvoice[]> {
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
          hasPartner: !!invoice.partnerId,
          totalAmount: Number(invoice.totalAmount),
          currency: invoice.currency,
          status: invoice.status,
          type: invoice.type as 'OUTGOING' | 'INCOMING',
          createdAt: invoice.createdAt.toISOString(),
          issueDate: invoice.issueDate.toISOString()
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

          // Low stock products - optimized query with filter in database where possible
          prisma.product.findMany({
            where: {
              companyId,
              trackInventory: true,
              isActive: true,
              // Filter in database: currentStock < minStock
              // Note: Prisma doesn't support direct comparison of Decimal fields,
              // so we still need JS filtering, but we limit results first
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
            take: 50 // Reduced from 100 - get fewer products to filter
          }).then(products => 
            products
              .filter(p => {
                if (!p.currentStock || !p.minStock) return false;
                const current = Number(p.currentStock);
                const min = Number(p.minStock);
                return current < min;
              })
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
          dueDate: invoice.dueDate?.toISOString() || '',
          daysOverdue: invoice.dueDate ? Math.floor((now.getTime() - invoice.dueDate.getTime()) / (1000 * 60 * 60 * 24)) : 0
        }));

        // Calculate total overdue amount
        const totalOverdueAmount = overdueInvoices.reduce(
          (sum, inv) => sum + Number(inv.totalAmount), 
          0
        );

        return {
          overdueInvoices: {
            count: overdueInvoices.length,
            totalAmount: totalOverdueAmount,
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
