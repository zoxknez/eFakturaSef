import express from 'express';
import { SEFController } from '../controllers/sefController';
import { authMiddleware } from '../middleware/auth';
import { verifyWebhookSignature } from '../middleware/webhookVerification';
import { asyncHandler } from '../utils/asyncHandler';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: SEF
 *   description: SEF Integration endpoints
 */

/**
 * @swagger
 * /api/sef/send-invoice:
 *   post:
 *     summary: Send invoice to SEF
 *     tags: [SEF]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [invoiceId]
 *             properties:
 *               invoiceId:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       200:
 *         description: Invoice sent successfully
 *       400:
 *         description: Validation error or invoice already sent
 *       404:
 *         description: Invoice not found
 */
router.post(
  '/send-invoice',
  authMiddleware,
  asyncHandler(SEFController.sendInvoice)
);

/**
 * @swagger
 * /api/sef/status/{id}:
 *   get:
 *     summary: Check invoice status on SEF
 *     tags: [SEF]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Invoice ID
 *     responses:
 *       200:
 *         description: Status retrieved successfully
 *       404:
 *         description: Invoice not found
 */
router.get(
  '/status/:id',
  authMiddleware,
  asyncHandler(SEFController.checkStatus)
);

/**
 * @swagger
 * /api/sef/cancel:
 *   post:
 *     summary: Cancel invoice on SEF
 *     tags: [SEF]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [invoiceId]
 *             properties:
 *               invoiceId:
 *                 type: string
 *                 format: uuid
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Invoice cancelled successfully
 *       400:
 *         description: Validation error
 */
router.post(
  '/cancel',
  authMiddleware,
  asyncHandler(SEFController.cancelInvoice)
);

/**
 * @swagger
 * /api/sef/incoming:
 *   get:
 *     summary: Sync incoming invoices (Purchase Invoices)
 *     tags: [SEF]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: dateFrom
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: dateTo
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Invoices retrieved successfully
 */
router.get(
  '/incoming',
  authMiddleware,
  asyncHandler(SEFController.syncIncomingInvoices)
);

/**
 * @swagger
 * /api/sef/webhook:
 *   post:
 *     summary: Handle SEF webhook
 *     tags: [SEF]
 *     responses:
 *       200:
 *         description: Webhook received
 */
router.post(
  '/webhook',
  verifyWebhookSignature,
  asyncHandler(SEFController.handleWebhook)
);

export default router;
