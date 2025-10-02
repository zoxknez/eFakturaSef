// src/routes/invoices.ts

import { Router } from 'express';
import { authMiddleware, requireRole } from '../middleware/auth';
import {
  createInvoice,
  getInvoices,
  getInvoiceById,
  updateInvoiceStatus,
  deleteInvoice,
  downloadInvoice,
} from '../controllers/invoiceController';

const router = Router();

// Require authentication for all invoice routes
router.use(authMiddleware);

/**
 * @openapi
 * /api/invoices:
 *   get:
 *     summary: List invoices for current company
 *     tags: [Invoices]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of invoices
 *       401:
 *         description: Unauthorized
 *   post:
 *     summary: Create a new invoice
 *     tags: [Invoices]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - invoiceNumber
 *               - invoiceDate
 *               - buyerPib
 *               - buyerName
 *               - buyerAddress
 *               - buyerCity
 *               - buyerPostalCode
 *               - lines
 *             properties:
 *               invoiceNumber:
 *                 type: string
 *                 example: "INV-2025-001"
 *               invoiceDate:
 *                 type: string
 *                 format: date
 *                 example: "2025-10-02"
 *               buyerPib:
 *                 type: string
 *                 minLength: 8
 *                 example: "12345678"
 *               buyerName:
 *                 type: string
 *                 example: "Kupac DOO"
 *               buyerAddress:
 *                 type: string
 *                 example: "Ulica 1"
 *               buyerCity:
 *                 type: string
 *                 example: "Beograd"
 *               buyerPostalCode:
 *                 type: string
 *                 example: "11000"
 *               lines:
 *                 type: array
 *                 minItems: 1
 *                 items:
 *                   type: object
 *                   required: [itemName, quantity, unitPrice, vatRate]
 *                   properties:
 *                     itemName: { type: string, example: "USB kabl" }
 *                     quantity: { type: number, example: 2 }
 *                     unitPrice: { type: number, example: 1200 }
 *                     vatRate: { type: number, minimum: 0, maximum: 100, example: 20 }
 *     responses:
 *       201:
 *         description: Invoice created
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post('/', requireRole(['ADMIN', 'ACCOUNTANT']), createInvoice);
router.get('/', getInvoices);

/**
 * @openapi
 * /api/invoices/{id}:
 *   get:
 *     summary: Get invoice by ID
 *     tags: [Invoices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Invoice
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Not found
 */
router.get('/:id', getInvoiceById);

/**
 * @openapi
 * /api/invoices/{id}/status:
 *   put:
 *     summary: Update invoice status
 *     tags: [Invoices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *                 example: "SENT"
 *     responses:
 *       200:
 *         description: Updated
 *       400:
 *         description: Missing status
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Not found
 */
router.put('/:id/status', requireRole(['ADMIN', 'ACCOUNTANT']), updateInvoiceStatus);

/**
 * @openapi
 * /api/invoices/{id}:
 *   delete:
 *     summary: Delete invoice
 *     tags: [Invoices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Deleted
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Not found
 */
router.delete('/:id', requireRole(['ADMIN']), deleteInvoice);

/**
 * @openapi
 * /api/invoices/{id}/download:
 *   get:
 *     summary: Download invoice as XML, JSON ili PDF
 *     tags: [Invoices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [xml, json, pdf]
 *         description: Format fajla (podrazumevano xml)
 *     responses:
 *       200:
 *         description: File stream
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Not found
 */
router.get('/:id/download', downloadInvoice);

export default router;
