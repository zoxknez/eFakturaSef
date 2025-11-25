/**
 * Accounting Routes
 * Chart of Accounts, Journal Entries, and Financial Reports
 */

import { Router } from 'express';
import { AccountingController } from '../controllers/accountingController';
import { authMiddleware, requireRole } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// ========================================
// CHART OF ACCOUNTS
// ========================================

// Initialize chart of accounts (Admin only)
router.post(
  '/accounts/initialize',
  requireRole(['ADMIN']),
  AccountingController.initializeAccounts
);

// Autocomplete accounts (for forms)
router.get('/accounts/autocomplete', AccountingController.autocompleteAccounts);

// List/get accounts
router.get('/accounts', AccountingController.getAccounts);
router.get('/accounts/:id', AccountingController.getAccount);
router.get('/accounts/:id/balance', AccountingController.getAccountBalance);

// Create/update/delete accounts (Admin, Accountant)
router.post(
  '/accounts',
  requireRole(['ADMIN', 'ACCOUNTANT']),
  AccountingController.createAccount
);
router.put(
  '/accounts/:id',
  requireRole(['ADMIN', 'ACCOUNTANT']),
  AccountingController.updateAccount
);
router.delete(
  '/accounts/:id',
  requireRole(['ADMIN']),
  AccountingController.deleteAccount
);

// ========================================
// TRIAL BALANCE
// ========================================

router.get('/trial-balance', AccountingController.getTrialBalance);

// ========================================
// JOURNAL ENTRIES
// ========================================

// List/get journal entries
router.get('/journals', AccountingController.listJournalEntries);
router.get('/journals/:id', AccountingController.getJournalEntry);

// Create/update/delete journal entries (Admin, Accountant)
router.post(
  '/journals',
  requireRole(['ADMIN', 'ACCOUNTANT']),
  AccountingController.createJournalEntry
);
router.put(
  '/journals/:id',
  requireRole(['ADMIN', 'ACCOUNTANT']),
  AccountingController.updateJournalEntry
);
router.delete(
  '/journals/:id',
  requireRole(['ADMIN', 'ACCOUNTANT']),
  AccountingController.deleteJournalEntry
);

// Post/reverse journal entries (Admin, Accountant)
router.post(
  '/journals/:id/post',
  requireRole(['ADMIN', 'ACCOUNTANT']),
  AccountingController.postJournalEntry
);
router.post(
  '/journals/:id/reverse',
  requireRole(['ADMIN', 'ACCOUNTANT']),
  AccountingController.reverseJournalEntry
);

// ========================================
// GENERAL LEDGER
// ========================================

router.get('/ledger/:accountId', AccountingController.getGeneralLedger);

// ========================================
// FINANCIAL REPORTS
// ========================================

router.get('/reports/balance-sheet', AccountingController.getBalanceSheet);
router.get('/reports/income-statement', AccountingController.getIncomeStatement);
router.get('/reports/aging', AccountingController.getAgingReport);
router.get('/reports/sales-by-partner', AccountingController.getSalesByPartner);
router.get('/reports/sales-by-product', AccountingController.getSalesByProduct);
router.get('/reports/monthly-summary', AccountingController.getMonthlySummary);
router.get('/reports/overview', AccountingController.getFinancialOverview);

export default router;
