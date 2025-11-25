/**
 * Credit Note Routes
 * Knjižna Odobrenja (Credit Notes)
 */

import { Router } from 'express';
import { CreditNoteController } from '../controllers/creditNoteController';
import { authMiddleware, requireRole } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// ========================================
// LIST & GET
// ========================================

router.get('/', CreditNoteController.list);
router.get('/:id', CreditNoteController.get);
router.get('/:id/pdf', CreditNoteController.getPDF);

// ========================================
// CREATE, UPDATE, DELETE (Admin, Accountant)
// ========================================

router.post(
  '/',
  requireRole(['ADMIN', 'ACCOUNTANT']),
  CreditNoteController.create
);

router.delete(
  '/:id',
  requireRole(['ADMIN', 'ACCOUNTANT']),
  CreditNoteController.delete
);

// ========================================
// ACTIONS (Admin, Accountant)
// ========================================

// Send to SEF
router.post(
  '/:id/send',
  requireRole(['ADMIN', 'ACCOUNTANT']),
  CreditNoteController.sendToSEF
);

// Cancel credit note
router.post(
  '/:id/cancel',
  requireRole(['ADMIN', 'ACCOUNTANT']),
  CreditNoteController.cancel
);

export default router;
