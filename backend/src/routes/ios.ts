/**
 * IOS Routes
 * IOS - Izvod Otvorenih Stavki
 */

import { Router } from 'express';
import { IOSController } from '../controllers/iosController';
import { authMiddleware, requireRole } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// Get all IOS reports
router.get('/', IOSController.getAll);

// Get partner balances
router.get('/balances', IOSController.getPartnerBalances);

// Get IOS by ID
router.get('/:id', IOSController.getById);

// Generate IOS for partner
router.post(
  '/generate',
  requireRole(['ADMIN', 'ACCOUNTANT']),
  IOSController.generate
);

// Send IOS to partner
router.post(
  '/:id/send',
  requireRole(['ADMIN', 'ACCOUNTANT']),
  IOSController.send
);

// Partner confirmed IOS
router.post(
  '/:id/confirm',
  requireRole(['ADMIN', 'ACCOUNTANT']),
  IOSController.confirm
);

// Partner disputed IOS
router.post(
  '/:id/dispute',
  requireRole(['ADMIN', 'ACCOUNTANT']),
  IOSController.dispute
);

export default router;
