import express from 'express';
import { InvoiceController } from '../controllers/invoiceController';
import { idempotency } from '../middleware/idempotency';

const router = express.Router();

/**
 * @openapi
 * /api/invoices:
 *   get:
 *     summary: Get all invoices
 *     description: Retrieve a paginated list of invoices for the authenticated company
 *     tags:
 *       - Invoices
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of items per page
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [DRAFT, SENT, APPROVED, REJECTED]
 *         description: Filter by invoice status
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [OUTGOING, INCOMING]
 *         description: Filter by invoice type
 *     responses:
 *       200:
 *         description: List of invoices retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Invoice'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get('/', InvoiceController.getAll);

/**
 * @openapi
 * /api/invoices/{id}:
 *   get:
 *     summary: Get invoice by ID
 *     description: Retrieve a single invoice with all details including line items
 *     tags:
 *       - Invoices
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
 *         description: Invoice retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Invoice'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get('/:id', InvoiceController.getById);

/**
 * @openapi
 * /api/invoices:
 *   post:
 *     summary: Create new invoice
 *     description: Create a new invoice in DRAFT status
 *     tags:
 *       - Invoices
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/InvoiceCreate'
 *     responses:
 *       201:
 *         description: Invoice created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Invoice'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.post('/', InvoiceController.create);

/**
 * @openapi
 * /api/invoices/{id}:
 *   put:
 *     summary: Update invoice
 *     description: Update an existing invoice (only DRAFT invoices can be updated)
 *     tags:
 *       - Invoices
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/InvoiceUpdate'
 *     responses:
 *       200:
 *         description: Invoice updated successfully
 *       400:
 *         description: Cannot update non-DRAFT invoice
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.put('/:id', InvoiceController.update);

/**
 * @openapi
 * /api/invoices/{id}:
 *   delete:
 *     summary: Delete invoice
 *     description: Delete an invoice (only DRAFT invoices can be deleted)
 *     tags:
 *       - Invoices
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       204:
 *         description: Invoice deleted successfully
 *       400:
 *         description: Cannot delete non-DRAFT invoice
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.delete('/:id', InvoiceController.delete);

/**
 * @openapi
 * /api/invoices/{id}/send:
 *   post:
 *     summary: Send invoice to SEF
 *     description: |
 *       Submit invoice to Serbian SEF (Sistem Elektronskih Faktura) API.
 *       This operation is idempotent with 24-hour cache.
 *     tags:
 *       - Invoices
 *       - SEF Integration
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: header
 *         name: Idempotency-Key
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Unique key to prevent duplicate submissions (cached for 24 hours)
 *     responses:
 *       200:
 *         description: Invoice sent to SEF successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     sefId:
 *                       type: string
 *                       description: SEF system invoice ID
 *                     status:
 *                       type: string
 *                       description: Current status in SEF
 *                     jobId:
 *                       type: string
 *                       description: Queue job ID for tracking
 *       400:
 *         description: Validation error or invoice already sent
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       429:
 *         $ref: '#/components/responses/RateLimitError'
 */
router.post('/:id/send', idempotency({ ttl: 86400, required: true }), InvoiceController.sendToSEF);

/**
 * @openapi
 * /api/invoices/{id}/status:
 *   get:
 *     summary: Get invoice status from SEF
 *     description: Check current status of invoice in SEF system
 *     tags:
 *       - Invoices
 *       - SEF Integration
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     sefStatus:
 *                       type: string
 *                     lastChecked:
 *                       type: string
 *                       format: date-time
 *       404:
 *         description: Invoice not found or not sent to SEF
 */
router.get('/:id/status', InvoiceController.getStatus);

/**
 * @openapi
 * /api/invoices/{id}/cancel:
 *   post:
 *     summary: Cancel invoice in SEF
 *     description: |
 *       Cancel an invoice in SEF system.
 *       This operation is idempotent with 1-hour cache.
 *     tags:
 *       - Invoices
 *       - SEF Integration
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: header
 *         name: Idempotency-Key
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *                 description: Reason for cancellation
 *     responses:
 *       200:
 *         description: Invoice cancelled successfully
 *       400:
 *         description: Cannot cancel invoice in current state
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.post('/:id/cancel', idempotency({ ttl: 3600, required: true }), InvoiceController.cancel);

export default router;
