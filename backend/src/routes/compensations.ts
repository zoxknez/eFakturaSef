/**
 * Compensation Routes
 * Kompenzacije (multilateralne)
 */

import { Router } from 'express';
import { CompensationController } from '../controllers/compensationController';
import { authMiddleware, requireRole } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// Get all compensations
router.get('/', CompensationController.getAll);

// Get open items for compensation
router.get('/open-items', CompensationController.getOpenItems);

// Get compensation by ID
router.get('/:id', CompensationController.getById);

// Create new compensation
router.post(
  '/',
  requireRole(['ADMIN', 'ACCOUNTANT']),
  CompensationController.create
);

// Sign compensation (partner confirmed)
router.post(
  '/:id/sign',
  requireRole(['ADMIN', 'ACCOUNTANT']),
  CompensationController.sign
);

// Cancel compensation
router.post(
  '/:id/cancel',
  requireRole(['ADMIN', 'ACCOUNTANT']),
  CompensationController.cancel
);

export default router;
