/**
 * Audit Logs Routes
 */

import { Router } from 'express';
import {
  getAuditLogs,
  getAuditLog,
  getAuditLogStats,
  exportAuditLogs
} from '../controllers/auditLogController';
import { requireRole } from '../middleware/auth';

const router = Router();

// All audit log routes require ADMIN or AUDITOR role
router.use(requireRole(['ADMIN', 'AUDITOR']));

// Get audit logs with pagination and filtering
router.get('/', getAuditLogs);

// Get audit log statistics
router.get('/stats', getAuditLogStats);

// Export audit logs as CSV
router.get('/export', exportAuditLogs);

// Get single audit log
router.get('/:id', getAuditLog);

export default router;
