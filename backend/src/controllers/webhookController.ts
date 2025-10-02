import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { SEFApiClient } from '../services/sefApiClient';
import crypto from 'crypto';

const prisma = new PrismaClient();

/**
 * Handle SEF webhook callbacks
 */
export const handleSEFWebhook = async (req: Request, res: Response): Promise<void> => {
  try {
    const signature = req.headers['x-sef-signature'] as string;
    const payload = JSON.stringify(req.body);

    // Verify webhook signature (if configured)
    const webhookSecret = process.env.SEF_WEBHOOK_SECRET;
    if (webhookSecret && signature) {
      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(payload)
        .digest('hex');
      
      if (signature !== `sha256=${expectedSignature}`) {
        console.warn('[SEF Webhook] Invalid signature');
        res.status(401).json({ error: 'Invalid signature' });
        return;
      }
    }

    const webhookData = req.body;
    
    // Log webhook receipt
    console.log(`[SEF Webhook] Received ${webhookData.eventType} for SEF ID: ${webhookData.sefId}`);

    // Store webhook log
    await prisma.sEFWebhookLog.create({
      data: {
        sefId: webhookData.sefId,
        eventType: webhookData.eventType,
        payload: JSON.stringify(webhookData),
        signature: signature || '',
        processed: false
      }
    });

    // Process webhook based on event type
    switch (webhookData.eventType) {
      case 'STATUS_CHANGE':
        await handleStatusChange(webhookData);
        break;
        
      case 'DELIVERY_CONFIRMATION':
        await handleDeliveryConfirmation(webhookData);
        break;
        
      case 'ACCEPTANCE':
        await handleInvoiceAcceptance(webhookData);
        break;
        
      case 'REJECTION':
        await handleInvoiceRejection(webhookData);
        break;
        
      case 'CANCELLATION':
        await handleInvoiceCancellation(webhookData);
        break;
        
      default:
        console.warn(`[SEF Webhook] Unknown event type: ${webhookData.eventType}`);
    }

    // Mark webhook as processed
    await prisma.sEFWebhookLog.updateMany({
      where: { 
        sefId: webhookData.sefId,
        eventType: webhookData.eventType,
        processed: false
      },
      data: { 
        processed: true,
        error: null
      }
    });

    res.status(200).json({ success: true });

  } catch (error) {
    console.error('[SEF Webhook] Processing error:', error);
    
    // Mark webhook as failed
    const webhookData = req.body;
    if (webhookData?.sefId) {
      await prisma.sEFWebhookLog.updateMany({
        where: { 
          sefId: webhookData.sefId,
          processed: false
        },
        data: { 
          processed: true,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      });
    }

    res.status(500).json({ error: 'Webhook processing failed' });
  }
};

/**
 * Handle invoice status change
 */
async function handleStatusChange(webhookData: any): Promise<void> {
  const { sefId, status, statusDate, data } = webhookData;

  await prisma.invoice.updateMany({
    where: { sefId },
    data: { 
      status: mapSEFStatusToInternal(status),
      updatedAt: new Date(statusDate)
    }
  });

  // Find the invoice for audit log
  const invoice = await prisma.invoice.findFirst({
    where: { sefId }
  });

  if (invoice) {
    await prisma.auditLog.create({
      data: {
        entityType: 'invoice',
        entityId: invoice.id,
        action: 'SEF_STATUS_CHANGE',
        newData: JSON.stringify({ status, statusDate, data }),
        userId: null // System action
      }
    });
  }
}

/**
 * Handle delivery confirmation
 */
async function handleDeliveryConfirmation(webhookData: any): Promise<void> {
  const { sefId, deliveryDate, buyerInfo } = webhookData;

  await prisma.invoice.updateMany({
    where: { sefId },
    data: { 
      status: 'DELIVERED',
      updatedAt: new Date(deliveryDate)
    }
  });

  const invoice = await prisma.invoice.findFirst({
    where: { sefId }
  });

  if (invoice) {
    await prisma.auditLog.create({
      data: {
        entityType: 'invoice',
        entityId: invoice.id,
        action: 'SEF_DELIVERY_CONFIRMED',
        newData: JSON.stringify({ deliveryDate, buyerInfo }),
        userId: null
      }
    });
  }
}

/**
 * Handle invoice acceptance
 */
async function handleInvoiceAcceptance(webhookData: any): Promise<void> {
  const { sefId, acceptanceDate, buyerInfo } = webhookData;

  await prisma.invoice.updateMany({
    where: { sefId },
    data: { 
      status: 'ACCEPTED',
      updatedAt: new Date(acceptanceDate)
    }
  });

  const invoice = await prisma.invoice.findFirst({
    where: { sefId }
  });

  if (invoice) {
    await prisma.auditLog.create({
      data: {
        entityType: 'invoice',
        entityId: invoice.id,
        action: 'SEF_INVOICE_ACCEPTED',
        newData: JSON.stringify({ acceptanceDate, buyerInfo }),
        userId: null
      }
    });
  }
}

/**
 * Handle invoice rejection
 */
async function handleInvoiceRejection(webhookData: any): Promise<void> {
  const { sefId, rejectionDate, rejectionReason, buyerInfo } = webhookData;

  await prisma.invoice.updateMany({
    where: { sefId },
    data: { 
      status: 'REJECTED',
      note: rejectionReason ? `Razlog odbacivanja: ${rejectionReason}` : undefined,
      updatedAt: new Date(rejectionDate)
    }
  });

  const invoice = await prisma.invoice.findFirst({
    where: { sefId }
  });

  if (invoice) {
    await prisma.auditLog.create({
      data: {
        entityType: 'invoice',
        entityId: invoice.id,
        action: 'SEF_INVOICE_REJECTED',
        newData: JSON.stringify({ rejectionDate, rejectionReason, buyerInfo }),
        userId: null
      }
    });
  }
}

/**
 * Handle invoice cancellation
 */
async function handleInvoiceCancellation(webhookData: any): Promise<void> {
  const { sefId, cancellationDate, cancellationReason } = webhookData;

  await prisma.invoice.updateMany({
    where: { sefId },
    data: { 
      status: 'CANCELLED',
      note: cancellationReason ? `Razlog otkazivanja: ${cancellationReason}` : undefined,
      updatedAt: new Date(cancellationDate)
    }
  });

  const invoice = await prisma.invoice.findFirst({
    where: { sefId }
  });

  if (invoice) {
    await prisma.auditLog.create({
      data: {
        entityType: 'invoice',
        entityId: invoice.id,
        action: 'SEF_INVOICE_CANCELLED',
        newData: JSON.stringify({ cancellationDate, cancellationReason }),
        userId: null
      }
    });
  }
}

/**
 * Map SEF status to internal status
 */
function mapSEFStatusToInternal(sefStatus: string): string {
  const statusMap: { [key: string]: string } = {
    'PENDING': 'SENT',
    'SENT': 'SENT',
    'DELIVERED': 'DELIVERED',
    'ACCEPTED': 'ACCEPTED',
    'REJECTED': 'REJECTED',
    'CANCELLED': 'CANCELLED',
    'EXPIRED': 'EXPIRED'
  };

  return statusMap[sefStatus] || sefStatus;
}

/**
 * Get webhook logs (for debugging)
 */
export const getWebhookLogs = async (req: Request, res: Response): Promise<void> => {
  try {
    const { page = '1', limit = '50', sefId, eventType } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (sefId) where.sefId = sefId;
    if (eventType) where.eventType = eventType;

    const [logs, total] = await Promise.all([
      prisma.sEFWebhookLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum
      }),
      prisma.sEFWebhookLog.count({ where })
    ]);

    res.json({
      success: true,
      data: {
        logs,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum)
        }
      }
    });

  } catch (error) {
    console.error('Get webhook logs error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Retry failed webhook processing
 */
export const retryWebhook = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const webhookLog = await prisma.sEFWebhookLog.findUnique({
      where: { id }
    });

    if (!webhookLog) {
      res.status(404).json({
        success: false,
        message: 'Webhook log not found'
      });
      return;
    }

    if (webhookLog.processed && !webhookLog.error) {
      res.status(400).json({
        success: false,
        message: 'Webhook already processed successfully'
      });
      return;
    }

    // Reset webhook status
    await prisma.sEFWebhookLog.update({
      where: { id },
      data: {
        processed: false,
        error: null
      }
    });

    // Re-process webhook
    const webhookData = JSON.parse(webhookLog.payload as string);
    await handleSEFWebhook({ body: webhookData, headers: {} } as any, res);

  } catch (error) {
    console.error('Retry webhook error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};