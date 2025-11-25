/**
 * Financial Reports Service
 * Generates financial statements and reports
 */

import { prisma } from '../db/prisma';
import { AccountType } from '@prisma/client';
import { AccountService } from './accountService';

// ========================================
// INTERFACES
// ========================================

interface BalanceSheetItem {
  code: string;
  name: string;
  amount: number;
  children?: BalanceSheetItem[];
}

interface BalanceSheet {
  date: Date;
  companyName: string;
  assets: {
    fixedAssets: BalanceSheetItem[];
    currentAssets: BalanceSheetItem[];
    totalAssets: number;
  };
  liabilities: {
    equity: BalanceSheetItem[];
    longTermLiabilities: BalanceSheetItem[];
    shortTermLiabilities: BalanceSheetItem[];
    totalLiabilities: number;
  };
  isBalanced: boolean;
}

interface IncomeStatementItem {
  code: string;
  name: string;
  amount: number;
}

interface IncomeStatement {
  periodFrom: Date;
  periodTo: Date;
  companyName: string;
  revenue: {
    operatingRevenue: IncomeStatementItem[];
    financialRevenue: IncomeStatementItem[];
    otherRevenue: IncomeStatementItem[];
    totalRevenue: number;
  };
  expenses: {
    operatingExpenses: IncomeStatementItem[];
    financialExpenses: IncomeStatementItem[];
    otherExpenses: IncomeStatementItem[];
    totalExpenses: number;
  };
  grossProfit: number;
  netProfit: number;
}

interface AgingReportItem {
  partnerId: string;
  partnerName: string;
  partnerPIB: string;
  current: number;      // 0-30 days
  days30: number;       // 31-60 days
  days60: number;       // 61-90 days
  days90: number;       // 90+ days
  total: number;
}

// Commented out - will be used in future Cash Flow Statement implementation
// interface CashFlowItem {
//   date: Date;
//   description: string;
//   inflow: number;
//   outflow: number;
//   balance: number;
//   type: 'OPERATING' | 'INVESTING' | 'FINANCING';
// }

// ========================================
// SERVICE CLASS
// ========================================

export class FinancialReportsService {
  /**
   * Generate Balance Sheet (Bilans Stanja)
   */
  static async generateBalanceSheet(
    companyId: string,
    asOfDate: Date = new Date()
  ): Promise<BalanceSheet> {
    const company = await prisma.company.findUnique({
      where: { id: companyId },
    });

    if (!company) {
      throw new Error('Company not found');
    }

    // Get all account balances
    const accounts = await prisma.account.findMany({
      where: { companyId, isActive: true, level: { lte: 3 } },
      orderBy: { code: 'asc' },
    });

    // Calculate balances for each account
    const balances = new Map<string, number>();

    for (const account of accounts) {
      const balance = await AccountService.getAccountBalance(account.id, companyId, {
        toDate: asOfDate,
      });
      balances.set(account.id, balance.balance);
    }

    // Group accounts by type
    const assetAccounts = accounts.filter(a => a.type === AccountType.ASSET);
    const equityAccounts = accounts.filter(a => a.type === AccountType.EQUITY);
    const liabilityAccounts = accounts.filter(a => a.type === AccountType.LIABILITY);

    // Build balance sheet items
    const buildItems = (accts: typeof accounts): BalanceSheetItem[] => {
      return accts
        .filter(a => a.level === 2)
        .map(a => ({
          code: a.code,
          name: a.name,
          amount: balances.get(a.id) || 0,
          children: accts
            .filter(c => c.parentId === a.id)
            .map(c => ({
              code: c.code,
              name: c.name,
              amount: balances.get(c.id) || 0,
            })),
        }))
        .filter(item => item.amount !== 0 || item.children?.some(c => c.amount !== 0));
    };

    // Separate fixed and current assets (klasa 0-1 vs klasa 2)
    const fixedAssets = buildItems(assetAccounts.filter(a => a.code.startsWith('0') || a.code.startsWith('1')));
    const currentAssets = buildItems(assetAccounts.filter(a => a.code.startsWith('2')));

    // Separate equity and liabilities
    const equity = buildItems(equityAccounts);
    const longTermLiabilities = buildItems(liabilityAccounts.filter(a => a.code.startsWith('40')));
    const shortTermLiabilities = buildItems(liabilityAccounts.filter(a => !a.code.startsWith('40')));

    const totalAssets = [...fixedAssets, ...currentAssets].reduce(
      (sum, item) => sum + item.amount, 0
    );
    const totalLiabilities = [...equity, ...longTermLiabilities, ...shortTermLiabilities].reduce(
      (sum, item) => sum + item.amount, 0
    );

    return {
      date: asOfDate,
      companyName: company.name,
      assets: {
        fixedAssets,
        currentAssets,
        totalAssets,
      },
      liabilities: {
        equity,
        longTermLiabilities,
        shortTermLiabilities,
        totalLiabilities,
      },
      isBalanced: Math.abs(totalAssets - totalLiabilities) < 0.01,
    };
  }

  /**
   * Generate Income Statement (Bilans Uspeha)
   */
  static async generateIncomeStatement(
    companyId: string,
    periodFrom: Date,
    periodTo: Date
  ): Promise<IncomeStatement> {
    const company = await prisma.company.findUnique({
      where: { id: companyId },
    });

    if (!company) {
      throw new Error('Company not found');
    }

    // Get revenue and expense accounts
    const accounts = await prisma.account.findMany({
      where: {
        companyId,
        isActive: true,
        type: { in: [AccountType.REVENUE, AccountType.EXPENSE] },
        level: { lte: 3 },
      },
      orderBy: { code: 'asc' },
    });

    // Calculate balances
    const balances = new Map<string, number>();

    for (const account of accounts) {
      const balance = await AccountService.getAccountBalance(account.id, companyId, {
        fromDate: periodFrom,
        toDate: periodTo,
      });
      balances.set(account.id, Math.abs(balance.balance));
    }

    const buildItems = (accts: typeof accounts): IncomeStatementItem[] => {
      return accts
        .filter(a => a.level === 2)
        .map(a => ({
          code: a.code,
          name: a.name,
          amount: balances.get(a.id) || 0,
        }))
        .filter(item => item.amount !== 0);
    };

    const revenueAccounts = accounts.filter(a => a.type === AccountType.REVENUE);
    const expenseAccounts = accounts.filter(a => a.type === AccountType.EXPENSE);

    // Separate by category (60-61 operating, 66 financial, 67 other)
    const operatingRevenue = buildItems(revenueAccounts.filter(a => 
      a.code.startsWith('60') || a.code.startsWith('61') || a.code.startsWith('62')
    ));
    const financialRevenue = buildItems(revenueAccounts.filter(a => a.code.startsWith('66')));
    const otherRevenue = buildItems(revenueAccounts.filter(a => 
      a.code.startsWith('64') || a.code.startsWith('67') || a.code.startsWith('68')
    ));

    const operatingExpenses = buildItems(expenseAccounts.filter(a => 
      a.code.startsWith('50') || a.code.startsWith('51') || a.code.startsWith('52') || 
      a.code.startsWith('53') || a.code.startsWith('54') || a.code.startsWith('55')
    ));
    const financialExpenses = buildItems(expenseAccounts.filter(a => a.code.startsWith('56')));
    const otherExpenses = buildItems(expenseAccounts.filter(a => 
      a.code.startsWith('57') || a.code.startsWith('58')
    ));

    const totalRevenue = [...operatingRevenue, ...financialRevenue, ...otherRevenue]
      .reduce((sum, item) => sum + item.amount, 0);
    const totalExpenses = [...operatingExpenses, ...financialExpenses, ...otherExpenses]
      .reduce((sum, item) => sum + item.amount, 0);

    const grossProfit = totalRevenue - totalExpenses;
    const netProfit = grossProfit; // Simplified - no tax calculation

    return {
      periodFrom,
      periodTo,
      companyName: company.name,
      revenue: {
        operatingRevenue,
        financialRevenue,
        otherRevenue,
        totalRevenue,
      },
      expenses: {
        operatingExpenses,
        financialExpenses,
        otherExpenses,
        totalExpenses,
      },
      grossProfit,
      netProfit,
    };
  }

  /**
   * Generate Accounts Receivable Aging Report
   */
  static async generateAgingReport(
    companyId: string,
    type: 'RECEIVABLE' | 'PAYABLE' = 'RECEIVABLE',
    asOfDate: Date = new Date()
  ): Promise<{ items: AgingReportItem[]; totals: AgingReportItem }> {
    const invoices = await prisma.invoice.findMany({
      where: {
        companyId,
        type: type === 'RECEIVABLE' ? 'OUTGOING' : 'INCOMING',
        paymentStatus: { in: ['UNPAID', 'PARTIALLY_PAID', 'OVERDUE'] },
        dueDate: { not: null },
      },
      include: {
        partner: true,
      },
    });

    const partnerMap = new Map<string, AgingReportItem>();

    for (const invoice of invoices) {
      const partnerId = invoice.partnerId || 'unknown';
      const partnerName = invoice.buyerName || invoice.partner?.name || 'Unknown';
      const partnerPIB = invoice.buyerPIB || invoice.partner?.pib || '';

      if (!partnerMap.has(partnerId)) {
        partnerMap.set(partnerId, {
          partnerId,
          partnerName,
          partnerPIB,
          current: 0,
          days30: 0,
          days60: 0,
          days90: 0,
          total: 0,
        });
      }

      const item = partnerMap.get(partnerId)!;
      const dueDate = invoice.dueDate!;
      const daysOverdue = Math.floor((asOfDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
      const outstanding = Number(invoice.totalAmount) - Number(invoice.paidAmount);

      if (daysOverdue <= 0) {
        item.current += outstanding;
      } else if (daysOverdue <= 30) {
        item.days30 += outstanding;
      } else if (daysOverdue <= 60) {
        item.days60 += outstanding;
      } else {
        item.days90 += outstanding;
      }

      item.total += outstanding;
    }

    const items = Array.from(partnerMap.values()).filter(i => i.total > 0);

    const totals: AgingReportItem = {
      partnerId: 'TOTAL',
      partnerName: 'UKUPNO',
      partnerPIB: '',
      current: items.reduce((sum, i) => sum + i.current, 0),
      days30: items.reduce((sum, i) => sum + i.days30, 0),
      days60: items.reduce((sum, i) => sum + i.days60, 0),
      days90: items.reduce((sum, i) => sum + i.days90, 0),
      total: items.reduce((sum, i) => sum + i.total, 0),
    };

    return { items, totals };
  }

  /**
   * Generate Sales by Partner Report
   */
  static async generateSalesByPartner(
    companyId: string,
    periodFrom: Date,
    periodTo: Date
  ) {
    const invoices = await prisma.invoice.findMany({
      where: {
        companyId,
        type: 'OUTGOING',
        status: { in: ['SENT', 'DELIVERED', 'ACCEPTED'] },
        issueDate: { gte: periodFrom, lte: periodTo },
      },
      include: {
        partner: true,
      },
    });

    const partnerSales = new Map<string, {
      partnerName: string;
      partnerPIB: string;
      invoiceCount: number;
      totalAmount: number;
      paidAmount: number;
    }>();

    for (const invoice of invoices) {
      const partnerId = invoice.partnerId || invoice.buyerPIB || 'unknown';
      const partnerName = invoice.buyerName || invoice.partner?.name || 'Unknown';
      const partnerPIB = invoice.buyerPIB || invoice.partner?.pib || '';

      if (!partnerSales.has(partnerId)) {
        partnerSales.set(partnerId, {
          partnerName,
          partnerPIB,
          invoiceCount: 0,
          totalAmount: 0,
          paidAmount: 0,
        });
      }

      const sales = partnerSales.get(partnerId)!;
      sales.invoiceCount++;
      sales.totalAmount += Number(invoice.totalAmount);
      sales.paidAmount += Number(invoice.paidAmount);
    }

    const items = Array.from(partnerSales.values())
      .sort((a, b) => b.totalAmount - a.totalAmount);

    return {
      periodFrom,
      periodTo,
      items,
      totals: {
        partnerCount: items.length,
        invoiceCount: items.reduce((sum, i) => sum + i.invoiceCount, 0),
        totalAmount: items.reduce((sum, i) => sum + i.totalAmount, 0),
        paidAmount: items.reduce((sum, i) => sum + i.paidAmount, 0),
      },
    };
  }

  /**
   * Generate Sales by Product Report
   */
  static async generateSalesByProduct(
    companyId: string,
    periodFrom: Date,
    periodTo: Date
  ) {
    const invoiceLines = await prisma.invoiceLine.findMany({
      where: {
        invoice: {
          companyId,
          type: 'OUTGOING',
          status: { in: ['SENT', 'DELIVERED', 'ACCEPTED'] },
          issueDate: { gte: periodFrom, lte: periodTo },
        },
      },
      include: {
        product: true,
      },
    });

    const productSales = new Map<string, {
      productName: string;
      productCode: string;
      quantitySold: number;
      totalRevenue: number;
      totalTax: number;
    }>();

    for (const line of invoiceLines) {
      const productId = line.productId || line.itemName;
      const productName = line.product?.name || line.itemName;
      const productCode = line.product?.code || '-';

      if (!productSales.has(productId)) {
        productSales.set(productId, {
          productName,
          productCode,
          quantitySold: 0,
          totalRevenue: 0,
          totalTax: 0,
        });
      }

      const sales = productSales.get(productId)!;
      sales.quantitySold += Number(line.quantity);
      sales.totalRevenue += Number(line.amount);
      sales.totalTax += Number(line.taxAmount);
    }

    const items = Array.from(productSales.values())
      .sort((a, b) => b.totalRevenue - a.totalRevenue);

    return {
      periodFrom,
      periodTo,
      items,
      totals: {
        productCount: items.length,
        totalQuantity: items.reduce((sum, i) => sum + i.quantitySold, 0),
        totalRevenue: items.reduce((sum, i) => sum + i.totalRevenue, 0),
        totalTax: items.reduce((sum, i) => sum + i.totalTax, 0),
      },
    };
  }

  /**
   * Generate Monthly Revenue Summary
   */
  static async generateMonthlySummary(
    companyId: string,
    year: number
  ) {
    const months = Array.from({ length: 12 }, (_, i) => i + 1);

    const summaries = await Promise.all(
      months.map(async (month) => {
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0);

        const invoices = await prisma.invoice.aggregate({
          where: {
            companyId,
            type: 'OUTGOING',
            status: { in: ['SENT', 'DELIVERED', 'ACCEPTED'] },
            issueDate: { gte: startDate, lte: endDate },
          },
          _sum: {
            totalAmount: true,
            taxAmount: true,
            paidAmount: true,
          },
          _count: true,
        });

        return {
          month,
          monthName: startDate.toLocaleDateString('sr-Latn-RS', { month: 'long' }),
          invoiceCount: invoices._count,
          revenue: Number(invoices._sum.totalAmount || 0),
          tax: Number(invoices._sum.taxAmount || 0),
          collected: Number(invoices._sum.paidAmount || 0),
        };
      })
    );

    return {
      year,
      months: summaries,
      totals: {
        invoiceCount: summaries.reduce((sum, m) => sum + m.invoiceCount, 0),
        revenue: summaries.reduce((sum, m) => sum + m.revenue, 0),
        tax: summaries.reduce((sum, m) => sum + m.tax, 0),
        collected: summaries.reduce((sum, m) => sum + m.collected, 0),
      },
    };
  }

  /**
   * Quick financial overview
   */
  static async getFinancialOverview(
    companyId: string,
    periodFrom: Date,
    periodTo: Date
  ) {
    const [
      outgoingInvoices,
      incomingInvoices,
      payments,
    ] = await Promise.all([
      prisma.invoice.aggregate({
        where: {
          companyId,
          type: 'OUTGOING',
          status: { in: ['SENT', 'DELIVERED', 'ACCEPTED'] },
          issueDate: { gte: periodFrom, lte: periodTo },
        },
        _sum: { totalAmount: true, taxAmount: true, paidAmount: true },
        _count: true,
      }),
      prisma.invoice.aggregate({
        where: {
          companyId,
          type: 'INCOMING',
          status: { in: ['SENT', 'DELIVERED', 'ACCEPTED'] },
          issueDate: { gte: periodFrom, lte: periodTo },
        },
        _sum: { totalAmount: true, taxAmount: true, paidAmount: true },
        _count: true,
      }),
      prisma.payment.aggregate({
        where: {
          invoice: { companyId },
          paymentDate: { gte: periodFrom, lte: periodTo },
          status: 'CLEARED',
        },
        _sum: { amount: true },
        _count: true,
      }),
    ]);

    const revenue = Number(outgoingInvoices._sum.totalAmount || 0);
    const expenses = Number(incomingInvoices._sum.totalAmount || 0);
    const outputVAT = Number(outgoingInvoices._sum.taxAmount || 0);
    const inputVAT = Number(incomingInvoices._sum.taxAmount || 0);

    return {
      period: { from: periodFrom, to: periodTo },
      revenue: {
        total: revenue,
        vat: outputVAT,
        net: revenue - outputVAT,
        invoiceCount: outgoingInvoices._count,
        collected: Number(outgoingInvoices._sum.paidAmount || 0),
      },
      expenses: {
        total: expenses,
        vat: inputVAT,
        net: expenses - inputVAT,
        invoiceCount: incomingInvoices._count,
        paid: Number(incomingInvoices._sum.paidAmount || 0),
      },
      vat: {
        output: outputVAT,
        input: inputVAT,
        balance: outputVAT - inputVAT,
      },
      profitLoss: {
        gross: revenue - expenses,
        net: (revenue - outputVAT) - (expenses - inputVAT),
      },
      payments: {
        count: payments._count,
        total: Number(payments._sum.amount || 0),
      },
    };
  }
}

export default FinancialReportsService;
