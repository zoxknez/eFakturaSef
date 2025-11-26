/**
 * KPO Routes
 * KPO Knjiga prometa za preduzetnike
 */

import { Router } from 'express';
import { KPOController } from '../controllers/kpoController';
import { authMiddleware, requireRole } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// Get KPO entries
router.get('/entries', KPOController.getEntries);

// Get KPO summary
router.get('/summary', KPOController.getSummary);

// Create single entry
router.post(
  '/',
  requireRole(['ADMIN', 'ACCOUNTANT']),
  KPOController.create
);

// Auto-generate from invoices
router.post(
  '/auto-generate',
  requireRole(['ADMIN', 'ACCOUNTANT']),
  KPOController.autoGenerate
);

// Update entry
router.put(
  '/:id',
  requireRole(['ADMIN', 'ACCOUNTANT']),
  KPOController.update
);

// Delete entry
router.delete(
  '/:id',
  requireRole(['ADMIN', 'ACCOUNTANT']),
  KPOController.delete
);

export default router;
