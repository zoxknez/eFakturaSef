import { Request, Response } from 'express';
import { logger } from '../utils/logger';
import { ProductService, CreateProductSchema, UpdateProductSchema } from '../services/productService';
import { InventoryService } from '../services/inventoryService';
import { z } from 'zod';
import { AuthenticatedRequest } from '../middleware/auth';
import { getErrorMessage } from '../types/common';

const ListProductsQuerySchema = z.object({
  page: z.string().optional().default('1'),
  limit: z.string().optional().default('50'),
  search: z.string().optional(),
  category: z.string().optional(),
  trackInventory: z.enum(['true', 'false']).optional(),
  isActive: z.enum(['true', 'false']).optional(),
  sortBy: z.enum(['name', 'code', 'unitPrice', 'currentStock', 'createdAt']).optional().default('name'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('asc'),
});

export class ProductController {
  /**
   * List products with pagination and filtering
   * GET /api/products
   */
  static async list(req: Request, res: Response) {
    try {
      const authReq = req as AuthenticatedRequest;
      const user = authReq.user;
      if (!user?.companyId) {
        return res.status(403).json({ error: 'User not associated with a company' });
      }

      // Validate query params
      const queryResult = ListProductsQuerySchema.safeParse(req.query);
      if (!queryResult.success) {
        return res.status(400).json({ 
          error: 'Invalid query parameters',
          details: queryResult.error.format(),
        });
      }

      const { page, limit, search, category, trackInventory, isActive, sortBy, sortOrder } = queryResult.data;

      const result = await ProductService.listProducts(user.companyId, {
        page: parseInt(page),
        limit: parseInt(limit),
        search,
        category,
        trackInventory: trackInventory ? trackInventory === 'true' : undefined,
        isActive: isActive ? isActive === 'true' : undefined,
        sortBy,
        sortOrder: sortOrder as 'asc' | 'desc',
      });

      return res.json(result);
    } catch (error: unknown) {
      logger.error('Failed to list products:', error);
      return res.status(500).json({ error: 'Failed to fetch products' });
    }
  }

  /**
   * Get single product by ID
   * GET /api/products/:id
   */
  static async get(req: Request, res: Response) {
    try {
      const authReq = req as AuthenticatedRequest;
      const user = authReq.user;
      const id = req.params.id as string;

      if (!user?.companyId) {
        return res.status(403).json({ error: 'User not associated with a company' });
      }

      const product = await ProductService.getProduct(id, user.companyId);
      return res.json(product);
    } catch (error: unknown) {
      const message = getErrorMessage(error);
      logger.error('Failed to get product:', error);
      if (message === 'Product not found') {
        return res.status(404).json({ error: message });
      }
      return res.status(500).json({ error: 'Failed to fetch product' });
    }
  }

  /**
   * Create new product
   * POST /api/products
   */
  static async create(req: Request, res: Response) {
    try {
      const authReq = req as AuthenticatedRequest;
      const user = authReq.user;
      if (!user?.companyId) {
        return res.status(403).json({ error: 'User not associated with a company' });
      }

      // Validate request body
      const validationResult = CreateProductSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({
          error: 'Validation failed',
          details: validationResult.error.format(),
        });
      }

      const product = await ProductService.createProduct(user.companyId, validationResult.data, user.id);
      return res.status(201).json(product);
    } catch (error: unknown) {
      const message = getErrorMessage(error);
      logger.error('Failed to create product:', error);
      if (message.includes('already exists')) {
        return res.status(409).json({ error: message });
      }
      return res.status(500).json({ error: 'Failed to create product' });
    }
  }

  /**
   * Update existing product
   * PUT /api/products/:id
   */
  static async update(req: Request, res: Response) {
    try {
      const authReq = req as AuthenticatedRequest;
      const user = authReq.user;
      const id = req.params.id as string;

      if (!user?.companyId) {
        return res.status(403).json({ error: 'User not associated with a company' });
      }

      // Validate request body
      const validationResult = UpdateProductSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({
          error: 'Validation failed',
          details: validationResult.error.format(),
        });
      }

      const product = await ProductService.updateProduct(id, user.companyId, validationResult.data, user.id);
      return res.json(product);
    } catch (error: unknown) {
      const message = getErrorMessage(error);
      logger.error('Failed to update product:', error);
      if (message === 'Product not found') {
        return res.status(404).json({ error: message });
      }
      if (message.includes('already exists')) {
        return res.status(409).json({ error: message });
      }
      return res.status(500).json({ error: 'Failed to update product' });
    }
  }

  /**
   * Soft delete product (set isActive = false)
   * DELETE /api/products/:id
   */
  static async delete(req: Request, res: Response) {
    try {
      const authReq = req as AuthenticatedRequest;
      const user = authReq.user;
      const id = req.params.id as string;

      if (!user?.companyId) {
        return res.status(403).json({ error: 'User not associated with a company' });
      }

      const result = await ProductService.deleteProduct(id, user.companyId, user.id);
      return res.json(result);
    } catch (error: unknown) {
      const message = getErrorMessage(error);
      logger.error('Failed to delete product:', error);
      if (message === 'Product not found') {
        return res.status(404).json({ error: message });
      }
      return res.status(500).json({ error: 'Failed to delete product' });
    }
  }

  /**
   * Autocomplete search for product selection
   * GET /api/products/autocomplete?q=searchTerm
   */
  static async autocomplete(req: Request, res: Response) {
    try {
      const authReq = req as AuthenticatedRequest;
      const user = authReq.user;
      const { q } = req.query;

      if (!q || typeof q !== 'string') {
        return res.status(400).json({ error: 'Query parameter "q" is required' });
      }

      if (!user?.companyId) {
        return res.status(403).json({ error: 'User not associated with a company' });
      }

      const products = await ProductService.autocomplete(user.companyId, q);
      return res.json(products);
    } catch (error: unknown) {
      logger.error('Failed to autocomplete products:', error);
      return res.status(500).json({ error: 'Failed to search products' });
    }
  }

  /**
   * Get product statistics
   * GET /api/products/:id/stats
   */
  static async stats(req: Request, res: Response) {
    try {
      const authReq = req as AuthenticatedRequest;
      const user = authReq.user;
      const id = req.params.id as string;

      if (!user?.companyId) {
        return res.status(403).json({ error: 'User not associated with a company' });
      }

      const stats = await ProductService.getStats(id, user.companyId);
      return res.json(stats);
    } catch (error: unknown) {
      const message = getErrorMessage(error);
      logger.error('Failed to get product stats:', error);
      if (message === 'Product not found') {
        return res.status(404).json({ error: message });
      }
      return res.status(500).json({ error: 'Failed to fetch product statistics' });
    }
  }

  /**
   * Update product stock (for inventory tracking)
   * PATCH /api/products/:id/stock
   */
  static async updateStock(req: Request, res: Response) {
    try {
      const authReq = req as AuthenticatedRequest;
      const user = authReq.user;
      const id = req.params.id as string;
      const { adjustment, note } = req.body;

      if (typeof adjustment !== 'number') {
        return res.status(400).json({ error: 'Adjustment value is required and must be a number' });
      }

      if (!user?.companyId) {
        return res.status(403).json({ error: 'User not associated with a company' });
      }

      const updatedProduct = await ProductService.updateStock(id, user.companyId, adjustment, note, user.id);
      return res.json(updatedProduct);
    } catch (error: unknown) {
      const message = getErrorMessage(error);
      logger.error('Failed to update product stock:', error);
      if (message === 'Product not found') {
        return res.status(404).json({ error: message });
      }
      if (message.includes('Insufficient stock') || message.includes('not enabled')) {
        return res.status(400).json({ error: message });
      }
      return res.status(500).json({ error: 'Failed to update stock' });
    }
  }

  /**
   * Get low stock products
   * GET /api/products/low-stock
   */
  static async lowStock(req: Request, res: Response) {
    try {
      const authReq = req as AuthenticatedRequest;
      const user = authReq.user;
      if (!user?.companyId) {
        return res.status(403).json({ error: 'User not associated with a company' });
      }

      const lowStockProducts = await ProductService.getLowStock(user.companyId);
      return res.json(lowStockProducts);
    } catch (error: unknown) {
      logger.error('Failed to get low stock products:', error);
      return res.status(500).json({ error: 'Failed to fetch low stock products' });
    }
  }

  /**
   * Get inventory history for a product
   * GET /api/products/:id/inventory-history
   */
  static async getInventoryHistory(req: Request, res: Response) {
    try {
      const authReq = req as AuthenticatedRequest;
      const user = authReq.user;
      const id = req.params.id as string;
      const { page, limit, startDate, endDate, type } = req.query;

      if (!user?.companyId) {
        return res.status(403).json({ error: 'User not associated with a company' });
      }

      const history = await InventoryService.getProductHistory(user.companyId, id, {
        page: page ? parseInt(page as string) : 1,
        limit: limit ? parseInt(limit as string) : 50,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        type: type as any,
      });

      return res.json(history);
    } catch (error: unknown) {
      logger.error('Failed to get inventory history:', error);
      return res.status(500).json({ error: 'Failed to fetch inventory history' });
    }
  }

  /**
   * Get product categories (unique list)
   * GET /api/products/categories
   */
  static async categories(req: Request, res: Response) {
    try {
      const authReq = req as AuthenticatedRequest;
      const user = authReq.user;
      if (!user?.companyId) {
        return res.status(403).json({ error: 'User not associated with a company' });
      }

      const categories = await ProductService.getCategories(user.companyId);
      return res.json(categories);
    } catch (error: unknown) {
      logger.error('Failed to get product categories:', error);
      return res.status(500).json({ error: 'Failed to fetch categories' });
    }
  }
}
