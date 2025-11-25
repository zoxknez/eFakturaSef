// Bulk operations routes
import express from 'express';
import { BulkController } from '../controllers/bulkController';
import { authMiddleware } from '../middleware/auth';
import { requireFeature } from '../config/featureFlags';

const router = express.Router();

// Apply auth middleware to all bulk routes
router.use(authMiddleware);

// Require bulk operations feature flag
router.use(requireFeature('enableBulkOperations'));

/**
 * POST /bulk/send
 * Bulk send invoices to SEF
 */
router.post('/send', BulkController.bulkSend);

/**
 * DELETE /bulk/delete
 * Bulk delete invoices (drafts only)
 */
router.delete('/delete', BulkController.bulkDelete);

/**
 * PATCH /bulk/status
 * Bulk update invoice status
 */
router.patch('/status', BulkController.bulkUpdateStatus);

/**
 * POST /bulk/export
 * Bulk export invoices
 */
router.post('/export', BulkController.bulkExport);

export default router;



