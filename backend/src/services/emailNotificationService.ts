/**
 * Email Notification Service
 * Handles email sending for invoices, reminders, IOS, etc.
 */

import { prisma } from '../db/prisma';
import nodemailer from 'nodemailer';
import { config } from '../config';
import logger from '../utils/logger';

interface SendEmailData {
  to: string;
  toName?: string;
  subject: string;
  html: string;
  text?: string;
  referenceType?: string;
  referenceId?: string;
  templateId?: string;
}

interface EmailTemplateVariables {
  companyName?: string;
  companyPib?: string;
  partnerName?: string;
  partnerPib?: string;
  invoiceNumber?: string;
  invoiceDate?: string;
  dueDate?: string;
  amount?: string;
  currency?: string;
  balance?: string;
  [key: string]: string | undefined;
}

export class EmailNotificationService {
  private static transporter: nodemailer.Transporter | null = null;

  /**
   * Initialize email transporter
   */
  private static getTransporter(): nodemailer.Transporter {
    if (!this.transporter) {
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASSWORD,
        },
      });
    }
    return this.transporter;
  }

  /**
   * Send email
   */
  static async sendEmail(companyId: string, data: SendEmailData) {
    // Log email in database
    const emailLog = await prisma.emailLog.create({
      data: {
        companyId,
        toEmail: data.to,
        toName: data.toName,
        subject: data.subject,
        bodyHtml: data.html,
        templateId: data.templateId,
        referenceType: data.referenceType,
        referenceId: data.referenceId,
        status: 'PENDING',
      },
    });

    try {
      const transporter = this.getTransporter();

      const company = await prisma.company.findUnique({
        where: { id: companyId },
      });

      const result = await transporter.sendMail({
        from: `"${company?.name || 'eFaktura'}" <${process.env.SMTP_FROM || config.FROM_EMAIL}>`,
        to: data.to,
        subject: data.subject,
        html: data.html,
        text: data.text,
      });

      // Update email log
      await prisma.emailLog.update({
        where: { id: emailLog.id },
        data: {
          status: 'SENT',
          sentAt: new Date(),
        },
      });

      logger.info(`Email sent successfully`, {
        emailLogId: emailLog.id,
        to: data.to,
        subject: data.subject,
        messageId: result.messageId,
      });

      return { success: true, emailLogId: emailLog.id, messageId: result.messageId };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Update email log with error
      await prisma.emailLog.update({
        where: { id: emailLog.id },
        data: {
          status: 'FAILED',
          errorMessage,
        },
      });

      logger.error(`Failed to send email`, {
        emailLogId: emailLog.id,
        to: data.to,
        error: errorMessage,
      });

      throw error;
    }
  }

  /**
   * Get or create default template
   */
  static async getTemplate(companyId: string, type: string) {
    // First try company-specific template
    let template = await prisma.emailTemplate.findFirst({
      where: { companyId, type: type as any, isActive: true },
    });

    // Fall back to system template
    if (!template) {
      template = await prisma.emailTemplate.findFirst({
        where: { companyId: null, type: type as any, isActive: true, isDefault: true },
      });
    }

    return template;
  }

  /**
   * Render template with variables
   */
  static renderTemplate(template: string, variables: EmailTemplateVariables): string {
    let rendered = template;
    
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`\\{${key}\\}`, 'g');
      rendered = rendered.replace(regex, value || '');
    }

    return rendered;
  }

  /**
   * Send invoice notification
   */
  static async sendInvoiceNotification(companyId: string, invoiceId: string) {
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        company: true,
        partner: true,
      },
    });

    if (!invoice || !invoice.partner?.email) {
      throw new Error('Invoice or partner email not found');
    }

    const template = await this.getTemplate(companyId, 'INVOICE_SENT');
    
    const variables: EmailTemplateVariables = {
      companyName: invoice.company.name,
      companyPib: invoice.company.pib,
      partnerName: invoice.partner.name,
      invoiceNumber: invoice.invoiceNumber,
      invoiceDate: invoice.issueDate.toLocaleDateString('sr-Latn-RS'),
      dueDate: invoice.dueDate?.toLocaleDateString('sr-Latn-RS') || '',
      amount: Number(invoice.totalAmount).toLocaleString('sr-RS', {
        style: 'currency',
        currency: invoice.currency,
      }),
      currency: invoice.currency,
    };

    const subject = template
      ? this.renderTemplate(template.subject, variables)
      : `Faktura ${invoice.invoiceNumber} - ${invoice.company.name}`;
    
    const html = template
      ? this.renderTemplate(template.bodyHtml, variables)
      : this.getDefaultInvoiceHtml(variables);

    return this.sendEmail(companyId, {
      to: invoice.partner.email,
      toName: invoice.partner.name,
      subject,
      html,
      referenceType: 'invoice',
      referenceId: invoiceId,
      templateId: template?.id,
    });
  }

  /**
   * Send payment reminder
   */
  static async sendPaymentReminder(companyId: string, invoiceId: string) {
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        company: true,
        partner: true,
      },
    });

    if (!invoice || !invoice.partner?.email) {
      throw new Error('Invoice or partner email not found');
    }

    const outstanding = Number(invoice.totalAmount) - Number(invoice.paidAmount);
    const daysOverdue = invoice.dueDate
      ? Math.floor((Date.now() - invoice.dueDate.getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    const templateType = daysOverdue > 0 ? 'PAYMENT_OVERDUE' : 'PAYMENT_REMINDER';
    const template = await this.getTemplate(companyId, templateType);

    const variables: EmailTemplateVariables = {
      companyName: invoice.company.name,
      partnerName: invoice.partner.name,
      invoiceNumber: invoice.invoiceNumber,
      invoiceDate: invoice.issueDate.toLocaleDateString('sr-Latn-RS'),
      dueDate: invoice.dueDate?.toLocaleDateString('sr-Latn-RS') || '',
      amount: outstanding.toLocaleString('sr-RS', {
        style: 'currency',
        currency: invoice.currency,
      }),
      daysOverdue: daysOverdue.toString(),
    };

    const subject = template
      ? this.renderTemplate(template.subject, variables)
      : `Podsetnik za plaćanje - Faktura ${invoice.invoiceNumber}`;

    const html = template
      ? this.renderTemplate(template.bodyHtml, variables)
      : this.getDefaultReminderHtml(variables, daysOverdue);

    return this.sendEmail(companyId, {
      to: invoice.partner.email,
      toName: invoice.partner.name,
      subject,
      html,
      referenceType: 'payment_reminder',
      referenceId: invoiceId,
      templateId: template?.id,
    });
  }

  /**
   * Send IOS request
   */
  static async sendIOSRequest(companyId: string, iosId: string) {
    const ios = await prisma.iOSReport.findUnique({
      where: { id: iosId },
      include: {
        company: true,
        partner: true,
      },
    });

    if (!ios || !ios.partner?.email) {
      throw new Error('IOS or partner email not found');
    }

    const template = await this.getTemplate(companyId, 'IOS_REQUEST');

    const variables: EmailTemplateVariables = {
      companyName: ios.company.name,
      partnerName: ios.partner.name,
      iosNumber: ios.number,
      asOfDate: ios.asOfDate.toLocaleDateString('sr-Latn-RS'),
      balance: Number(ios.balance).toLocaleString('sr-RS', {
        style: 'currency',
        currency: 'RSD',
      }),
    };

    const subject = template
      ? this.renderTemplate(template.subject, variables)
      : `Izvod otvorenih stavki ${ios.number} - ${ios.company.name}`;

    const html = template
      ? this.renderTemplate(template.bodyHtml, variables)
      : this.getDefaultIOSHtml(variables);

    return this.sendEmail(companyId, {
      to: ios.partner.email,
      toName: ios.partner.name,
      subject,
      html,
      referenceType: 'ios',
      referenceId: iosId,
      templateId: template?.id,
    });
  }

  /**
   * Send bulk payment reminders for overdue invoices
   */
  static async sendBulkReminders(companyId: string, daysOverdueThreshold: number = 7) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOverdueThreshold);

    const overdueInvoices = await prisma.invoice.findMany({
      where: {
        companyId,
        type: 'OUTGOING',
        paymentStatus: { in: ['UNPAID', 'PARTIALLY_PAID', 'OVERDUE'] },
        dueDate: { lt: cutoffDate },
      },
      include: {
        partner: true,
      },
    });

    const results = [];

    for (const invoice of overdueInvoices) {
      if (invoice.partner?.email) {
        try {
          await this.sendPaymentReminder(companyId, invoice.id);
          results.push({ invoiceId: invoice.id, status: 'sent' });
        } catch (error) {
          results.push({ 
            invoiceId: invoice.id, 
            status: 'failed', 
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      } else {
        results.push({ invoiceId: invoice.id, status: 'skipped', reason: 'no_email' });
      }
    }

    logger.info(`Bulk reminders sent`, {
      companyId,
      total: overdueInvoices.length,
      sent: results.filter(r => r.status === 'sent').length,
      failed: results.filter(r => r.status === 'failed').length,
      skipped: results.filter(r => r.status === 'skipped').length,
    });

    return results;
  }

  /**
   * Get email logs
   */
  static async getEmailLogs(
    companyId: string,
    options?: {
      status?: string;
      referenceType?: string;
      fromDate?: Date;
      toDate?: Date;
      page?: number;
      limit?: number;
    }
  ) {
    const where: any = { companyId };

    if (options?.status) where.status = options.status;
    if (options?.referenceType) where.referenceType = options.referenceType;
    if (options?.fromDate || options?.toDate) {
      where.createdAt = {};
      if (options.fromDate) where.createdAt.gte = options.fromDate;
      if (options.toDate) where.createdAt.lte = options.toDate;
    }

    const page = options?.page || 1;
    const limit = options?.limit || 20;

    const [logs, total] = await Promise.all([
      prisma.emailLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.emailLog.count({ where }),
    ]);

    return {
      data: logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // Default HTML templates
  private static getDefaultInvoiceHtml(vars: EmailTemplateVariables): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Poštovani ${vars.partnerName},</h2>
        <p>U prilogu Vam dostavljamo fakturu:</p>
        <ul>
          <li><strong>Broj fakture:</strong> ${vars.invoiceNumber}</li>
          <li><strong>Datum:</strong> ${vars.invoiceDate}</li>
          <li><strong>Rok plaćanja:</strong> ${vars.dueDate}</li>
          <li><strong>Iznos:</strong> ${vars.amount}</li>
        </ul>
        <p>S poštovanjem,<br>${vars.companyName}</p>
      </div>
    `;
  }

  private static getDefaultReminderHtml(vars: EmailTemplateVariables, daysOverdue: number): string {
    const urgency = daysOverdue > 30 ? 'color: red;' : daysOverdue > 0 ? 'color: orange;' : '';
    
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="${urgency}">Podsetnik za plaćanje</h2>
        <p>Poštovani ${vars.partnerName},</p>
        <p>Podsećamo Vas da faktura ${vars.invoiceNumber} ${daysOverdue > 0 ? `kasni ${daysOverdue} dana` : 'dospeva uskoro'}.</p>
        <ul>
          <li><strong>Broj fakture:</strong> ${vars.invoiceNumber}</li>
          <li><strong>Rok plaćanja:</strong> ${vars.dueDate}</li>
          <li><strong>Preostali iznos:</strong> ${vars.amount}</li>
        </ul>
        <p>Molimo Vas da izvršite uplatu u najkraćem roku.</p>
        <p>S poštovanjem,<br>${vars.companyName}</p>
      </div>
    `;
  }

  private static getDefaultIOSHtml(vars: EmailTemplateVariables): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Izvod otvorenih stavki</h2>
        <p>Poštovani ${vars.partnerName},</p>
        <p>U prilogu Vam dostavljamo izvod otvorenih stavki na dan ${vars.asOfDate}.</p>
        <ul>
          <li><strong>Broj IOS:</strong> ${vars.iosNumber}</li>
          <li><strong>Saldo:</strong> ${vars.balance}</li>
        </ul>
        <p>Molimo Vas da potvrdite stanje ili nas obavestite o eventualnim razlikama.</p>
        <p>S poštovanjem,<br>${vars.companyName}</p>
      </div>
    `;
  }
}

export default EmailNotificationService;
