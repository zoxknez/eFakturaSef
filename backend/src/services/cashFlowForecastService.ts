/**
 * Cash Flow Forecast Service
 * Prognoza novčanog toka
 */

import { prisma } from '../db/prisma';
import { Decimal } from '@prisma/client/runtime/library';
import logger from '../utils/logger';

interface DailyForecast {
  date: Date;
  expectedInflow: number;
  expectedOutflow: number;
  expectedBalance: number;
  actualInflow: number;
  actualOutflow: number;
  actualBalance: number;
  details: {
    inflows: Array<{ type: string; amount: number; description: string }>;
    outflows: Array<{ type: string; amount: number; description: string }>;
  };
}

export class CashFlowForecastService {
  /**
   * Generate cash flow forecast for a period
   */
  static async generateForecast(
    companyId: string,
    fromDate: Date,
    toDate: Date,
    openingBalance: number = 0
  ): Promise<DailyForecast[]> {
    const forecasts: DailyForecast[] = [];
    let runningBalance = openingBalance;

    // Get all dates in range
    const dates: Date[] = [];
    const currentDate = new Date(fromDate);
    while (currentDate <= toDate) {
      dates.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Get expected inflows (unpaid outgoing invoices by due date)
    const expectedInflows = await prisma.invoice.findMany({
      where: {
        companyId,
        type: 'OUTGOING',
        paymentStatus: { in: ['UNPAID', 'PARTIALLY_PAID', 'OVERDUE'] },
        dueDate: { gte: fromDate, lte: toDate },
      },
      select: {
        id: true,
        invoiceNumber: true,
        buyerName: true,
        dueDate: true,
        totalAmount: true,
        paidAmount: true,
      },
    });

    // Get expected outflows (unpaid incoming invoices by due date)
    const expectedOutflows = await prisma.incomingInvoice.findMany({
      where: {
        companyId,
        paymentStatus: { in: ['UNPAID', 'PARTIALLY_PAID'] },
        dueDate: { gte: fromDate, lte: toDate },
      },
      select: {
        id: true,
        invoiceNumber: true,
        supplierName: true,
        dueDate: true,
        totalAmount: true,
        paidAmount: true,
      },
    });

    // Get actual payments received
    const actualPaymentsReceived = await prisma.payment.findMany({
      where: {
        invoice: { companyId, type: 'OUTGOING' },
        paymentDate: { gte: fromDate, lte: toDate },
        status: 'CLEARED',
      },
      include: {
        invoice: {
          select: { invoiceNumber: true, buyerName: true },
        },
      },
    });

    // Get recurring invoices
    const recurringInvoices = await prisma.recurringInvoice.findMany({
      where: {
        companyId,
        status: 'ACTIVE',
        nextRunAt: { gte: fromDate, lte: toDate },
      },
      include: {
        partner: true,
      },
    });

    // Process each date
    for (const date of dates) {
      const dateStr = date.toISOString().split('T')[0];
      
      const dailyInflows: Array<{ type: string; amount: number; description: string }> = [];
      const dailyOutflows: Array<{ type: string; amount: number; description: string }> = [];

      // Expected inflows for this date (by due date)
      for (const invoice of expectedInflows) {
        if (invoice.dueDate && invoice.dueDate.toISOString().split('T')[0] === dateStr) {
          const remaining = Number(invoice.totalAmount) - Number(invoice.paidAmount);
          dailyInflows.push({
            type: 'INVOICE_DUE',
            amount: remaining,
            description: `Faktura ${invoice.invoiceNumber} - ${invoice.buyerName}`,
          });
        }
      }

      // Expected outflows for this date (by due date)
      for (const invoice of expectedOutflows) {
        if (invoice.dueDate && invoice.dueDate.toISOString().split('T')[0] === dateStr) {
          const remaining = Number(invoice.totalAmount) - Number(invoice.paidAmount);
          dailyOutflows.push({
            type: 'INVOICE_DUE',
            amount: remaining,
            description: `Ulazna faktura ${invoice.invoiceNumber} - ${invoice.supplierName}`,
          });
        }
      }

      // Recurring invoices expected on this date
      for (const recurring of recurringInvoices) {
        if (recurring.nextRunAt.toISOString().split('T')[0] === dateStr) {
          const items = recurring.items as any[];
          const total = items?.reduce((sum, item) => sum + (item.amount || 0), 0) || 0;
          dailyInflows.push({
            type: 'RECURRING_INVOICE',
            amount: total,
            description: `Periodična faktura - ${recurring.partner.name}`,
          });
        }
      }

      // Actual payments received on this date
      let actualInflow = 0;
      for (const payment of actualPaymentsReceived) {
        if (payment.paymentDate.toISOString().split('T')[0] === dateStr) {
          actualInflow += Number(payment.amount);
        }
      }

      const expectedInflow = dailyInflows.reduce((sum, i) => sum + i.amount, 0);
      const expectedOutflow = dailyOutflows.reduce((sum, o) => sum + o.amount, 0);
      
      runningBalance += expectedInflow - expectedOutflow;

      forecasts.push({
        date,
        expectedInflow,
        expectedOutflow,
        expectedBalance: runningBalance,
        actualInflow,
        actualOutflow: 0, // Would need actual outflow tracking
        actualBalance: 0, // Would need actual balance tracking
        details: {
          inflows: dailyInflows,
          outflows: dailyOutflows,
        },
      });
    }

    return forecasts;
  }

  /**
   * Get weekly cash flow summary
   */
  static async getWeeklySummary(companyId: string, startDate: Date) {
    const forecasts: Array<{
      weekNumber: number;
      weekStart: Date;
      weekEnd: Date;
      expectedInflow: number;
      expectedOutflow: number;
      netCashFlow: number;
    }> = [];

    for (let week = 0; week < 4; week++) {
      const weekStart = new Date(startDate);
      weekStart.setDate(weekStart.getDate() + week * 7);
      
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);

      // Get expected inflows
      const inflows = await prisma.invoice.aggregate({
        where: {
          companyId,
          type: 'OUTGOING',
          paymentStatus: { in: ['UNPAID', 'PARTIALLY_PAID', 'OVERDUE'] },
          dueDate: { gte: weekStart, lte: weekEnd },
        },
        _sum: { totalAmount: true, paidAmount: true },
      });

      // Get expected outflows
      const outflows = await prisma.incomingInvoice.aggregate({
        where: {
          companyId,
          paymentStatus: { in: ['UNPAID', 'PARTIALLY_PAID'] },
          dueDate: { gte: weekStart, lte: weekEnd },
        },
        _sum: { totalAmount: true, paidAmount: true },
      });

      const expectedInflow = 
        Number(inflows._sum.totalAmount || 0) - Number(inflows._sum.paidAmount || 0);
      const expectedOutflow = 
        Number(outflows._sum.totalAmount || 0) - Number(outflows._sum.paidAmount || 0);

      forecasts.push({
        weekNumber: week + 1,
        weekStart,
        weekEnd,
        expectedInflow,
        expectedOutflow,
        netCashFlow: expectedInflow - expectedOutflow,
      });
    }

    return forecasts;
  }

  /**
   * Get monthly cash flow summary
   */
  static async getMonthlySummary(companyId: string, year: number) {
    const months = Array.from({ length: 12 }, (_, i) => i + 1);

    const summaries = await Promise.all(
      months.map(async (month) => {
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59);

        // Inflows
        const inflows = await prisma.payment.aggregate({
          where: {
            invoice: { companyId, type: 'OUTGOING' },
            paymentDate: { gte: startDate, lte: endDate },
            status: 'CLEARED',
          },
          _sum: { amount: true },
        });

        // Outflows (from bank transactions)
        const outgoingPayments = await prisma.bankTransaction.aggregate({
          where: {
            statement: { companyId },
            transactionDate: { gte: startDate, lte: endDate },
            type: 'DEBIT',
          },
          _sum: { amount: true },
        });

        const actualInflow = Number(inflows._sum.amount || 0);
        const actualOutflow = Number(outgoingPayments._sum.amount || 0);

        return {
          month,
          monthName: startDate.toLocaleDateString('sr-Latn-RS', { month: 'long' }),
          actualInflow,
          actualOutflow,
          netCashFlow: actualInflow - actualOutflow,
        };
      })
    );

    return {
      year,
      months: summaries,
      totals: {
        totalInflow: summaries.reduce((sum, m) => sum + m.actualInflow, 0),
        totalOutflow: summaries.reduce((sum, m) => sum + m.actualOutflow, 0),
        netCashFlow: summaries.reduce((sum, m) => sum + m.netCashFlow, 0),
      },
    };
  }

  /**
   * Get cash flow alerts (low balance warnings)
   */
  static async getCashFlowAlerts(
    companyId: string,
    currentBalance: number,
    daysAhead: number = 30,
    minimumBalance: number = 0
  ) {
    const today = new Date();
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + daysAhead);

    const forecast = await this.generateForecast(companyId, today, endDate, currentBalance);

    const alerts: Array<{
      date: Date;
      expectedBalance: number;
      shortfall: number;
      severity: 'warning' | 'critical';
    }> = [];

    for (const day of forecast) {
      if (day.expectedBalance < minimumBalance) {
        alerts.push({
          date: day.date,
          expectedBalance: day.expectedBalance,
          shortfall: minimumBalance - day.expectedBalance,
          severity: day.expectedBalance < 0 ? 'critical' : 'warning',
        });
      }
    }

    return {
      alerts,
      summary: {
        daysWithAlerts: alerts.length,
        earliestAlertDate: alerts.length > 0 ? alerts[0].date : null,
        maxShortfall: alerts.length > 0 ? Math.max(...alerts.map(a => a.shortfall)) : 0,
        criticalDays: alerts.filter(a => a.severity === 'critical').length,
      },
    };
  }

  /**
   * Save forecast to database
   */
  static async saveForecast(companyId: string, date: Date, forecast: DailyForecast) {
    return prisma.cashFlowForecast.upsert({
      where: {
        companyId_date: { companyId, date },
      },
      create: {
        companyId,
        date,
        expectedInflow: new Decimal(forecast.expectedInflow),
        expectedOutflow: new Decimal(forecast.expectedOutflow),
        expectedBalance: new Decimal(forecast.expectedBalance),
        actualInflow: new Decimal(forecast.actualInflow),
        actualOutflow: new Decimal(forecast.actualOutflow),
        actualBalance: new Decimal(forecast.actualBalance),
      },
      update: {
        expectedInflow: new Decimal(forecast.expectedInflow),
        expectedOutflow: new Decimal(forecast.expectedOutflow),
        expectedBalance: new Decimal(forecast.expectedBalance),
        actualInflow: new Decimal(forecast.actualInflow),
        actualOutflow: new Decimal(forecast.actualOutflow),
        actualBalance: new Decimal(forecast.actualBalance),
      },
    });
  }
}

export default CashFlowForecastService;
