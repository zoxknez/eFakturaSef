import { Router } from 'express';
import { ProductController } from '../controllers/productController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// All product routes require authentication
router.use(authMiddleware);

/**
 * @route   GET /api/products
 * @desc    List products with pagination and filtering
 * @access  Private
 * @query   page, limit, search, category, trackInventory, isActive, sortBy, sortOrder
 */
router.get('/', ProductController.list);

/**
 * @route   GET /api/products/autocomplete
 * @desc    Autocomplete search for product selection (e.g., in invoice line)
 * @access  Private
 * @query   q (required)
 */
router.get('/autocomplete', ProductController.autocomplete);

/**
 * @route   GET /api/products/low-stock
 * @desc    Get products with low stock (currentStock <= minStock)
 * @access  Private
 */
router.get('/low-stock', ProductController.lowStock);

/**
 * @route   GET /api/products/categories
 * @desc    Get unique list of product categories
 * @access  Private
 */
router.get('/categories', ProductController.categories);

/**
 * @route   GET /api/products/:id
 * @desc    Get single product by ID
 * @access  Private
 */
router.get('/:id', ProductController.get);

/**
 * @route   GET /api/products/:id/stats
 * @desc    Get product statistics (sales, revenue, usage)
 * @access  Private
 */
router.get('/:id/stats', ProductController.stats);

/**
 * @route   POST /api/products
 * @desc    Create new product
 * @access  Private
 * @body    { code, name, unitPrice, vatRate, unit, trackInventory, ... }
 */
router.post('/', ProductController.create);

/**
 * @route   PUT /api/products/:id
 * @desc    Update existing product
 * @access  Private
 * @body    Partial product data
 */
router.put('/:id', ProductController.update);

/**
 * @route   PATCH /api/products/:id/stock
 * @desc    Update product stock (adjustment)
 * @access  Private
 * @body    { adjustment: number, note?: string }
 */
router.patch('/:id/stock', ProductController.updateStock);

/**
 * @route   DELETE /api/products/:id
 * @desc    Delete product (soft delete if used in invoices, hard delete otherwise)
 * @access  Private
 */
router.delete('/:id', ProductController.delete);

export default router;
