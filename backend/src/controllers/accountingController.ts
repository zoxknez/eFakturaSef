/**
 * Accounting Controller
 * Handles Chart of Accounts, Journal Entries, and Financial Reports
 */

import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { AccountService, CreateAccountSchema, UpdateAccountSchema } from '../services/accountService';
import { JournalService, CreateJournalEntrySchema, UpdateJournalEntrySchema } from '../services/journalService';
import { FinancialReportsService } from '../services/financialReportsService';
import { handleControllerError, Errors } from '../utils/errorHandler';
import { JournalStatus, JournalType, AccountType } from '@prisma/client';

/**
 * Helper to get validated company ID from request
 */
function getCompanyId(req: Request): string {
  const authReq = req as AuthenticatedRequest;
  const companyId = authReq.user?.companyId;
  if (!companyId) {
    throw Errors.unauthorized('Company context required');
  }
  return companyId;
}

/**
 * Helper to get validated user ID from request
 */
function getUserId(req: Request): string {
  const authReq = req as AuthenticatedRequest;
  const userId = authReq.user?.id;
  if (!userId) {
    throw Errors.unauthorized('User context required');
  }
  return userId;
}

/**
 * Helper to get validated ID from params
 */
function getParamId(req: Request, paramName: string = 'id'): string {
  const id = req.params[paramName];
  if (!id) {
    throw Errors.badRequest(`${paramName} is required`);
  }
  return id;
}

export class AccountingController {
  // ========================================
  // CHART OF ACCOUNTS
  // ========================================

  /**
   * Initialize chart of accounts for company
   * POST /api/accounting/accounts/initialize
   */
  static async initializeAccounts(req: Request, res: Response) {
    try {
      const companyId = getCompanyId(req);
      await AccountService.initializeChartOfAccounts(companyId);

      return res.status(201).json({
        success: true,
        message: 'Chart of accounts initialized successfully',
      });
    } catch (error) {
      return handleControllerError('InitializeAccounts', error, res);
    }
  }

  /**
   * Get chart of accounts
   * GET /api/accounting/accounts
   */
  static async getAccounts(req: Request, res: Response) {
    try {
      const companyId = getCompanyId(req);
      const { type, level, isActive, search, flat } = req.query;

      const accounts = await AccountService.getAccounts(companyId, {
        type: type as AccountType,
        level: level ? parseInt(level as string) : undefined,
        isActive: isActive !== undefined ? isActive === 'true' : undefined,
        search: search as string,
        flat: flat === 'true',
      });

      return res.json({ success: true, data: accounts });
    } catch (error) {
      return handleControllerError('GetAccounts', error, res);
    }
  }

  /**
   * Get single account
   * GET /api/accounting/accounts/:id
   */
  static async getAccount(req: Request, res: Response) {
    try {
      const companyId = getCompanyId(req);
      const id = getParamId(req);

      const account = await AccountService.getAccount(id, companyId);
      return res.json({ success: true, data: account });
    } catch (error) {
      return handleControllerError('GetAccount', error, res);
    }
  }

  /**
   * Create account
   * POST /api/accounting/accounts
   */
  static async createAccount(req: Request, res: Response) {
    try {
      const companyId = getCompanyId(req);

      const validation = CreateAccountSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: validation.error.format(),
        });
      }

      const account = await AccountService.createAccount(companyId, validation.data);
      return res.status(201).json({ success: true, data: account });
    } catch (error) {
      return handleControllerError('CreateAccount', error, res);
    }
  }

  /**
   * Update account
   * PUT /api/accounting/accounts/:id
   */
  static async updateAccount(req: Request, res: Response) {
    try {
      const companyId = getCompanyId(req);
      const id = getParamId(req);

      const validation = UpdateAccountSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: validation.error.format(),
        });
      }

      const account = await AccountService.updateAccount(id, companyId, validation.data);
      return res.json({ success: true, data: account });
    } catch (error) {
      return handleControllerError('UpdateAccount', error, res);
    }
  }

  /**
   * Delete account
   * DELETE /api/accounting/accounts/:id
   */
  static async deleteAccount(req: Request, res: Response) {
    try {
      const companyId = getCompanyId(req);
      const id = getParamId(req);

      const result = await AccountService.deleteAccount(id, companyId);
      return res.json({ success: true, ...result });
    } catch (error) {
      return handleControllerError('DeleteAccount', error, res);
    }
  }

  /**
   * Get account balance
   * GET /api/accounting/accounts/:id/balance
   */
  static async getAccountBalance(req: Request, res: Response) {
    try {
      const companyId = getCompanyId(req);
      const id = getParamId(req);
      const { fromDate, toDate, fiscalYearId } = req.query;

      const balance = await AccountService.getAccountBalance(id, companyId, {
        fromDate: fromDate ? new Date(fromDate as string) : undefined,
        toDate: toDate ? new Date(toDate as string) : undefined,
        fiscalYearId: fiscalYearId as string,
      });

      return res.json({ success: true, data: balance });
    } catch (error) {
      return handleControllerError('GetAccountBalance', error, res);
    }
  }

  /**
   * Get trial balance
   * GET /api/accounting/trial-balance
   */
  static async getTrialBalance(req: Request, res: Response) {
    try {
      const companyId = getCompanyId(req);
      const { fromDate, toDate, fiscalYearId, level } = req.query;

      const trialBalance = await AccountService.getTrialBalance(companyId, {
        fromDate: fromDate ? new Date(fromDate as string) : undefined,
        toDate: toDate ? new Date(toDate as string) : undefined,
        fiscalYearId: fiscalYearId as string,
        level: level ? parseInt(level as string) : undefined,
      });

      return res.json({ success: true, data: trialBalance });
    } catch (error) {
      return handleControllerError('GetTrialBalance', error, res);
    }
  }

  /**
   * Autocomplete accounts
   * GET /api/accounting/accounts/autocomplete
   */
  static async autocompleteAccounts(req: Request, res: Response) {
    try {
      const companyId = getCompanyId(req);
      const { q } = req.query;

      if (!q) {
        return res.status(400).json({ success: false, error: 'Query parameter q is required' });
      }

      const accounts = await AccountService.autocomplete(companyId, q as string);
      return res.json({ success: true, data: accounts });
    } catch (error) {
      return handleControllerError('AutocompleteAccounts', error, res);
    }
  }

  // ========================================
  // JOURNAL ENTRIES
  // ========================================

  /**
   * List journal entries
   * GET /api/accounting/journals
   */
  static async listJournalEntries(req: Request, res: Response) {
    try {
      const companyId = getCompanyId(req);
      const { page, limit, status, type, fiscalYearId, fromDate, toDate, search } = req.query;

      const result = await JournalService.listJournalEntries(companyId, {
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
        status: status as JournalStatus,
        type: type as JournalType,
        fiscalYearId: fiscalYearId as string,
        fromDate: fromDate ? new Date(fromDate as string) : undefined,
        toDate: toDate ? new Date(toDate as string) : undefined,
        search: search as string,
      });

      return res.json({ success: true, ...result });
    } catch (error) {
      return handleControllerError('ListJournalEntries', error, res);
    }
  }

  /**
   * Get journal entry
   * GET /api/accounting/journals/:id
   */
  static async getJournalEntry(req: Request, res: Response) {
    try {
      const companyId = getCompanyId(req);
      const id = getParamId(req);

      const entry = await JournalService.getJournalEntry(id, companyId);
      return res.json({ success: true, data: entry });
    } catch (error) {
      return handleControllerError('GetJournalEntry', error, res);
    }
  }

  /**
   * Create journal entry
   * POST /api/accounting/journals
   */
  static async createJournalEntry(req: Request, res: Response) {
    try {
      const companyId = getCompanyId(req);
      const userId = getUserId(req);

      const validation = CreateJournalEntrySchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: validation.error.format(),
        });
      }

      const entry = await JournalService.createJournalEntry(companyId, validation.data, userId);
      return res.status(201).json({ success: true, data: entry });
    } catch (error) {
      return handleControllerError('CreateJournalEntry', error, res);
    }
  }

  /**
   * Update journal entry
   * PUT /api/accounting/journals/:id
   */
  static async updateJournalEntry(req: Request, res: Response) {
    try {
      const companyId = getCompanyId(req);
      const userId = getUserId(req);
      const id = getParamId(req);

      const validation = UpdateJournalEntrySchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: validation.error.format(),
        });
      }

      const entry = await JournalService.updateJournalEntry(id, companyId, validation.data, userId);
      return res.json({ success: true, data: entry });
    } catch (error) {
      return handleControllerError('UpdateJournalEntry', error, res);
    }
  }

  /**
   * Post journal entry
   * POST /api/accounting/journals/:id/post
   */
  static async postJournalEntry(req: Request, res: Response) {
    try {
      const companyId = getCompanyId(req);
      const userId = getUserId(req);
      const id = getParamId(req);

      const entry = await JournalService.postJournalEntry(id, companyId, userId);
      return res.json({ success: true, data: entry, message: 'Journal entry posted successfully' });
    } catch (error) {
      return handleControllerError('PostJournalEntry', error, res);
    }
  }

  /**
   * Reverse journal entry
   * POST /api/accounting/journals/:id/reverse
   */
  static async reverseJournalEntry(req: Request, res: Response) {
    try {
      const companyId = getCompanyId(req);
      const userId = getUserId(req);
      const id = getParamId(req);
      const { reason } = req.body;

      if (!reason) {
        return res.status(400).json({ success: false, error: 'Reason is required' });
      }

      const entry = await JournalService.reverseJournalEntry(id, companyId, userId, reason);
      return res.json({ success: true, data: entry, message: 'Journal entry reversed successfully' });
    } catch (error) {
      return handleControllerError('ReverseJournalEntry', error, res);
    }
  }

  /**
   * Delete journal entry
   * DELETE /api/accounting/journals/:id
   */
  static async deleteJournalEntry(req: Request, res: Response) {
    try {
      const companyId = getCompanyId(req);
      const id = getParamId(req);

      const result = await JournalService.deleteJournalEntry(id, companyId);
      return res.json({ success: true, ...result });
    } catch (error) {
      return handleControllerError('DeleteJournalEntry', error, res);
    }
  }

  /**
   * Get general ledger for account
   * GET /api/accounting/ledger/:accountId
   */
  static async getGeneralLedger(req: Request, res: Response) {
    try {
      const companyId = getCompanyId(req);
      const accountId = getParamId(req, 'accountId');
      const { fromDate, toDate, fiscalYearId } = req.query;

      const ledger = await JournalService.getGeneralLedger(companyId, accountId, {
        fromDate: fromDate ? new Date(fromDate as string) : undefined,
        toDate: toDate ? new Date(toDate as string) : undefined,
        fiscalYearId: fiscalYearId as string,
      });

      return res.json({ success: true, data: ledger });
    } catch (error) {
      return handleControllerError('GetGeneralLedger', error, res);
    }
  }

  // ========================================
  // FINANCIAL REPORTS
  // ========================================

  /**
   * Get balance sheet
   * GET /api/accounting/reports/balance-sheet
   */
  static async getBalanceSheet(req: Request, res: Response) {
    try {
      const companyId = getCompanyId(req);
      const { asOfDate } = req.query;

      const balanceSheet = await FinancialReportsService.generateBalanceSheet(
        companyId,
        asOfDate ? new Date(asOfDate as string) : undefined
      );

      return res.json({ success: true, data: balanceSheet });
    } catch (error) {
      return handleControllerError('GetBalanceSheet', error, res);
    }
  }

  /**
   * Get income statement
   * GET /api/accounting/reports/income-statement
   */
  static async getIncomeStatement(req: Request, res: Response) {
    try {
      const companyId = getCompanyId(req);
      const { fromDate, toDate } = req.query;

      if (!fromDate || !toDate) {
        return res.status(400).json({ success: false, error: 'fromDate and toDate are required' });
      }

      const incomeStatement = await FinancialReportsService.generateIncomeStatement(
        companyId,
        new Date(fromDate as string),
        new Date(toDate as string)
      );

      return res.json({ success: true, data: incomeStatement });
    } catch (error) {
      return handleControllerError('GetIncomeStatement', error, res);
    }
  }

  /**
   * Get aging report
   * GET /api/accounting/reports/aging
   */
  static async getAgingReport(req: Request, res: Response) {
    try {
      const companyId = getCompanyId(req);
      const { type, asOfDate } = req.query;

      const agingReport = await FinancialReportsService.generateAgingReport(
        companyId,
        (type as 'RECEIVABLE' | 'PAYABLE') || 'RECEIVABLE',
        asOfDate ? new Date(asOfDate as string) : undefined
      );

      return res.json({ success: true, data: agingReport });
    } catch (error) {
      return handleControllerError('GetAgingReport', error, res);
    }
  }

  /**
   * Get sales by partner report
   * GET /api/accounting/reports/sales-by-partner
   */
  static async getSalesByPartner(req: Request, res: Response) {
    try {
      const companyId = getCompanyId(req);
      const { fromDate, toDate } = req.query;

      if (!fromDate || !toDate) {
        return res.status(400).json({ success: false, error: 'fromDate and toDate are required' });
      }

      const report = await FinancialReportsService.generateSalesByPartner(
        companyId,
        new Date(fromDate as string),
        new Date(toDate as string)
      );

      return res.json({ success: true, data: report });
    } catch (error) {
      return handleControllerError('GetSalesByPartner', error, res);
    }
  }

  /**
   * Get sales by product report
   * GET /api/accounting/reports/sales-by-product
   */
  static async getSalesByProduct(req: Request, res: Response) {
    try {
      const companyId = getCompanyId(req);
      const { fromDate, toDate } = req.query;

      if (!fromDate || !toDate) {
        return res.status(400).json({ success: false, error: 'fromDate and toDate are required' });
      }

      const report = await FinancialReportsService.generateSalesByProduct(
        companyId,
        new Date(fromDate as string),
        new Date(toDate as string)
      );

      return res.json({ success: true, data: report });
    } catch (error) {
      return handleControllerError('GetSalesByProduct', error, res);
    }
  }

  /**
   * Get monthly summary
   * GET /api/accounting/reports/monthly-summary
   */
  static async getMonthlySummary(req: Request, res: Response) {
    try {
      const companyId = getCompanyId(req);
      const { year } = req.query;

      const targetYear = year ? parseInt(year as string) : new Date().getFullYear();
      const summary = await FinancialReportsService.generateMonthlySummary(companyId, targetYear);

      return res.json({ success: true, data: summary });
    } catch (error) {
      return handleControllerError('GetMonthlySummary', error, res);
    }
  }

  /**
   * Get financial overview
   * GET /api/accounting/reports/overview
   */
  static async getFinancialOverview(req: Request, res: Response) {
    try {
      const companyId = getCompanyId(req);
      const { fromDate, toDate } = req.query;

      // Default to current month if no dates provided
      const now = new Date();
      const from = fromDate ? new Date(fromDate as string) : new Date(now.getFullYear(), now.getMonth(), 1);
      const to = toDate ? new Date(toDate as string) : new Date(now.getFullYear(), now.getMonth() + 1, 0);

      const overview = await FinancialReportsService.getFinancialOverview(companyId, from, to);

      return res.json({ success: true, data: overview });
    } catch (error) {
      return handleControllerError('GetFinancialOverview', error, res);
    }
  }
}

export default AccountingController;
