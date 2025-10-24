// @ts-nocheck - Temporary workaround for Prisma Client cache issue (Product model not recognized by TS Server)
import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../db/prisma';
import { logger } from '../utils/logger';

// ========================================
// ZOD VALIDATION SCHEMAS
// ========================================

const CreateProductSchema = z.object({
  code: z.string().min(1, 'Product code is required').max(50),
  barcode: z.string().max(50).optional(),
  
  name: z.string().min(1, 'Product name is required').max(255),
  description: z.string().optional(),
  
  category: z.string().optional(),
  subcategory: z.string().optional(),
  
  // Cene
  unitPrice: z.number().positive('Unit price must be positive'),
  costPrice: z.number().positive('Cost price must be positive').optional(),
  vatRate: z.number().min(0).max(100).default(20), // Stopa PDV-a u procentima
  
  unit: z.string().default('kom'), // kom, kg, m, l, h, usluga, etc.
  
  // Magacin
  trackInventory: z.boolean().default(false),
  currentStock: z.number().min(0).default(0),
  minStock: z.number().min(0).optional(),
  maxStock: z.number().positive().optional(),
  
  // Dobavljač i proizvođač
  supplier: z.string().optional(),
  manufacturer: z.string().optional(),
  
  // Ostalo
  isActive: z.boolean().default(true),
  note: z.string().optional(),
});

const UpdateProductSchema = CreateProductSchema.partial();

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

// ========================================
// PRODUCT CONTROLLER
// ========================================

export class ProductController {
  /**
   * List products with pagination and filtering
   * GET /api/products
   */
  static async list(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;

      // Get user's company
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { companyId: true },
      });

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
      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);
      const skip = (pageNum - 1) * limitNum;

      // Build where clause
      const where: any = {
        companyId: user.companyId,
      };

      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { code: { contains: search, mode: 'insensitive' } },
          { barcode: { contains: search } },
          { description: { contains: search, mode: 'insensitive' } },
        ];
      }

      if (category) {
        where.category = category;
      }

      if (trackInventory !== undefined) {
        where.trackInventory = trackInventory === 'true';
      }

      if (isActive !== undefined) {
        where.isActive = isActive === 'true';
      }

      // Get total count
      const total = await prisma.product.count({ where });

      // Get products
      const products = await prisma.product.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { [sortBy]: sortOrder },
        select: {
          id: true,
          code: true,
          barcode: true,
          name: true,
          description: true,
          category: true,
          subcategory: true,
          unitPrice: true,
          costPrice: true,
          vatRate: true,
          unit: true,
          trackInventory: true,
          currentStock: true,
          minStock: true,
          maxStock: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: { invoiceLines: true },
          },
        },
      });

      res.json({
        data: products,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      });
    } catch (error: any) {
      logger.error('Failed to list products:', error);
      res.status(500).json({ error: 'Failed to fetch products' });
    }
  }

  /**
   * Get single product by ID
   * GET /api/products/:id
   */
  static async get(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      const { id } = req.params;

      // Get user's company
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { companyId: true },
      });

      if (!user?.companyId) {
        return res.status(403).json({ error: 'User not associated with a company' });
      }

      const product = await prisma.product.findFirst({
        where: {
          id,
          companyId: user.companyId,
        },
        include: {
          _count: {
            select: { invoiceLines: true },
          },
        },
      });

      if (!product) {
        return res.status(404).json({ error: 'Product not found' });
      }

      res.json(product);
    } catch (error: any) {
      logger.error('Failed to get product:', error);
      res.status(500).json({ error: 'Failed to fetch product' });
    }
  }

  /**
   * Create new product
   * POST /api/products
   */
  static async create(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;

      // Get user's company
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { companyId: true },
      });

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

      const data = validationResult.data;

      // Check if product with same code already exists for this company
      const existingProduct = await prisma.product.findFirst({
        where: {
          companyId: user.companyId,
          code: data.code,
        },
      });

      if (existingProduct) {
        return res.status(409).json({ 
          error: 'Product with this code already exists',
          existingProductId: existingProduct.id,
        });
      }

      // If barcode is provided, check for duplicates
      if (data.barcode) {
        const existingBarcode = await prisma.product.findFirst({
          where: {
            companyId: user.companyId,
            barcode: data.barcode,
          },
        });

        if (existingBarcode) {
          return res.status(409).json({ 
            error: 'Product with this barcode already exists',
            existingProductId: existingBarcode.id,
          });
        }
      }

      // Create product
      const product = await prisma.product.create({
        data: {
          ...data,
          companyId: user.companyId,
        },
      });

      logger.info(`Product created: ${product.id} (Code: ${product.code}) by user ${userId}`);
      res.status(201).json(product);
    } catch (error: any) {
      logger.error('Failed to create product:', error);
      res.status(500).json({ error: 'Failed to create product' });
    }
  }

  /**
   * Update existing product
   * PUT /api/products/:id
   */
  static async update(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      const { id } = req.params;

      // Get user's company
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { companyId: true },
      });

      if (!user?.companyId) {
        return res.status(403).json({ error: 'User not associated with a company' });
      }

      // Check if product exists and belongs to user's company
      const existingProduct = await prisma.product.findFirst({
        where: {
          id,
          companyId: user.companyId,
        },
      });

      if (!existingProduct) {
        return res.status(404).json({ error: 'Product not found' });
      }

      // Validate request body
      const validationResult = UpdateProductSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({
          error: 'Validation failed',
          details: validationResult.error.format(),
        });
      }

      const data = validationResult.data;

      // If code is being changed, check for duplicates
      if (data.code && data.code !== existingProduct.code) {
        const duplicateCode = await prisma.product.findFirst({
          where: {
            companyId: user.companyId,
            code: data.code,
            id: { not: id },
          },
        });

        if (duplicateCode) {
          return res.status(409).json({ 
            error: 'Another product with this code already exists',
            conflictingProductId: duplicateCode.id,
          });
        }
      }

      // If barcode is being changed, check for duplicates
      if (data.barcode && data.barcode !== existingProduct.barcode) {
        const duplicateBarcode = await prisma.product.findFirst({
          where: {
            companyId: user.companyId,
            barcode: data.barcode,
            id: { not: id },
          },
        });

        if (duplicateBarcode) {
          return res.status(409).json({ 
            error: 'Another product with this barcode already exists',
            conflictingProductId: duplicateBarcode.id,
          });
        }
      }

      // Update product
      const product = await prisma.product.update({
        where: { id },
        data,
      });

      logger.info(`Product updated: ${id} by user ${userId}`);
      res.json(product);
    } catch (error: any) {
      logger.error('Failed to update product:', error);
      res.status(500).json({ error: 'Failed to update product' });
    }
  }

  /**
   * Soft delete product (set isActive = false)
   * DELETE /api/products/:id
   */
  static async delete(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      const { id } = req.params;

      // Get user's company
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { companyId: true },
      });

      if (!user?.companyId) {
        return res.status(403).json({ error: 'User not associated with a company' });
      }

      // Check if product exists and belongs to user's company
      const existingProduct = await prisma.product.findFirst({
        where: {
          id,
          companyId: user.companyId,
        },
        include: {
          _count: {
            select: { invoiceLines: true },
          },
        },
      });

      if (!existingProduct) {
        return res.status(404).json({ error: 'Product not found' });
      }

      // Check if product is used in invoices
      if (existingProduct._count.invoiceLines > 0) {
        // Soft delete only
        const product = await prisma.product.update({
          where: { id },
          data: { isActive: false },
        });

        logger.info(`Product soft deleted: ${id} (used in ${existingProduct._count.invoiceLines} invoice lines) by user ${userId}`);
        return res.json({ 
          message: 'Product deactivated (used in invoices)',
          product,
        });
      }

      // Hard delete if not used
      await prisma.product.delete({
        where: { id },
      });

      logger.info(`Product hard deleted: ${id} by user ${userId}`);
      res.json({ message: 'Product deleted successfully' });
    } catch (error: any) {
      logger.error('Failed to delete product:', error);
      res.status(500).json({ error: 'Failed to delete product' });
    }
  }

  /**
   * Autocomplete search for product selection
   * GET /api/products/autocomplete?q=searchTerm
   */
  static async autocomplete(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      const { q } = req.query;

      if (!q || typeof q !== 'string') {
        return res.status(400).json({ error: 'Query parameter "q" is required' });
      }

      // Get user's company
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { companyId: true },
      });

      if (!user?.companyId) {
        return res.status(403).json({ error: 'User not associated with a company' });
      }

      // Build where clause
      const where: any = {
        companyId: user.companyId,
        isActive: true,
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { code: { contains: q, mode: 'insensitive' } },
          { barcode: { contains: q } },
        ],
      };

      // Get products (limit 20 for autocomplete)
      const products = await prisma.product.findMany({
        where,
        take: 20,
        orderBy: { name: 'asc' },
        select: {
          id: true,
          code: true,
          barcode: true,
          name: true,
          description: true,
          unitPrice: true,
          vatRate: true,
          unit: true,
          trackInventory: true,
          currentStock: true,
        },
      });

      res.json(products);
    } catch (error: any) {
      logger.error('Failed to autocomplete products:', error);
      res.status(500).json({ error: 'Failed to search products' });
    }
  }

  /**
   * Get product statistics
   * GET /api/products/:id/stats
   */
  static async stats(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      const { id } = req.params;

      // Get user's company
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { companyId: true },
      });

      if (!user?.companyId) {
        return res.status(403).json({ error: 'User not associated with a company' });
      }

      // Check if product exists
      const product = await prisma.product.findFirst({
        where: {
          id,
          companyId: user.companyId,
        },
      });

      if (!product) {
        return res.status(404).json({ error: 'Product not found' });
      }

      // Get invoice line statistics
      const invoiceLines = await prisma.invoiceLine.findMany({
        where: {
          productId: id,
          invoice: {
            companyId: user.companyId,
          },
        },
        select: {
          quantity: true,
          unitPrice: true,
          totalAmount: true,
        },
      });

      const stats = {
        totalSold: invoiceLines.reduce((sum, line) => sum + Number(line.quantity || 0), 0),
        totalRevenue: invoiceLines.reduce((sum, line) => sum + Number(line.totalAmount || 0), 0),
        averagePrice: invoiceLines.length > 0 
          ? invoiceLines.reduce((sum, line) => sum + Number(line.unitPrice || 0), 0) / invoiceLines.length
          : 0,
        timesUsed: invoiceLines.length,
        currentStock: product.trackInventory ? Number(product.currentStock || 0) : null,
        stockStatus: product.trackInventory
          ? product.currentStock <= (product.minStock || 0)
            ? 'LOW'
            : product.currentStock >= (product.maxStock || Infinity)
            ? 'OVERSTOCKED'
            : 'NORMAL'
          : null,
      };

      res.json(stats);
    } catch (error: any) {
      logger.error('Failed to get product stats:', error);
      res.status(500).json({ error: 'Failed to fetch product statistics' });
    }
  }

  /**
   * Update product stock (for inventory tracking)
   * PATCH /api/products/:id/stock
   */
  static async updateStock(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      const { id } = req.params;
      const { adjustment, note } = req.body;

      if (typeof adjustment !== 'number') {
        return res.status(400).json({ error: 'Adjustment value is required and must be a number' });
      }

      // Get user's company
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { companyId: true },
      });

      if (!user?.companyId) {
        return res.status(403).json({ error: 'User not associated with a company' });
      }

      // Check if product exists and has inventory tracking enabled
      const product = await prisma.product.findFirst({
        where: {
          id,
          companyId: user.companyId,
        },
      });

      if (!product) {
        return res.status(404).json({ error: 'Product not found' });
      }

      if (!product.trackInventory) {
        return res.status(400).json({ error: 'Inventory tracking is not enabled for this product' });
      }

      const newStock = Number(product.currentStock || 0) + adjustment;

      if (newStock < 0) {
        return res.status(400).json({ 
          error: 'Insufficient stock',
          currentStock: product.currentStock,
          adjustment,
          wouldResult: newStock,
        });
      }

      // Update stock
      const updatedProduct = await prisma.product.update({
        where: { id },
        data: {
          currentStock: newStock,
        },
      });

      logger.info(`Product stock updated: ${id} (${product.currentStock} -> ${newStock}, adjustment: ${adjustment}) by user ${userId}`, {
        note,
      });

      res.json(updatedProduct);
    } catch (error: any) {
      logger.error('Failed to update product stock:', error);
      res.status(500).json({ error: 'Failed to update stock' });
    }
  }

  /**
   * Get low stock products
   * GET /api/products/low-stock
   */
  static async lowStock(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;

      // Get user's company
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { companyId: true },
      });

      if (!user?.companyId) {
        return res.status(403).json({ error: 'User not associated with a company' });
      }

      // Get products with low stock
      const products = await prisma.product.findMany({
        where: {
          companyId: user.companyId,
          trackInventory: true,
          isActive: true,
        },
      });

      // Filter products where currentStock <= minStock
      const lowStockProducts = products.filter(p => 
        p.minStock !== null && Number(p.currentStock || 0) <= Number(p.minStock)
      );

      res.json(lowStockProducts);
    } catch (error: any) {
      logger.error('Failed to get low stock products:', error);
      res.status(500).json({ error: 'Failed to fetch low stock products' });
    }
  }

  /**
   * Get product categories (unique list)
   * GET /api/products/categories
   */
  static async categories(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;

      // Get user's company
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { companyId: true },
      });

      if (!user?.companyId) {
        return res.status(403).json({ error: 'User not associated with a company' });
      }

      // Get all unique categories
      const products = await prisma.product.findMany({
        where: {
          companyId: user.companyId,
          category: { not: null },
        },
        select: {
          category: true,
          subcategory: true,
        },
        distinct: ['category'],
      });

      const categories = [...new Set(products.map(p => p.category).filter(Boolean))];

      res.json(categories);
    } catch (error: any) {
      logger.error('Failed to get product categories:', error);
      res.status(500).json({ error: 'Failed to fetch categories' });
    }
  }
}
