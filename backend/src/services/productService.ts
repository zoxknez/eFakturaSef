import { Prisma, InventoryTransactionType } from '@prisma/client';
import { prisma } from '../db/prisma';
import { logger } from '../utils/logger';
import { z } from 'zod';
import { InventoryService } from './inventoryService';

// ========================================
// ZOD VALIDATION SCHEMAS
// ========================================

export const CreateProductSchema = z.object({
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

export const UpdateProductSchema = CreateProductSchema.partial();

export type CreateProductDTO = z.infer<typeof CreateProductSchema>;
export type UpdateProductDTO = z.infer<typeof UpdateProductSchema>;

export interface ProductListParams {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  trackInventory?: boolean;
  isActive?: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export class ProductService {
  /**
   * List products with pagination and filtering
   */
  static async listProducts(companyId: string, params: ProductListParams) {
    const { 
      page = 1, 
      limit = 50, 
      search, 
      category, 
      trackInventory, 
      isActive, 
      sortBy = 'name', 
      sortOrder = 'asc' 
    } = params;

    const skip = (page - 1) * limit;

    // Build where clause
    const where: Prisma.ProductWhereInput = {
      companyId,
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
      where.trackInventory = trackInventory;
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    // Get total count
    const total = await prisma.product.count({ where });

    // Get products
    const products = await prisma.product.findMany({
      where,
      skip,
      take: limit,
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

    return {
      data: products,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get single product by ID
   */
  static async getProduct(id: string, companyId: string) {
    const product = await prisma.product.findFirst({
      where: {
        id,
        companyId,
      },
      include: {
        _count: {
          select: { invoiceLines: true },
        },
      },
    });

    if (!product) {
      throw new Error('Product not found');
    }

    return product;
  }

  /**
   * Create new product
   */
  static async createProduct(companyId: string, data: CreateProductDTO, userId: string) {
    // Check if product with same code already exists for this company
    const existingProduct = await prisma.product.findFirst({
      where: {
        companyId,
        code: data.code,
      },
    });

    if (existingProduct) {
      throw new Error(`Product with code '${data.code}' already exists`);
    }

    // If barcode is provided, check for duplicates
    if (data.barcode) {
      const existingBarcode = await prisma.product.findFirst({
        where: {
          companyId,
          barcode: data.barcode,
        },
      });

      if (existingBarcode) {
        throw new Error(`Product with barcode '${data.barcode}' already exists`);
      }
    }

    // Create product
    const product = await prisma.product.create({
      data: {
        ...data,
        companyId,
      },
    });

    logger.info(`Product created: ${product.id} (Code: ${product.code}) by user ${userId}`);
    return product;
  }

  /**
   * Update existing product
   */
  static async updateProduct(id: string, companyId: string, data: UpdateProductDTO, userId: string) {
    // Check if product exists and belongs to user's company
    const existingProduct = await prisma.product.findFirst({
      where: {
        id,
        companyId,
      },
    });

    if (!existingProduct) {
      throw new Error('Product not found');
    }

    // If code is being changed, check for duplicates
    if (data.code && data.code !== existingProduct.code) {
      const duplicateCode = await prisma.product.findFirst({
        where: {
          companyId,
          code: data.code,
          id: { not: id },
        },
      });

      if (duplicateCode) {
        throw new Error(`Another product with code '${data.code}' already exists`);
      }
    }

    // If barcode is being changed, check for duplicates
    if (data.barcode && data.barcode !== existingProduct.barcode) {
      const duplicateBarcode = await prisma.product.findFirst({
        where: {
          companyId,
          barcode: data.barcode,
          id: { not: id },
        },
      });

      if (duplicateBarcode) {
        throw new Error(`Another product with barcode '${data.barcode}' already exists`);
      }
    }

    // Update product
    const product = await prisma.product.update({
      where: { id },
      data,
    });

    logger.info(`Product updated: ${id} by user ${userId}`);
    return product;
  }

  /**
   * Delete product (soft or hard)
   */
  static async deleteProduct(id: string, companyId: string, userId: string) {
    // Check if product exists and belongs to user's company
    const existingProduct = await prisma.product.findFirst({
      where: {
        id,
        companyId,
      },
      include: {
        _count: {
          select: { invoiceLines: true },
        },
      },
    });

    if (!existingProduct) {
      throw new Error('Product not found');
    }

    // Check if product is used in invoices
    if (existingProduct._count.invoiceLines > 0) {
      // Soft delete only
      const product = await prisma.product.update({
        where: { id },
        data: { isActive: false },
      });

      logger.info(`Product soft deleted: ${id} (used in ${existingProduct._count.invoiceLines} invoice lines) by user ${userId}`);
      return { 
        message: 'Product deactivated (used in invoices)',
        product,
        softDeleted: true
      };
    }

    // Hard delete if not used
    await prisma.product.delete({
      where: { id },
    });

    logger.info(`Product hard deleted: ${id} by user ${userId}`);
    return { 
      message: 'Product deleted successfully',
      softDeleted: false
    };
  }

  /**
   * Autocomplete search
   */
  static async autocomplete(companyId: string, query: string) {
    const where: Prisma.ProductWhereInput = {
      companyId,
      isActive: true,
      OR: [
        { name: { contains: query, mode: 'insensitive' } },
        { code: { contains: query, mode: 'insensitive' } },
        { barcode: { contains: query } },
      ],
    };

    // Get products (limit 20 for autocomplete)
    return prisma.product.findMany({
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
  }

  /**
   * Get product statistics
   */
  static async getStats(id: string, companyId: string) {
    // Check if product exists
    const product = await prisma.product.findFirst({
      where: {
        id,
        companyId,
      },
    });

    if (!product) {
      throw new Error('Product not found');
    }

    // Get invoice line statistics
    const invoiceLines = await prisma.invoiceLine.findMany({
      where: {
        productId: id,
        invoice: {
          companyId,
        },
      },
      select: {
        quantity: true,
        unitPrice: true,
        amount: true,
      },
    });

    return {
      totalSold: invoiceLines.reduce((sum, line) => sum + Number(line.quantity || 0), 0),
      totalRevenue: invoiceLines.reduce((sum, line) => sum + Number(line.amount || 0), 0),
      averagePrice: invoiceLines.length > 0 
        ? invoiceLines.reduce((sum, line) => sum + Number(line.unitPrice || 0), 0) / invoiceLines.length
        : 0,
      timesUsed: invoiceLines.length,
      currentStock: product.trackInventory ? Number(product.currentStock || 0) : null,
      stockStatus: product.trackInventory
        ? Number(product.currentStock) <= Number(product.minStock || 0)
          ? 'LOW'
          : Number(product.currentStock) >= Number(product.maxStock || Infinity)
          ? 'OVERSTOCKED'
          : 'NORMAL'
        : null,
    };
  }

  /**
   * Update product stock
   */
  static async updateStock(id: string, companyId: string, adjustment: number, note: string | undefined, userId: string) {
    // Use InventoryService to create transaction and update stock
    const transaction = await InventoryService.createTransaction(
      companyId,
      id,
      InventoryTransactionType.ADJUSTMENT,
      adjustment,
      userId,
      {
        note: note || 'Manual adjustment',
      }
    );

    // Return updated product (which is fetched inside createTransaction, but we need to return it here)
    // InventoryService.createTransaction returns the transaction.
    // We can fetch the product again or return the transaction.
    // The controller expects the updated product.
    
    const updatedProduct = await prisma.product.findUnique({
      where: { id },
    });

    if (!updatedProduct) throw new Error('Product not found after update');

    return updatedProduct;
  }

  /**
   * Get low stock products
   */
  static async getLowStock(companyId: string) {
    // Get products with low stock
    const products = await prisma.product.findMany({
      where: {
        companyId,
        trackInventory: true,
        isActive: true,
      },
    });

    // Filter products where currentStock <= minStock
    return products.filter(p => 
      p.minStock !== null && Number(p.currentStock || 0) <= Number(p.minStock)
    );
  }

  /**
   * Get unique categories
   */
  static async getCategories(companyId: string) {
    const products = await prisma.product.findMany({
      where: {
        companyId,
        category: { not: null },
      },
      select: {
        category: true,
      },
      distinct: ['category'],
    });

    return [...new Set(products.map(p => p.category).filter(Boolean))];
  }
}
