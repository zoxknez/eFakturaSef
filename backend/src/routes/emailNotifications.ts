/**
 * Email Notification Routes
 * Email šabloni i slanje
 */

import { Router } from 'express';
import * as emailNotificationController from '../controllers/emailNotificationController';
import { authMiddleware, requireRole } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// ========================================
// EMAIL TEMPLATES
// ========================================

// Get all templates for company
router.get(
  '/companies/:companyId/templates',
  emailNotificationController.getTemplates
);

// Get single template
router.get(
  '/templates/:id',
  emailNotificationController.getTemplate
);

// Create template
router.post(
  '/companies/:companyId/templates',
  requireRole(['ADMIN']),
  emailNotificationController.createTemplate
);

// Update template
router.put(
  '/templates/:id',
  requireRole(['ADMIN']),
  emailNotificationController.updateTemplate
);

// Delete template
router.delete(
  '/templates/:id',
  requireRole(['ADMIN']),
  emailNotificationController.deleteTemplate
);

// ========================================
// EMAIL SENDING
// ========================================

// Send invoice via email
router.post(
  '/companies/:companyId/invoices/:invoiceId/send',
  requireRole(['ADMIN', 'ACCOUNTANT']),
  emailNotificationController.sendInvoice
);

// Send payment reminder
router.post(
  '/companies/:companyId/invoices/:invoiceId/reminder',
  requireRole(['ADMIN', 'ACCOUNTANT']),
  emailNotificationController.sendReminder
);

// Send bulk payment reminders
router.post(
  '/companies/:companyId/reminders/bulk',
  requireRole(['ADMIN', 'ACCOUNTANT']),
  emailNotificationController.sendBulkReminders
);

// Send IOS email
router.post(
  '/companies/:companyId/ios/:iosId/send',
  requireRole(['ADMIN', 'ACCOUNTANT']),
  emailNotificationController.sendIOS
);

// ========================================
// EMAIL LOGS
// ========================================

// Get email logs for company
router.get(
  '/companies/:companyId/logs',
  emailNotificationController.getLogs
);

// Get single email log
router.get(
  '/logs/:id',
  emailNotificationController.getLog
);

// Resend failed email
router.post(
  '/companies/:companyId/logs/:logId/resend',
  requireRole(['ADMIN', 'ACCOUNTANT']),
  emailNotificationController.resendEmail
);

export default router;
