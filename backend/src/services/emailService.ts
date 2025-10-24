// Email notification service
import nodemailer, { Transporter } from 'nodemailer';
import handlebars from 'handlebars';
import { readFileSync } from 'fs';
import { join } from 'path';
import { config } from '../config';
import { logger } from '../utils/logger';

let transporter: Transporter | null = null;

/**
 * Initialize email transporter
 */
export function initEmailService(): void {
  if (!config.SMTP_HOST || !config.SMTP_USER) {
    logger.warn('SMTP not configured, email notifications disabled');
    return;
  }

  transporter = nodemailer.createTransport({
    host: config.SMTP_HOST,
    port: config.SMTP_PORT,
    secure: config.SMTP_PORT === 465,
    auth: {
      user: config.SMTP_USER,
      pass: config.SMTP_PASS,
    },
  });

  logger.info('✅ Email service initialized');
}

/**
 * Load and compile email template
 */
function loadTemplate(templateName: string, data: any): string {
  try {
    const templatePath = join(__dirname, '../templates/emails', `${templateName}.hbs`);
    const templateSource = readFileSync(templatePath, 'utf-8');
    const template = handlebars.compile(templateSource);
    return template(data);
  } catch (error: any) {
    logger.error(`Failed to load email template: ${templateName}`, {
      error: error.message,
    });
    // Fallback to plain text
    return JSON.stringify(data, null, 2);
  }
}

/**
 * Send email
 */
export async function sendEmail(options: {
  to: string | string[];
  subject: string;
  template: string;
  data: any;
}): Promise<boolean> {
  if (!transporter) {
    logger.warn('Email service not initialized, cannot send email');
    return false;
  }

  try {
    const html = loadTemplate(options.template, options.data);

    const info = await transporter.sendMail({
      from: config.FROM_EMAIL,
      to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
      subject: options.subject,
      html,
    });

    logger.info('Email sent successfully', {
      messageId: info.messageId,
      to: options.to,
      subject: options.subject,
      template: options.template,
    });

    return true;
  } catch (error: any) {
    logger.error('Failed to send email', {
      error: error.message,
      to: options.to,
      subject: options.subject,
    });
    return false;
  }
}

/**
 * Email templates
 */
export const emailTemplates = {
  /**
   * Invoice sent notification
   */
  async invoiceSent(to: string, data: {
    invoiceNumber: string;
    buyerName: string;
    totalAmount: number;
    currency: string;
    sefId: string;
  }): Promise<boolean> {
    return sendEmail({
      to,
      subject: `Faktura ${data.invoiceNumber} uspešno poslata`,
      template: 'invoice-sent',
      data,
    });
  },

  /**
   * Invoice accepted notification
   */
  async invoiceAccepted(to: string, data: {
    invoiceNumber: string;
    buyerName: string;
    totalAmount: number;
    currency: string;
  }): Promise<boolean> {
    return sendEmail({
      to,
      subject: `Faktura ${data.invoiceNumber} prihvaćena`,
      template: 'invoice-accepted',
      data,
    });
  },

  /**
   * Invoice rejected notification
   */
  async invoiceRejected(to: string, data: {
    invoiceNumber: string;
    buyerName: string;
    reason?: string;
  }): Promise<boolean> {
    return sendEmail({
      to,
      subject: `Faktura ${data.invoiceNumber} odbijena`,
      template: 'invoice-rejected',
      data,
    });
  },

  /**
   * Invoice failed notification
   */
  async invoiceFailed(to: string, data: {
    invoiceNumber: string;
    error: string;
  }): Promise<boolean> {
    return sendEmail({
      to,
      subject: `Greška pri slanju fakture ${data.invoiceNumber}`,
      template: 'invoice-failed',
      data,
    });
  },

  /**
   * Daily summary notification
   */
  async dailySummary(to: string, data: {
    date: string;
    invoicesCreated: number;
    invoicesSent: number;
    invoicesAccepted: number;
    totalRevenue: number;
    currency: string;
  }): Promise<boolean> {
    return sendEmail({
      to,
      subject: `Dnevni izveštaj - ${data.date}`,
      template: 'daily-summary',
      data,
    });
  },

  /**
   * Welcome email for new users
   */
  async welcome(to: string, data: {
    firstName: string;
    companyName: string;
  }): Promise<boolean> {
    return sendEmail({
      to,
      subject: 'Dobrodošli u SEF eFakture',
      template: 'welcome',
      data,
    });
  },
};

export default {
  init: initEmailService,
  sendEmail,
  templates: emailTemplates,
};

