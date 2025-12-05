import { Request, Response } from 'express';
import { logger } from '../utils/logger';
import { ProductService, CreateProductSchema, UpdateProductSchema } from '../services/productService';
import { InventoryService } from '../services/inventoryService';
import { z } from 'zod';
import { AuthenticatedRequest } from '../middleware/auth';
import { AppError, Errors, handleControllerError, getAuthenticatedCompanyId } from '../utils/errorHandler';

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
      const companyId = getAuthenticatedCompanyId(authReq.user);

      // Validate query params
      const queryResult = ListProductsQuerySchema.safeParse(req.query);
      if (!queryResult.success) {
        throw Errors.validationError(queryResult.error.errors);
      }

      const { page, limit, search, category, trackInventory, isActive, sortBy, sortOrder } = queryResult.data;

      const result = await ProductService.listProducts(companyId, {
        page: parseInt(page),
        limit: parseInt(limit),
        search,
        category,
        trackInventory: trackInventory ? trackInventory === 'true' : undefined,
        isActive: isActive ? isActive === 'true' : undefined,
        sortBy,
        sortOrder: sortOrder as 'asc' | 'desc',
      });

      return res.json({ success: true, ...result });
    } catch (error: unknown) {
      return handleControllerError('ProductController.list', error, res);
    }
  }

  /**
   * Get single product by ID
   * GET /api/products/:id
   */
  static async get(req: Request, res: Response) {
    try {
      const authReq = req as AuthenticatedRequest;
      const companyId = getAuthenticatedCompanyId(authReq.user);
      const id = req.params.id as string;
      
      if (!id) {
        throw Errors.badRequest('Product ID is required');
      }

      const product = await ProductService.getProduct(id, companyId);
      return res.json({ success: true, data: product });
    } catch (error: unknown) {
      return handleControllerError('ProductController.get', error, res);
    }
  }

  /**
   * Create new product
   * POST /api/products
   */
  static async create(req: Request, res: Response) {
    try {
      const authReq = req as AuthenticatedRequest;
      const companyId = getAuthenticatedCompanyId(authReq.user);
      
      if (!authReq.user?.id) {
        throw Errors.unauthorized('User not authenticated');
      }

      // Validate request body
      const validationResult = CreateProductSchema.safeParse(req.body);
      if (!validationResult.success) {
        throw Errors.validationError(validationResult.error.errors);
      }

      const product = await ProductService.createProduct(companyId, validationResult.data, authReq.user.id);
      return res.status(201).json({ success: true, data: product });
    } catch (error: unknown) {
      return handleControllerError('ProductController.create', error, res);
    }
  }

  /**
   * Update existing product
   * PUT /api/products/:id
   */
  static async update(req: Request, res: Response) {
    try {
      const authReq = req as AuthenticatedRequest;
      const companyId = getAuthenticatedCompanyId(authReq.user);
      const id = req.params.id as string;
      
      if (!id) {
        throw Errors.badRequest('Product ID is required');
      }
      
      if (!authReq.user?.id) {
        throw Errors.unauthorized('User not authenticated');
      }

      // Validate request body
      const validationResult = UpdateProductSchema.safeParse(req.body);
      if (!validationResult.success) {
        throw Errors.validationError(validationResult.error.errors);
      }

      const product = await ProductService.updateProduct(id, companyId, validationResult.data, authReq.user.id);
      return res.json({ success: true, data: product });
    } catch (error: unknown) {
      return handleControllerError('ProductController.update', error, res);
    }
  }

  /**
   * Soft delete product (set isActive = false)
   * DELETE /api/products/:id
   */
  static async delete(req: Request, res: Response) {
    try {
      const authReq = req as AuthenticatedRequest;
      const companyId = getAuthenticatedCompanyId(authReq.user);
      const id = req.params.id as string;
      
      if (!id) {
        throw Errors.badRequest('Product ID is required');
      }
      
      if (!authReq.user?.id) {
        throw Errors.unauthorized('User not authenticated');
      }

      const result = await ProductService.deleteProduct(id, companyId, authReq.user.id);
      return res.json({ success: true, data: result });
    } catch (error: unknown) {
      return handleControllerError('ProductController.delete', error, res);
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
        return res.status(400).json({ success: false, error: 'Query parameter "q" is required' });
      }

      if (!user?.companyId) {
        return res.status(403).json({ success: false, error: 'User not associated with a company' });
      }

      const products = await ProductService.autocomplete(user.companyId, q);
      return res.json({ success: true, data: products });
    } catch (error: unknown) {
      logger.error('Failed to autocomplete products:', error);
      return res.status(500).json({ success: false, error: 'Failed to search products' });
    }
  }

  /**
   * Get product statistics
   * GET /api/products/:id/stats
   */
  static async stats(req: Request, res: Response) {
    try {
      const authReq = req as AuthenticatedRequest;
      const companyId = getAuthenticatedCompanyId(authReq.user);
      const id = req.params.id as string;
      
      if (!id) {
        throw Errors.badRequest('Product ID is required');
      }

      const stats = await ProductService.getStats(id, companyId);
      return res.json({ success: true, data: stats });
    } catch (error: unknown) {
      return handleControllerError('ProductController.stats', error, res);
    }
  }

  /**
   * Update product stock (for inventory tracking)
   * PATCH /api/products/:id/stock
   */
  static async updateStock(req: Request, res: Response) {
    try {
      const authReq = req as AuthenticatedRequest;
      const companyId = getAuthenticatedCompanyId(authReq.user);
      const id = req.params.id as string;
      const { adjustment, note } = req.body;
      
      if (!id) {
        throw Errors.badRequest('Product ID is required');
      }
      
      if (typeof adjustment !== 'number') {
        throw Errors.badRequest('Adjustment value is required and must be a number');
      }
      
      if (!authReq.user?.id) {
        throw Errors.unauthorized('User not authenticated');
      }

      const updatedProduct = await ProductService.updateStock(id, companyId, adjustment, note, authReq.user.id);
      return res.json({ success: true, data: updatedProduct });
    } catch (error: unknown) {
      return handleControllerError('ProductController.updateStock', error, res);
    }
  }

  /**
   * Get low stock products
   * GET /api/products/low-stock
   */
  static async lowStock(req: Request, res: Response) {
    try {
      const authReq = req as AuthenticatedRequest;
      const companyId = getAuthenticatedCompanyId(authReq.user);

      const lowStockProducts = await ProductService.getLowStock(companyId);
      return res.json({ success: true, data: lowStockProducts });
    } catch (error: unknown) {
      return handleControllerError('ProductController.lowStock', error, res);
    }
  }

  /**
   * Get inventory history for a product
   * GET /api/products/:id/inventory-history
   */
  static async getInventoryHistory(req: Request, res: Response) {
    try {
      const authReq = req as AuthenticatedRequest;
      const companyId = getAuthenticatedCompanyId(authReq.user);
      const id = req.params.id as string;
      const { page, limit, startDate, endDate, type } = req.query;
      
      if (!id) {
        throw Errors.badRequest('Product ID is required');
      }

      const history = await InventoryService.getProductHistory(companyId, id, {
        page: page ? parseInt(page as string) : 1,
        limit: limit ? parseInt(limit as string) : 50,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        type: type as any,
      });

      return res.json({ success: true, data: history });
    } catch (error: unknown) {
      return handleControllerError('ProductController.getInventoryHistory', error, res);
    }
  }

  /**
   * Get product categories (unique list)
   * GET /api/products/categories
   */
  static async categories(req: Request, res: Response) {
    try {
      const authReq = req as AuthenticatedRequest;
      const companyId = getAuthenticatedCompanyId(authReq.user);

      const categories = await ProductService.getCategories(companyId);
      return res.json({ success: true, data: categories });
    } catch (error: unknown) {
      return handleControllerError('ProductController.categories', error, res);
    }
  }
}
