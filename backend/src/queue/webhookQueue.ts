// Webhook processing queue
import Bull, { Job, Queue } from 'bull';
import { redisConfig, defaultJobOptions } from './config';
import { prisma } from '../db/prisma';
import logger from '../utils/logger';

export interface WebhookJobData {
  webhookId: string;
  eventType: string;
  sefId: string;
  payload: any;
}

// Create webhook queue
export const webhookQueue: Queue<WebhookJobData> = new Bull('webhook-processing', {
  redis: redisConfig,
  defaultJobOptions: {
    ...defaultJobOptions,
    attempts: 5, // More retries for webhooks
  },
});

// Process webhook jobs
webhookQueue.process(async (job: Job<WebhookJobData>) => {
  const { webhookId, eventType, sefId, payload } = job.data;
  
  logger.info(`Processing webhook job`, {
    jobId: job.id,
    webhookId,
    eventType,
    sefId,
    attempt: job.attemptsMade + 1,
  });

  try {
    // Find invoice by SEF ID
    const invoice = await prisma.invoice.findUnique({
      where: { sefId },
      include: { company: true },
    });

    if (!invoice) {
      logger.warn(`Invoice not found for SEF ID: ${sefId}`);
      // Mark webhook as processed even if invoice not found
      await prisma.sEFWebhookLog.update({
        where: { id: webhookId },
        data: {
          processed: true,
          error: `Invoice not found for SEF ID: ${sefId}`,
        },
      });
      return { success: false, reason: 'Invoice not found' };
    }

    // Process based on event type
    let newStatus: string | null = null;
    
    switch (eventType) {
      case 'invoice.delivered':
        newStatus = 'DELIVERED';
        break;
      case 'invoice.accepted':
        newStatus = 'ACCEPTED';
        break;
      case 'invoice.rejected':
        newStatus = 'REJECTED';
        break;
      case 'invoice.cancelled':
        newStatus = 'CANCELLED';
        break;
      case 'invoice.expired':
        newStatus = 'EXPIRED';
        break;
      default:
        logger.warn(`Unknown webhook event type: ${eventType}`);
    }

    if (newStatus) {
      // Update invoice status
      await prisma.invoice.update({
        where: { id: invoice.id },
        data: {
          status: newStatus as any,
          sefStatus: payload.status || newStatus,
        },
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          entityType: 'invoice',
          entityId: invoice.id,
          action: `webhook_${eventType}`,
          newData: {
            status: newStatus,
            sefStatus: payload.status,
            webhookPayload: payload,
          },
        },
      });

      logger.info(`Invoice status updated via webhook`, {
        invoiceId: invoice.id,
        sefId,
        oldStatus: invoice.status,
        newStatus,
        eventType,
      });
    }

    // Mark webhook as processed
    await prisma.sEFWebhookLog.update({
      where: { id: webhookId },
      data: { processed: true },
    });

    return {
      success: true,
      invoiceId: invoice.id,
      sefId,
      eventType,
      newStatus,
    };
  } catch (error: any) {
    logger.error(`Failed to process webhook ${webhookId}`, {
      error: error.message,
      stack: error.stack,
      attempt: job.attemptsMade + 1,
    });

    // Update webhook log with error
    await prisma.sEFWebhookLog.update({
      where: { id: webhookId },
      data: {
        error: error.message,
      },
    });

    throw error; // Re-throw to trigger Bull retry mechanism
  }
});

// Queue event handlers
webhookQueue.on('completed', (job: Job, result: any) => {
  logger.info(`Webhook job completed`, {
    jobId: job.id,
    webhookId: job.data.webhookId,
    result,
  });
});

webhookQueue.on('failed', (job: Job, error: Error) => {
  logger.error(`Webhook job failed`, {
    jobId: job.id,
    webhookId: job.data.webhookId,
    error: error.message,
    attempts: job.attemptsMade,
  });
});

webhookQueue.on('stalled', (job: Job) => {
  logger.warn(`Webhook job stalled`, {
    jobId: job.id,
    webhookId: job.data.webhookId,
  });
});

// Helper function to add webhook to queue
export const queueWebhook = async (data: WebhookJobData): Promise<Bull.Job<WebhookJobData>> => {
  const job = await webhookQueue.add(data, {
    ...defaultJobOptions,
    jobId: `webhook-${data.webhookId}-${Date.now()}`, // Unique job ID
  });

  logger.info(`Webhook queued for processing`, {
    jobId: job.id,
    webhookId: data.webhookId,
    eventType: data.eventType,
  });

  return job;
};

// Graceful shutdown
export const closeWebhookQueue = async (): Promise<void> => {
  await webhookQueue.close();
  logger.info('Webhook queue closed');
};

