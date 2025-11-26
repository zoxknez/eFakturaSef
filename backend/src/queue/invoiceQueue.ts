// Invoice processing queue
import Bull, { Job, Queue } from 'bull';
import { redisConfig, defaultJobOptions, isNightPause, getNightPauseDelay } from './config';
import { prisma } from '../db/prisma';
import { SEFService, SEFValidationError, SEFNetworkError, SEFRateLimitError, SEFServerError } from '../services/sefService';
import UBLGenerator from '../services/ublGenerator';
import logger from '../utils/logger';
import { recordInvoiceSent, recordQueueJob } from '../utils/businessMetrics';

/**
 * Custom error classes for job processing
 */
export class RetryableError extends Error {
  constructor(message: string, public originalError?: any) {
    super(message);
    this.name = 'RetryableError';
  }
}

export class NonRetryableError extends Error {
  constructor(message: string, public originalError?: any) {
    super(message);
    this.name = 'NonRetryableError';
  }
}

export interface InvoiceJobData {
  invoiceId: string;
  companyId: string;
  userId?: string;
  retryCount?: number;
}

// Create invoice queue
export const invoiceQueue: Queue<InvoiceJobData> = new Bull('invoice-processing', {
  redis: redisConfig,
  defaultJobOptions,
});

// Process invoice jobs
invoiceQueue.process(async (job: Job<InvoiceJobData>) => {
  const { invoiceId, companyId, userId } = job.data;
  const startTime = Date.now();
  
  logger.info(`Processing invoice job`, {
    jobId: job.id,
    invoiceId,
    companyId,
    attempt: job.attemptsMade + 1,
  });

  try {
    // Check for night pause - throw custom error to re-queue with delay
    if (isNightPause()) {
      const delay = getNightPauseDelay();
      logger.info(`Night pause active, will re-queue invoice processing`, {
        invoiceId,
        delayMs: delay,
        resumeAt: new Date(Date.now() + delay).toISOString(),
      });
      
      // Re-add the job with delay instead of retrying immediately
      // Remove current job and add new one with delay
      await invoiceQueue.add(job.data, {
        ...defaultJobOptions,
        delay,
        jobId: `invoice-${invoiceId}-nightpause-${Date.now()}`,
        attempts: defaultJobOptions.attempts, // Reset attempts for fresh job
      });
      
      // Return success to mark current job as complete (new delayed job created)
      return {
        success: false,
        rescheduled: true,
        invoiceId,
        reason: 'Night pause active (01:00-06:00)',
        resumeAt: new Date(Date.now() + delay).toISOString(),
      };
    }

    // Fetch invoice with relations
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        company: true,
        lines: true,
      },
    });

    if (!invoice) {
      throw new Error(`Invoice not found: ${invoiceId}`);
    }

    if (!invoice.company.sefApiKey) {
      throw new Error(`Company ${companyId} has no SEF API key configured`);
    }

    // Generate UBL XML
    logger.info(`Generating UBL XML for invoice ${invoiceId}`);
    
    // Calculate net amount (total - tax) - Prisma Decimal has toNumber() method
    const netAmount = Number(invoice.totalAmount) - Number(invoice.taxAmount);
    
    // Prepare UBL invoice data
    const ublData = {
      invoiceNumber: invoice.invoiceNumber,
      issueDate: invoice.issueDate,
      dueDate: invoice.dueDate || undefined,
      currency: invoice.currency,
      supplier: {
        name: invoice.company.name,
        pib: invoice.company.pib,
        address: invoice.company.address,
        city: invoice.company.city,
        postalCode: invoice.company.postalCode,
        country: invoice.company.country || 'RS',
      },
      buyer: {
        name: invoice.buyerName || 'N/A',
        pib: invoice.buyerPIB || '',
        address: invoice.buyerAddress || '',
        city: invoice.buyerCity || '',
        postalCode: invoice.buyerPostalCode || '',
        country: 'RS', // Default to Serbia
      },
      lines: invoice.lines.map((line, index) => ({
        id: index + 1,
        name: line.itemName,
        quantity: Number(line.quantity),
        unitPrice: Number(line.unitPrice),
        unitCode: 'H87', // Default unit code
        taxRate: Number(line.taxRate),
        taxAmount: Number(line.amount) * (Number(line.taxRate) / 100),
        lineAmount: Number(line.amount),
      })),
      totals: {
        taxExclusiveAmount: netAmount,
        taxAmount: Number(invoice.taxAmount),
        taxInclusiveAmount: Number(invoice.totalAmount),
        payableAmount: Number(invoice.totalAmount),
      },
    };
    
    const ublXml = UBLGenerator.generateInvoiceXML(ublData);

    // Send to SEF
    logger.info(`Sending invoice ${invoiceId} to SEF`);
    
    const sefService = new SEFService({
      apiKey: invoice.company.sefApiKey,
      baseUrl: invoice.company.sefEnvironment === 'production' 
        ? 'https://efaktura.mfin.gov.rs' 
        : 'https://demoefaktura.mfin.gov.rs'
    });

    const sefResponse = await sefService.sendInvoice(ublXml);

    // Update invoice status
    await prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        sefId: sefResponse.invoiceId,
        sefStatus: sefResponse.status,
        status: 'SENT',
        sentAt: new Date(),
        ublXml,
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        entityType: 'invoice',
        entityId: invoiceId,
        action: 'sent',
        newData: {
          sefId: sefResponse.invoiceId,
          sefStatus: sefResponse.status,
        },
        userId,
      },
    });

    logger.info(`Invoice ${invoiceId} sent successfully`, {
      sefId: sefResponse.invoiceId,
      status: sefResponse.status,
    });

    // Record success metrics
    const duration = (Date.now() - startTime) / 1000;
    const environment = (invoice.company.sefEnvironment as 'demo' | 'production') || 'demo';
    recordInvoiceSent('success', environment, invoice.companyId, duration);
    recordQueueJob('invoice_queue', 'send_invoice', 'completed', duration);

    return {
      success: true,
      invoiceId,
      sefId: sefResponse.invoiceId,
      status: sefResponse.status,
    };
  } catch (error: any) {
    logger.error(`Failed to process invoice ${invoiceId}`, {
      error: error.message,
      errorName: error.name,
      stack: error.stack,
      attempt: job.attemptsMade + 1,
    });

    // Record failure metrics
    const duration = (Date.now() - startTime) / 1000;
    const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId }, include: { company: true } });
    if (invoice) {
      const environment = (invoice.company.sefEnvironment as 'demo' | 'production') || 'demo';
      recordInvoiceSent('failure', environment, invoice.companyId, duration);
    }
    recordQueueJob('invoice_queue', 'send_invoice', 'failed', duration, error.name);

    // Categorize errors and decide on retry strategy
    let shouldRetry = false;
    let errorNote = `Failed: ${error.message}`;

    // Network errors or server errors -> RETRY
    if (error instanceof SEFNetworkError || error instanceof SEFServerError) {
      logger.warn(`Network/Server error, will retry`, {
        invoiceId,
        errorType: error.name,
      });
      shouldRetry = true;
      errorNote = `Temporary error: ${error.message}. Will retry.`;
    }
    
    // Rate limit errors -> RETRY with delay
    else if (error instanceof SEFRateLimitError) {
      logger.warn(`Rate limited, will retry after delay`, {
        invoiceId,
        retryAfter: error.retryAfter,
      });
      shouldRetry = true;
      errorNote = `Rate limited. Will retry after ${error.retryAfter}s`;
      
      // Note: Bull will automatically use exponential backoff for retry
      // SEF rate limit info is logged for monitoring
    }
    
    // Validation errors -> DO NOT RETRY
    else if (error instanceof SEFValidationError) {
      logger.error(`Validation error, will NOT retry`, {
        invoiceId,
        sefResponse: error.sefResponse,
      });
      shouldRetry = false;
      errorNote = `Validation error: ${error.message}. Please fix the invoice data.`;
      
      // Update invoice status to DRAFT with error note
      await prisma.invoice.update({
        where: { id: invoiceId },
        data: {
          status: 'DRAFT',
          note: errorNote,
        },
      });
    }
    
    // Unknown errors -> DO NOT RETRY (safe default)
    else {
      logger.error(`Unknown error type, will NOT retry`, {
        invoiceId,
        errorType: error.constructor.name,
      });
      shouldRetry = false;
      errorNote = `Unexpected error: ${error.message}`;
      
      await prisma.invoice.update({
        where: { id: invoiceId },
        data: {
          status: 'DRAFT',
          note: errorNote,
        },
      });
    }

    // Throw appropriate error type for Bull
    if (shouldRetry) {
      throw new RetryableError(errorNote, error);
    } else {
      throw new NonRetryableError(errorNote, error);
    }
  }
});

// Queue event handlers
invoiceQueue.on('completed', (job: Job, result: any) => {
  logger.info(`Invoice job completed`, {
    jobId: job.id,
    invoiceId: job.data.invoiceId,
    result,
  });
});

invoiceQueue.on('failed', (job: Job, error: Error) => {
  logger.error(`Invoice job failed`, {
    jobId: job.id,
    invoiceId: job.data.invoiceId,
    error: error.message,
    attempts: job.attemptsMade,
  });
});

invoiceQueue.on('stalled', (job: Job) => {
  logger.warn(`Invoice job stalled`, {
    jobId: job.id,
    invoiceId: job.data.invoiceId,
  });
});

// Helper function to add invoice to queue
export const queueInvoice = async (data: InvoiceJobData): Promise<Bull.Job<InvoiceJobData>> => {
  // Check for night pause and delay if needed
  const delay = isNightPause() ? getNightPauseDelay() : 0;
  
  const job = await invoiceQueue.add(data, {
    ...defaultJobOptions,
    delay,
    jobId: `invoice-${data.invoiceId}-${Date.now()}`, // Unique job ID
  });

  logger.info(`Invoice queued for processing`, {
    jobId: job.id,
    invoiceId: data.invoiceId,
    delay,
  });

  return job;
};

// Graceful shutdown
export const closeInvoiceQueue = async (): Promise<void> => {
  await invoiceQueue.close();
  logger.info('Invoice queue closed');
};

