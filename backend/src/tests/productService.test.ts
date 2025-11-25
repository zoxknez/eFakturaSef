import { ProductService } from '../services/productService';
import { prisma } from '../db/prisma';

// Mock prisma
jest.mock('../db/prisma', () => ({
  prisma: {
    product: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    invoiceLine: {
      findMany: jest.fn(),
    },
  },
}));

describe('ProductService', () => {
  const mockCompanyId = 'company-123';
  const mockUserId = 'user-123';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createProduct', () => {
    it('should create a product successfully', async () => {
      const productData = {
        code: 'PROD-001',
        name: 'Test Product',
        unitPrice: 100,
        vatRate: 20,
        unit: 'kom',
        trackInventory: false,
        isActive: true,
        currentStock: 0,
      };

      (prisma.product.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.product.create as jest.Mock).mockResolvedValue({
        id: 'prod-1',
        ...productData,
        companyId: mockCompanyId,
      });

      const result = await ProductService.createProduct(mockCompanyId, productData, mockUserId);

      expect(prisma.product.findFirst).toHaveBeenCalledWith({
        where: { companyId: mockCompanyId, code: productData.code },
      });
      expect(prisma.product.create).toHaveBeenCalledWith({
        data: { ...productData, companyId: mockCompanyId },
      });
      expect(result).toHaveProperty('id', 'prod-1');
    });

    it('should throw error if product code exists', async () => {
      const productData = {
        code: 'PROD-001',
        name: 'Test Product',
        unitPrice: 100,
        vatRate: 20,
        unit: 'kom',
        trackInventory: false,
        isActive: true,
        currentStock: 0,
      };

      (prisma.product.findFirst as jest.Mock).mockResolvedValue({ id: 'existing-1' });

      await expect(ProductService.createProduct(mockCompanyId, productData, mockUserId))
        .rejects.toThrow("Product with code 'PROD-001' already exists");
    });
  });

  describe('getStats', () => {
    it('should calculate stats correctly', async () => {
      const productId = 'prod-1';
      
      (prisma.product.findFirst as jest.Mock).mockResolvedValue({
        id: productId,
        companyId: mockCompanyId,
        trackInventory: true,
        currentStock: 10,
        minStock: 5,
        maxStock: 100,
      });

      (prisma.invoiceLine.findMany as jest.Mock).mockResolvedValue([
        { quantity: 2, unitPrice: 100, amount: 200 },
        { quantity: 3, unitPrice: 100, amount: 300 },
      ]);

      const stats = await ProductService.getStats(productId, mockCompanyId);

      expect(stats).toEqual({
        totalSold: 5,
        totalRevenue: 500,
        averagePrice: 100,
        timesUsed: 2,
        currentStock: 10,
        stockStatus: 'NORMAL',
      });
    });
  });
});
