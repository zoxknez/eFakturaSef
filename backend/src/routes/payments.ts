import { Router } from 'express';
import { PaymentController } from '../controllers/paymentController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// All payment routes require authentication
router.use(authMiddleware);

/**
 * @route   GET /api/payments
 * @desc    List payments with filtering
 * @access  Private
 * @query   page, limit, invoiceId, method, status, dateFrom, dateTo, sortBy, sortOrder
 */
router.get('/', PaymentController.list);

/**
 * @route   GET /api/payments/stats
 * @desc    Get payment statistics
 * @access  Private
 * @query   dateFrom, dateTo (optional)
 */
router.get('/stats', PaymentController.stats);

/**
 * @route   GET /api/payments/:id
 * @desc    Get single payment by ID
 * @access  Private
 */
router.get('/:id', PaymentController.get);

/**
 * @route   POST /api/payments
 * @desc    Record a payment for an invoice (auto-updates invoice paymentStatus)
 * @access  Private
 * @body    { invoiceId, amount, currency, paymentDate, method, bankAccount, reference, note }
 */
router.post('/', PaymentController.create);

/**
 * @route   DELETE /api/payments/:id
 * @desc    Cancel a payment and revert invoice status
 * @access  Private
 */
router.delete('/:id', PaymentController.cancel);

/**
 * @route   GET /api/invoices/:invoiceId/payments
 * @desc    Get all payments for a specific invoice
 * @access  Private
 */
router.get('/invoices/:invoiceId/payments', PaymentController.getInvoicePayments);

export default router;
