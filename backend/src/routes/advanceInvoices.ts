/**
 * Advance Invoice Routes
 * Avansne fakture
 */

import { Router } from 'express';
import { AdvanceInvoiceController } from '../controllers/advanceInvoiceController';
import { authMiddleware, requireRole } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// Get all advance invoices
router.get('/', AdvanceInvoiceController.getAll);

// Get available advances for partner
router.get('/available', AdvanceInvoiceController.getAvailable);

// Get advance invoice by ID
router.get('/:id', AdvanceInvoiceController.getById);

// Create advance invoice
router.post(
  '/',
  requireRole(['ADMIN', 'ACCOUNTANT']),
  AdvanceInvoiceController.create
);

// Use advance against invoice
router.post(
  '/:id/use',
  requireRole(['ADMIN', 'ACCOUNTANT']),
  AdvanceInvoiceController.useAdvance
);

// Cancel advance invoice
router.post(
  '/:id/cancel',
  requireRole(['ADMIN', 'ACCOUNTANT']),
  AdvanceInvoiceController.cancel
);

export default router;
