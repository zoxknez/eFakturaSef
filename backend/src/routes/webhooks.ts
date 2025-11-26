import express, { Request, Response } from 'express';
import { prisma } from '../db/prisma';
import { logger } from '../utils/logger';
import { queueWebhook } from '../queue/webhookQueue';
import { verifyWebhookSignature } from '../middleware/webhookVerification';
import { authMiddleware } from '../middleware/auth';

const router = express.Router();

/**
 * @openapi
 * /api/webhooks/webhook:
 *   post:
 *     summary: SEF webhook callback endpoint
 *     description: Receives invoice status updates from Serbian government SEF system. Webhook signature is verified for security.
 *     tags: [Webhooks]
 *     parameters:
 *       - in: header
 *         name: X-SEF-Signature
 *         required: true
 *         schema:
 *           type: string
 *         description: HMAC signature for webhook verification
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               event:
 *                 type: string
 *                 enum: [invoice.delivered, invoice.accepted, invoice.rejected, invoice.cancelled]
 *                 example: invoice.delivered
 *               sefId:
 *                 type: string
 *                 example: SEF-2024-12345
 *               status:
 *                 type: string
 *                 example: DELIVERED
 *               timestamp:
 *                 type: string
 *                 format: date-time
 *               metadata:
 *                 type: object
 *                 additionalProperties: true
 *     responses:
 *       200:
 *         description: Webhook received and queued for processing
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Webhook received and queued for processing
 *       401:
 *         description: Invalid webhook signature
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error: Invalid webhook signature
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post('/webhook', verifyWebhookSignature, async (req: Request, res: Response) => {
  try {
    const signatureHeader = req.get('X-SEF-Signature') ?? '';

    const eventType = req.body.event ?? req.body.eventType ?? 'unknown';
    const sefId = req.body.sefId ?? req.body.invoiceSefId ?? '';
    // const status = req.body.status as string | undefined;

    logger.info(`SEF Webhook received: ${eventType} for invoice ${sefId}`, req.body);

    // Log webhook event
    const webhookLog = await prisma.sEFWebhookLog.create({
      data: {
        eventType,
        sefId,
        payload: req.body,
        signature: signatureHeader || 'missing',
        processed: false,
      },
    });

    // Queue webhook for async processing
    if (sefId) {
      await queueWebhook({
        webhookId: webhookLog.id,
        eventType,
        sefId,
        payload: req.body,
      });
      
      logger.info(`Webhook queued for processing`, { 
        webhookId: webhookLog.id, 
        eventType, 
        sefId 
      });
    }

    // Respond immediately (webhook processed asynchronously)
    res.json({ success: true, message: 'Webhook received and queued for processing' });
  } catch (error: any) {
    logger.error('SEF webhook processing error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

/**
 * @openapi
 * /api/webhooks/logs:
 *   get:
 *     summary: Get webhook logs
 *     description: Retrieve paginated list of all webhook events received from SEF
 *     tags: [Webhooks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Items per page
 *     responses:
 *       200:
 *         description: Webhook logs retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 logs:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       eventType:
 *                         type: string
 *                       sefId:
 *                         type: string
 *                       payload:
 *                         type: object
 *                       signature:
 *                         type: string
 *                       processed:
 *                         type: boolean
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     pages:
 *                       type: integer
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get('/logs', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const [logs, total] = await Promise.all([
      prisma.sEFWebhookLog.findMany({
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
      }),
      prisma.sEFWebhookLog.count(),
    ]);

    res.json({
      logs,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error: any) {
    logger.error('Failed to get webhook logs:', error);
    res.status(500).json({ error: 'Failed to fetch webhook logs' });
  }
});

export default router;
