/**
 * VAT Routes
 * PDV/VAT reporting and management
 */

import { Router } from 'express';
import { VATController } from '../controllers/vatController';
import { authMiddleware, requireRole } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// ========================================
// VAT SUMMARY & REPORTING
// ========================================

// Get VAT summary for a month
router.get('/summary', VATController.getSummary);

// Get VAT records list
router.get('/records', VATController.getRecords);

// Generate PP-PDV form data
router.get('/pppdv', VATController.generatePPPDV);

// Get PP-PDV data for frontend form (supports date ranges)
router.get('/pppdv-data', VATController.getPPPDVData);

// Export PP-PDV as PDF
router.get('/pppdv/pdf', VATController.exportPPPDVPDF);

// Quarterly and annual reports
router.get('/quarterly', VATController.getQuarterlyReport);
router.get('/annual', VATController.getAnnualSummary);

// ========================================
// VAT EXPORTS
// ========================================

// Export KPO (Purchase Book)
router.get('/export/kpo', VATController.exportKPO);

// Export KPR (Sales Book)
router.get('/export/kpr', VATController.exportKPR);

// ========================================
// VAT OPERATIONS (Admin, Accountant)
// ========================================

// Calculate VAT from invoice
router.post(
  '/calculate',
  requireRole(['ADMIN', 'ACCOUNTANT']),
  VATController.calculateFromInvoice
);

// Recalculate VAT records for a period
router.post(
  '/recalculate',
  requireRole(['ADMIN', 'ACCOUNTANT']),
  VATController.recalculateVATRecords
);

export default router;
