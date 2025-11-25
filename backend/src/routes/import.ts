/**
 * Import Routes
 * Routes for importing data from CSV/Excel files
 */

import { Router } from 'express';
import {
  importPartners,
  importProducts,
  importInvoices,
  importPayments,
  importBankStatements
} from '../controllers/importController';

const router = Router();

/**
 * @swagger
 * /api/import/partners:
 *   post:
 *     summary: Import partners from file
 *     tags: [Import]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               data:
 *                 type: array
 *                 items:
 *                   type: object
 *     responses:
 *       200:
 *         description: Import completed
 */
router.post('/partners', importPartners);

/**
 * @swagger
 * /api/import/products:
 *   post:
 *     summary: Import products from file
 *     tags: [Import]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               data:
 *                 type: array
 *                 items:
 *                   type: object
 *     responses:
 *       200:
 *         description: Import completed
 */
router.post('/products', importProducts);

/**
 * @swagger
 * /api/import/invoices:
 *   post:
 *     summary: Import invoices from file
 *     tags: [Import]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               data:
 *                 type: array
 *                 items:
 *                   type: object
 *     responses:
 *       200:
 *         description: Import completed
 */
router.post('/invoices', importInvoices);

/**
 * @swagger
 * /api/import/payments:
 *   post:
 *     summary: Import payments from file
 *     tags: [Import]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               data:
 *                 type: array
 *                 items:
 *                   type: object
 *     responses:
 *       200:
 *         description: Import completed
 */
router.post('/payments', importPayments);

/**
 * @swagger
 * /api/import/bank-statements:
 *   post:
 *     summary: Import bank statements from file
 *     tags: [Import]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               data:
 *                 type: array
 *                 items:
 *                   type: object
 *     responses:
 *       200:
 *         description: Import completed
 */
router.post('/bank-statements', importBankStatements);

export default router;
