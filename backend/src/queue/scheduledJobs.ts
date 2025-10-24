// Scheduled jobs using node-cron
import cron from 'node-cron';
import { prisma } from '../db/prisma';
import { logger } from '../utils/logger';
import { invoiceQueue, InvoiceJobData } from './invoiceQueue';
import { webhookQueue, WebhookJobData } from './webhookQueue';
import { updateQueueSize } from '../middleware/metrics';
import { isNightPause } from './config';

/**
 * Retry failed jobs
 * Runs every 15 minutes
 */
export const retryFailedJobsSchedule = cron.schedule(
  '*/15 * * * *',
  async () => {
    try {
      logger.info('Running scheduled job: retry failed jobs');

      // Find failed jobs that can be retried
      const failedJobs = await prisma.jobQueue.findMany({
        where: {
          status: 'FAILED',
          attempts: {
            lt: prisma.jobQueue.fields.maxAttempts,
          },
        },
        take: 50, // Process max 50 at a time
      });

      logger.info(`Found ${failedJobs.length} failed jobs to retry`);

      for (const job of failedJobs) {
        // Don't retry during night pause
        if (isNightPause() && job.type === 'send_invoice') {
          continue;
        }

        try {
          // Re-queue the job based on type
          if (job.type === 'send_invoice') {
            await invoiceQueue.add(job.payload as unknown as InvoiceJobData, {
              jobId: `retry-${job.id}-${Date.now()}`,
            });
          } else if (job.type === 'webhook_process') {
            await webhookQueue.add(job.payload as unknown as WebhookJobData, {
              jobId: `retry-${job.id}-${Date.now()}`,
            });
          }

          // Update job status
          await prisma.jobQueue.update({
            where: { id: job.id },
            data: {
              status: 'PENDING',
              attempts: {
                increment: 1,
              },
            },
          });

          logger.info(`Retrying job ${job.id}`, { type: job.type });
        } catch (error: any) {
          logger.error(`Failed to retry job ${job.id}`, {
            error: error.message,
          });
        }
      }
    } catch (error: any) {
      logger.error('Failed to run retry failed jobs schedule', {
        error: error.message,
      });
    }
  },
  {
    scheduled: false, // Don't start automatically
  }
);

/**
 * Update queue metrics
 * Runs every minute
 */
export const updateQueueMetricsSchedule = cron.schedule(
  '* * * * *',
  async () => {
    try {
      const [invoiceCount, webhookCount] = await Promise.all([
        invoiceQueue.count(),
        webhookQueue.count(),
      ]);

      updateQueueSize('invoice', invoiceCount);
      updateQueueSize('webhook', webhookCount);

      logger.debug('Queue metrics updated', {
        invoiceQueue: invoiceCount,
        webhookQueue: webhookCount,
      });
    } catch (error: any) {
      logger.error('Failed to update queue metrics', {
        error: error.message,
      });
    }
  },
  {
    scheduled: false,
  }
);

/**
 * Cleanup old completed jobs
 * Runs daily at 3 AM
 */
export const cleanupOldJobsSchedule = cron.schedule(
  '0 3 * * *',
  async () => {
    try {
      logger.info('Running scheduled job: cleanup old jobs');

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Delete old completed jobs
      const deletedCompleted = await prisma.jobQueue.deleteMany({
        where: {
          status: 'COMPLETED',
          processedAt: {
            lt: thirtyDaysAgo,
          },
        },
      });

      // Delete old cancelled jobs
      const deletedCancelled = await prisma.jobQueue.deleteMany({
        where: {
          status: 'CANCELLED',
          updatedAt: {
            lt: thirtyDaysAgo,
          },
        },
      });

      logger.info('Cleanup completed', {
        completedDeleted: deletedCompleted.count,
        cancelledDeleted: deletedCancelled.count,
      });
    } catch (error: any) {
      logger.error('Failed to cleanup old jobs', {
        error: error.message,
      });
    }
  },
  {
    scheduled: false,
  }
);

/**
 * Move permanently failed jobs to dead letter queue
 * Runs every hour
 */
export const deadLetterQueueSchedule = cron.schedule(
  '0 * * * *',
  async () => {
    try {
      logger.info('Running scheduled job: process dead letter queue');

      // Find jobs that have exceeded max attempts
      const deadJobs = await prisma.jobQueue.findMany({
        where: {
          status: 'FAILED',
          attempts: {
            gte: prisma.jobQueue.fields.maxAttempts,
          },
        },
      });

      logger.info(`Found ${deadJobs.length} jobs for dead letter queue`);

      for (const job of deadJobs) {
        try {
          // Mark as cancelled (dead letter)
          await prisma.jobQueue.update({
            where: { id: job.id },
            data: {
              status: 'CANCELLED',
              error: `${job.error}\n\n[Dead Letter Queue] Max attempts (${job.maxAttempts}) exceeded`,
            },
          });

          logger.warn('Job moved to dead letter queue', {
            jobId: job.id,
            type: job.type,
            attempts: job.attempts,
          });

          // TODO: Send notification to admins about dead letter job
        } catch (error: any) {
          logger.error(`Failed to process dead letter job ${job.id}`, {
            error: error.message,
          });
        }
      }
    } catch (error: any) {
      logger.error('Failed to process dead letter queue', {
        error: error.message,
      });
    }
  },
  {
    scheduled: false,
  }
);

/**
 * Cleanup old webhook logs
 * Runs daily at 2 AM
 */
export const cleanupWebhookLogsSchedule = cron.schedule(
  '0 2 * * *',
  async () => {
    try {
      logger.info('Running scheduled job: cleanup old webhook logs');

      const sixtyDaysAgo = new Date();
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

      const deleted = await prisma.sEFWebhookLog.deleteMany({
        where: {
          processed: true,
          createdAt: {
            lt: sixtyDaysAgo,
          },
        },
      });

      logger.info('Webhook logs cleanup completed', {
        deleted: deleted.count,
      });
    } catch (error: any) {
      logger.error('Failed to cleanup webhook logs', {
        error: error.message,
      });
    }
  },
  {
    scheduled: false,
  }
);

/**
 * Start all scheduled jobs
 */
export function startScheduledJobs(): void {
  retryFailedJobsSchedule.start();
  updateQueueMetricsSchedule.start();
  cleanupOldJobsSchedule.start();
  deadLetterQueueSchedule.start();
  cleanupWebhookLogsSchedule.start();
  
  logger.info('✅ Scheduled jobs started', {
    jobs: [
      'retryFailedJobs (every 15 min)',
      'updateQueueMetrics (every 1 min)',
      'cleanupOldJobs (daily 3 AM)',
      'deadLetterQueue (hourly)',
      'cleanupWebhookLogs (daily 2 AM)',
    ],
  });
}

/**
 * Stop all scheduled jobs
 */
export function stopScheduledJobs(): void {
  retryFailedJobsSchedule.stop();
  updateQueueMetricsSchedule.stop();
  cleanupOldJobsSchedule.stop();
  deadLetterQueueSchedule.stop();
  cleanupWebhookLogsSchedule.stop();
  
  logger.info('Scheduled jobs stopped');
}

export default {
  start: startScheduledJobs,
  stop: stopScheduledJobs,
};

