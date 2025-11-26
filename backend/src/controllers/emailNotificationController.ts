/**
 * Email Notification Controller
 * Handles email sending and template management
 */

import { Request, Response } from 'express';
import { prisma } from '../db/prisma';
import { EmailNotificationService } from '../services/emailNotificationService';
import logger from '../utils/logger';

/**
 * Get email templates for company
 */
export const getTemplates = async (req: Request, res: Response) => {
  try {
    const { companyId } = req.params;

    const templates = await prisma.emailTemplate.findMany({
      where: {
        OR: [
          { companyId },
          { companyId: null, isDefault: true },
        ],
      },
      orderBy: [
        { companyId: 'desc' },
        { type: 'asc' },
      ],
    });

    res.json({
      success: true,
      data: templates,
    });
  } catch (error: unknown) {
    logger.error('Error fetching email templates', { error });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch templates',
    });
  }
};

/**
 * Get single template
 */
export const getTemplate = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const template = await prisma.emailTemplate.findUnique({
      where: { id },
    });

    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Template not found',
      });
    }

    res.json({
      success: true,
      data: template,
    });
  } catch (error: unknown) {
    logger.error('Error fetching email template', { error });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch template',
    });
  }
};

/**
 * Create email template
 */
export const createTemplate = async (req: Request, res: Response) => {
  try {
    const { companyId } = req.params;
    const { type, name, subject, bodyHtml, bodyText } = req.body;

    const template = await prisma.emailTemplate.create({
      data: {
        companyId,
        type,
        name,
        subject,
        bodyHtml,
        bodyText,
      },
    });

    logger.info('Email template created', { templateId: template.id, type });

    res.status(201).json({
      success: true,
      data: template,
    });
  } catch (error: unknown) {
    logger.error('Error creating email template', { error });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create template',
    });
  }
};

/**
 * Update email template
 */
export const updateTemplate = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, subject, bodyHtml, bodyText, isActive } = req.body;

    const template = await prisma.emailTemplate.update({
      where: { id },
      data: {
        name,
        subject,
        bodyHtml,
        bodyText,
        isActive,
      },
    });

    logger.info('Email template updated', { templateId: id });

    res.json({
      success: true,
      data: template,
    });
  } catch (error: unknown) {
    logger.error('Error updating email template', { error });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update template',
    });
  }
};

/**
 * Delete email template
 */
export const deleteTemplate = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.emailTemplate.delete({
      where: { id },
    });

    logger.info('Email template deleted', { templateId: id });

    res.json({
      success: true,
      message: 'Template deleted successfully',
    });
  } catch (error: unknown) {
    logger.error('Error deleting email template', { error });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete template',
    });
  }
};

/**
 * Send invoice email notification
 */
export const sendInvoice = async (req: Request, res: Response) => {
  try {
    const { companyId, invoiceId } = req.params;

    const result = await EmailNotificationService.sendInvoiceNotification(companyId, invoiceId);

    res.json({
      success: true,
      data: result,
    });
  } catch (error: unknown) {
    logger.error('Error sending invoice email', { error });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send invoice email',
    });
  }
};

/**
 * Send payment reminder
 */
export const sendReminder = async (req: Request, res: Response) => {
  try {
    const { companyId, invoiceId } = req.params;

    const result = await EmailNotificationService.sendPaymentReminder(companyId, invoiceId);

    res.json({
      success: true,
      data: result,
    });
  } catch (error: unknown) {
    logger.error('Error sending payment reminder', { error });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send reminder',
    });
  }
};

/**
 * Send bulk payment reminders
 */
export const sendBulkReminders = async (req: Request, res: Response) => {
  try {
    const { companyId } = req.params;
    const { daysOverdueThreshold = 7 } = req.body;

    const results = await EmailNotificationService.sendBulkReminders(
      companyId,
      daysOverdueThreshold
    );

    res.json({
      success: true,
      data: {
        total: results.length,
        sent: results.filter((r) => r.status === 'sent').length,
        failed: results.filter((r) => r.status === 'failed').length,
        skipped: results.filter((r) => r.status === 'skipped').length,
        details: results,
      },
    });
  } catch (error: unknown) {
    logger.error('Error sending bulk reminders', { error });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send bulk reminders',
    });
  }
};

/**
 * Send IOS email
 */
export const sendIOS = async (req: Request, res: Response) => {
  try {
    const { companyId, iosId } = req.params;

    const result = await EmailNotificationService.sendIOSRequest(companyId, iosId);

    res.json({
      success: true,
      data: result,
    });
  } catch (error: unknown) {
    logger.error('Error sending IOS email', { error });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send IOS email',
    });
  }
};

/**
 * Get email logs
 */
export const getLogs = async (req: Request, res: Response) => {
  try {
    const { companyId } = req.params;
    const { status, referenceType, fromDate, toDate, page, limit } = req.query;

    const result = await EmailNotificationService.getEmailLogs(companyId, {
      status: status as string,
      referenceType: referenceType as string,
      fromDate: fromDate ? new Date(fromDate as string) : undefined,
      toDate: toDate ? new Date(toDate as string) : undefined,
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
    });

    res.json({
      success: true,
      ...result,
    });
  } catch (error: unknown) {
    logger.error('Error fetching email logs', { error });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch email logs',
    });
  }
};

/**
 * Get single email log
 */
export const getLog = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const log = await prisma.emailLog.findUnique({
      where: { id },
    });

    if (!log) {
      return res.status(404).json({
        success: false,
        error: 'Email log not found',
      });
    }

    res.json({
      success: true,
      data: log,
    });
  } catch (error: unknown) {
    logger.error('Error fetching email log', { error });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch email log',
    });
  }
};

/**
 * Resend failed email
 */
export const resendEmail = async (req: Request, res: Response) => {
  try {
    const { companyId, logId } = req.params;

    const log = await prisma.emailLog.findUnique({
      where: { id: logId },
    });

    if (!log) {
      return res.status(404).json({
        success: false,
        error: 'Email log not found',
      });
    }

    // Resend based on reference type
    let result;
    if (log.referenceType === 'invoice' && log.referenceId) {
      result = await EmailNotificationService.sendInvoiceNotification(companyId, log.referenceId);
    } else if (log.referenceType === 'payment_reminder' && log.referenceId) {
      result = await EmailNotificationService.sendPaymentReminder(companyId, log.referenceId);
    } else if (log.referenceType === 'ios' && log.referenceId) {
      result = await EmailNotificationService.sendIOSRequest(companyId, log.referenceId);
    } else {
      return res.status(400).json({
        success: false,
        error: 'Cannot resend this email type',
      });
    }

    res.json({
      success: true,
      data: result,
    });
  } catch (error: unknown) {
    logger.error('Error resending email', { error });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to resend email',
    });
  }
};
