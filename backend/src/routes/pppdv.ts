/**
 * PPPDV Routes
 * PDV prijava (PP-PDV) za ePorezi
 */

import { Router } from 'express';
import { PPPDVController } from '../controllers/pppdvController';
import { authMiddleware, requireRole } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// Get all PPPDV reports
router.get('/', PPPDVController.getReports);

// Get specific report by ID
router.get('/:id', PPPDVController.getReportById);

// Calculate PPPDV for a period
router.post(
  '/calculate',
  requireRole(['ADMIN', 'ACCOUNTANT']),
  PPPDVController.calculate
);

// Save calculated report
router.post(
  '/save',
  requireRole(['ADMIN', 'ACCOUNTANT']),
  PPPDVController.save
);

// Submit to ePorezi (mark as submitted)
router.post(
  '/:id/submit',
  requireRole(['ADMIN', 'ACCOUNTANT']),
  PPPDVController.submit
);

// Generate XML for ePorezi upload
router.get(
  '/:id/xml',
  requireRole(['ADMIN', 'ACCOUNTANT']),
  PPPDVController.generateXml
);

// Delete draft report
router.delete(
  '/:id',
  requireRole(['ADMIN', 'ACCOUNTANT']),
  PPPDVController.delete
);

export default router;
