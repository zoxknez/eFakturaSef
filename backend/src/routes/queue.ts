import { Router } from 'express';
import { authMiddleware, requireRole } from '../middleware/auth';
import getQueues from '../queue';

const router = Router();
router.use(authMiddleware);

router.post('/send-invoice/:id', requireRole(['ADMIN','ACCOUNTANT']), async (req, res) => {
  const queues = getQueues();
  if (!queues.enabled || !queues.sendInvoiceQueue) {
    return res.status(503).json({ success: false, message: 'Queue not available' });
  }
  const job = await queues.sendInvoiceQueue.add({ invoiceId: req.params.id }, { attempts: 5, backoff: { type: 'exponential', delay: 2000 } });
  res.json({ success: true, data: { jobId: job.id } });
});

router.get('/metrics', requireRole(['ADMIN']), async (req, res) => {
  const queues = getQueues();
  if (!queues.enabled) return res.json({ success: true, data: { enabled: false } });

  const metrics: any = { enabled: true };
  if (queues.sendInvoiceQueue) {
    metrics.sendInvoice = {
      waiting: await queues.sendInvoiceQueue.getWaitingCount(),
      active: await queues.sendInvoiceQueue.getActiveCount(),
      delayed: await queues.sendInvoiceQueue.getDelayedCount(),
      failed: await queues.sendInvoiceQueue.getFailedCount(),
      completed: await queues.sendInvoiceQueue.getCompletedCount()
    };
  }
  if (queues.pollStatusQueue) {
    metrics.pollStatus = {
      waiting: await queues.pollStatusQueue.getWaitingCount(),
      active: await queues.pollStatusQueue.getActiveCount(),
      delayed: await queues.pollStatusQueue.getDelayedCount(),
      failed: await queues.pollStatusQueue.getFailedCount(),
      completed: await queues.pollStatusQueue.getCompletedCount()
    };
  }

  res.json({ success: true, data: metrics });
});

export default router;
