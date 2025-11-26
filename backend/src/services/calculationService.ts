import { Prisma, CalculationStatus, InventoryTransactionType } from '@prisma/client';
import { prisma } from '../db/prisma';
import { logger } from '../utils/logger';
import { InventoryService } from './inventoryService';

interface CreateCalculationItemDto {
  productId: string;
  quantity: number;
  supplierPrice: number;
  expensePerUnit?: number;
  marginPercent?: number;
  vatRate: number;
}

interface CreateCalculationDto {
  companyId: string;
  date: Date;
  number: string;
  partnerId?: string;
  incomingInvoiceId?: string;
  warehouse?: string;
  items: CreateCalculationItemDto[];
  userId: string;
}

export class CalculationService {
  /**
   * Create a new calculation (draft)
   */
  static async create(data: CreateCalculationDto) {
    const { companyId, items, userId, ...rest } = data;

    // Calculate totals
    let totalWholesale = 0;
    let totalExpenses = 0;
    let totalMargin = 0;
    let totalRetail = 0;

    const calculationItems = items.map(item => {
      const quantity = Number(item.quantity);
      const supplierPrice = Number(item.supplierPrice);
      const expensePerUnit = Number(item.expensePerUnit || 0);
      const marginPercent = Number(item.marginPercent || 0);
      const vatRate = Number(item.vatRate);

      // Calculations per item
      const costPrice = supplierPrice + expensePerUnit;
      const marginAmount = costPrice * (marginPercent / 100);
      const salesPriceNoVat = costPrice + marginAmount;
      const salesPrice = salesPriceNoVat * (1 + vatRate / 100);

      // Update totals
      totalWholesale += supplierPrice * quantity;
      totalExpenses += expensePerUnit * quantity;
      totalMargin += marginAmount * quantity;
      totalRetail += salesPrice * quantity;

      return {
        productId: item.productId,
        quantity: new Prisma.Decimal(quantity),
        supplierPrice: new Prisma.Decimal(supplierPrice),
        expensePerUnit: new Prisma.Decimal(expensePerUnit),
        costPrice: new Prisma.Decimal(costPrice),
        marginPercent: new Prisma.Decimal(marginPercent),
        marginAmount: new Prisma.Decimal(marginAmount),
        salesPriceNoVat: new Prisma.Decimal(salesPriceNoVat),
        vatRate: new Prisma.Decimal(vatRate),
        salesPrice: new Prisma.Decimal(salesPrice),
      };
    });

    // Create calculation in DB
    const calculation = await prisma.calculation.create({
      data: {
        ...rest,
        companyId,
        totalWholesale: new Prisma.Decimal(totalWholesale),
        totalExpenses: new Prisma.Decimal(totalExpenses),
        totalMargin: new Prisma.Decimal(totalMargin),
        totalRetail: new Prisma.Decimal(totalRetail),
        status: CalculationStatus.DRAFT,
        createdBy: userId,
        items: {
          create: calculationItems,
        },
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        partner: true,
        incomingInvoice: true,
      },
    });

    return calculation;
  }

  /**
   * Create calculation from Incoming Invoice
   */
  static async createFromIncomingInvoice(
    companyId: string,
    incomingInvoiceId: string,
    userId: string
  ) {
    const invoice = await prisma.incomingInvoice.findUnique({
      where: { id: incomingInvoiceId },
      include: {
        lines: {
          include: {
            product: true,
          },
        },
        company: true,
      },
    }) as any;

    if (!invoice) throw new Error('Incoming invoice not found');
    if (invoice.companyId !== companyId) throw new Error('Unauthorized');

    // Generate next calculation number (simple auto-increment logic for now)
    const count = await prisma.calculation.count({ where: { companyId } });
    const number = `KALK-${new Date().getFullYear()}-${(count + 1).toString().padStart(4, '0')}`;

    const items: CreateCalculationItemDto[] = invoice.lines
      .filter((line: any) => line.productId) // Only lines mapped to products
      .map((line: any) => ({
        productId: line.productId!,
        quantity: Number(line.quantity),
        supplierPrice: Number(line.unitPrice),
        expensePerUnit: 0, // Default to 0, can be edited later
        marginPercent: 20, // Default margin, can be edited later
        vatRate: Number(line.taxRate),
      }));

    if (items.length === 0) {
      throw new Error('No products mapped in this invoice. Please map products first.');
    }

    return this.create({
      companyId,
      date: new Date(),
      number,
      incomingInvoiceId,
      partnerId: invoice.partnerId || undefined,
      items,
      userId,
    });
  }

  /**
   * Post calculation (Finalize)
   * - Updates inventory
   * - Updates product prices
   * - Locks calculation
   */
  static async post(id: string, companyId: string, userId: string) {
    const calculation = await prisma.calculation.findUnique({
      where: { id },
      include: {
        items: true,
      },
    });

    if (!calculation) throw new Error('Calculation not found');
    if (calculation.companyId !== companyId) throw new Error('Unauthorized');
    if (calculation.status !== CalculationStatus.DRAFT) throw new Error('Calculation is already posted or cancelled');

    // Use transaction to ensure data integrity
    await prisma.$transaction(async (tx) => {
      // 1. Update Calculation Status
      await tx.calculation.update({
        where: { id },
        data: {
          status: CalculationStatus.POSTED,
          postedAt: new Date(),
        },
      });

      // 2. Process each item
      for (const item of calculation.items) {
        // A. Update Product Prices
        await tx.product.update({
          where: { id: item.productId },
          data: {
            unitPrice: item.salesPrice, // Update selling price
            costPrice: item.costPrice,  // Update cost price
          },
        });

        // B. Update Inventory (Add stock)
        // We use InventoryService but pass the transaction client
        await InventoryService.createTransaction(
          companyId,
          item.productId,
          InventoryTransactionType.PURCHASE,
          Number(item.quantity),
          userId,
          {
            referenceType: 'calculation',
            referenceId: calculation.id,
            note: `Calculation #${calculation.number}`,
            unitPrice: Number(item.costPrice),
            tx, // Pass transaction context
          }
        );
      }
    });

    return prisma.calculation.findUnique({
      where: { id },
      include: { items: true },
    });
  }

  /**
   * Get calculation by ID
   */
  static async getById(id: string, companyId: string) {
    const calculation = await prisma.calculation.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        partner: true,
        incomingInvoice: true,
      },
    });

    if (!calculation) return null;
    if (calculation.companyId !== companyId) throw new Error('Unauthorized');

    return calculation;
  }

  /**
   * List calculations
   */
  static async list(companyId: string, params: { page?: number; limit?: number; search?: string }) {
    const { page = 1, limit = 20, search } = params;
    const skip = (page - 1) * limit;

    const where: Prisma.CalculationWhereInput = {
      companyId,
      ...(search && {
        OR: [
          { number: { contains: search, mode: 'insensitive' } },
          { partner: { name: { contains: search, mode: 'insensitive' } } },
        ],
      }),
    };

    const [total, data] = await Promise.all([
      prisma.calculation.count({ where }),
      prisma.calculation.findMany({
        where,
        skip,
        take: limit,
        orderBy: { date: 'desc' },
        include: {
          partner: {
            select: { name: true },
          },
        },
      }),
    ]);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
