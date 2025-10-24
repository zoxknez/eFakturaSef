import { Router } from 'express';
import { PartnerController } from '../controllers/partnerController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// All partner routes require authentication
router.use(authMiddleware);

/**
 * @route   GET /api/partners
 * @desc    List partners with pagination and filtering
 * @access  Private
 * @query   page, limit, search, type, isActive, sortBy, sortOrder
 */
router.get('/', PartnerController.list);

/**
 * @route   GET /api/partners/autocomplete
 * @desc    Autocomplete search for partner selection (e.g., in invoice form)
 * @access  Private
 * @query   q (required), type (optional: BUYER|SUPPLIER|BOTH)
 */
router.get('/autocomplete', PartnerController.autocomplete);

/**
 * @route   GET /api/partners/:id
 * @desc    Get single partner by ID
 * @access  Private
 */
router.get('/:id', PartnerController.get);

/**
 * @route   GET /api/partners/:id/stats
 * @desc    Get partner statistics (invoices, amounts, payment status)
 * @access  Private
 */
router.get('/:id/stats', PartnerController.stats);

/**
 * @route   POST /api/partners
 * @desc    Create new partner
 * @access  Private
 * @body    { type, pib, name, address, city, postalCode, email, phone, ... }
 */
router.post('/', PartnerController.create);

/**
 * @route   PUT /api/partners/:id
 * @desc    Update existing partner
 * @access  Private
 * @body    Partial partner data
 */
router.put('/:id', PartnerController.update);

/**
 * @route   DELETE /api/partners/:id
 * @desc    Delete partner (soft delete if has invoices, hard delete otherwise)
 * @access  Private
 */
router.delete('/:id', PartnerController.delete);

export default router;
