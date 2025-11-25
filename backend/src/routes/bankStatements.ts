import { Router } from 'express';
import { bankStatementController, uploadMiddleware } from '../controllers/bankStatementController';
import { authMiddleware, requireRole } from '../middleware/auth';
import { UserRole } from '@prisma/client';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

/**
 * @swagger
 * /api/bank-statements/import:
 *   post:
 *     summary: Import bank statement from file
 *     tags: [Bank Statements]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: Bank statement file (XML, CSV, or MT940)
 *               format:
 *                 type: string
 *                 enum: [xml, csv, mt940]
 *                 description: Override auto-detected format
 *     responses:
 *       201:
 *         description: Statement imported successfully
 */
router.post(
  '/import',
  requireRole([UserRole.ADMIN, UserRole.ACCOUNTANT]),
  uploadMiddleware.single('file'),
  bankStatementController.importStatement
);

/**
 * @swagger
 * /api/bank-statements:
 *   get:
 *     summary: Get all bank statements
 *     tags: [Bank Statements]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: accountNumber
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [IMPORTED, PARTIAL, RECONCILED]
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of bank statements
 */
router.get('/', bankStatementController.getStatements);

/**
 * @swagger
 * /api/bank-statements/transactions/unmatched:
 *   get:
 *     summary: Get unmatched transactions
 *     tags: [Bank Statements]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *     responses:
 *       200:
 *         description: List of unmatched transactions
 */
router.get('/transactions/unmatched', bankStatementController.getUnmatchedTransactions);

/**
 * @swagger
 * /api/bank-statements/{id}:
 *   get:
 *     summary: Get bank statement with transactions
 *     tags: [Bank Statements]
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
 *         description: Bank statement details
 */
router.get('/:id', bankStatementController.getStatement);

/**
 * @swagger
 * /api/bank-statements/{id}/auto-match:
 *   post:
 *     summary: Auto-match transactions in statement
 *     tags: [Bank Statements]
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
 *         description: Auto-match results
 */
router.post(
  '/:id/auto-match',
  requireRole([UserRole.ADMIN, UserRole.ACCOUNTANT]),
  bankStatementController.autoMatch
);

/**
 * @swagger
 * /api/bank-statements/transactions/{transactionId}/match:
 *   post:
 *     summary: Manually match transaction to invoice
 *     tags: [Bank Statements]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: transactionId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - invoiceId
 *             properties:
 *               invoiceId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Transaction matched successfully
 */
router.post(
  '/transactions/:transactionId/match',
  requireRole([UserRole.ADMIN, UserRole.ACCOUNTANT]),
  bankStatementController.matchTransaction
);

/**
 * @swagger
 * /api/bank-statements/transactions/{transactionId}/create-payment:
 *   post:
 *     summary: Create payment from matched transaction
 *     tags: [Bank Statements]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: transactionId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Payment created successfully
 */
router.post(
  '/transactions/:transactionId/create-payment',
  requireRole([UserRole.ADMIN, UserRole.ACCOUNTANT]),
  bankStatementController.createPayment
);

export default router;
