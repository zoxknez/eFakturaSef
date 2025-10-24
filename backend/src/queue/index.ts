// Queue exports and initialization
export { invoiceQueue, queueInvoice, closeInvoiceQueue } from './invoiceQueue';
export { webhookQueue, queueWebhook, closeWebhookQueue } from './webhookQueue';
export type { InvoiceJobData } from './invoiceQueue';
export type { WebhookJobData } from './webhookQueue';

// Graceful shutdown handler
export const closeAllQueues = async (): Promise<void> => {
  const { closeInvoiceQueue } = await import('./invoiceQueue');
  const { closeWebhookQueue } = await import('./webhookQueue');
  
  await Promise.all([
    closeInvoiceQueue(),
    closeWebhookQueue(),
  ]);
};

