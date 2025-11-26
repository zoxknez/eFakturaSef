import { Prisma, InventoryTransactionType } from '@prisma/client';
import { prisma } from '../db/prisma';
import { logger } from '../utils/logger';

export class InventoryService {
  /**
   * Create an inventory transaction and update product stock
   */
  static async createTransaction(
    companyId: string,
    productId: string,
    type: InventoryTransactionType,
    quantity: number,
    userId: string,
    options: {
      referenceType?: string;
      referenceId?: string;
      note?: string;
      unitPrice?: number; // For cost calculation (FIFO/LIFO future support)
      tx?: Prisma.TransactionClient; // Optional transaction client
    } = {}
  ) {
    const db = options.tx || prisma;
    
    // 1. Get current product state
    const product = await db.product.findFirst({
      where: { id: productId, companyId },
    });

    if (!product) {
      throw new Error(`Product not found: ${productId}`);
    }

    if (!product.trackInventory) {
      logger.warn(`Creating inventory transaction for non-tracked product: ${productId}`);
    }

    const currentStock = Number(product.currentStock || 0);
    const newStock = currentStock + quantity;

    // 2. Create transaction record
    const transaction = await db.inventoryTransaction.create({
      data: {
        companyId,
        productId,
        type,
        quantity: new Prisma.Decimal(quantity),
        stockBefore: new Prisma.Decimal(currentStock),
        stockAfter: new Prisma.Decimal(newStock),
        referenceType: options.referenceType,
        referenceId: options.referenceId,
        note: options.note,
        createdBy: userId,
      },
    });

    // 3. Update product stock
    if (product.trackInventory) {
      await db.product.update({
        where: { id: productId },
        data: {
          currentStock: new Prisma.Decimal(newStock),
        },
      });
    }

    logger.info(`Inventory transaction created: ${transaction.id} (${type} ${quantity}) for product ${product.code}`);

    return transaction;
  }

  /**
   * Get transaction history for a product
   */
  static async getProductHistory(
    companyId: string,
    productId: string,
    params: {
      page?: number;
      limit?: number;
      startDate?: Date;
      endDate?: Date;
      type?: InventoryTransactionType;
    }
  ) {
    const { page = 1, limit = 50, startDate, endDate, type } = params;
    const skip = (page - 1) * limit;

    const where: Prisma.InventoryTransactionWhereInput = {
      companyId,
      productId,
    };

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    if (type) {
      where.type = type;
    }

    const [total, transactions] = await Promise.all([
      prisma.inventoryTransaction.count({ where }),
      prisma.inventoryTransaction.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          product: {
            select: { name: true, code: true, unit: true }
          }
        }
      }),
    ]);

    return {
      data: transactions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Process stock deduction from Invoice
   */
  static async processInvoiceStockDeduction(
    companyId: string,
    invoiceId: string,
    userId: string
  ) {
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        lines: true,
      },
    });

    if (!invoice) throw new Error('Invoice not found');
    if (invoice.companyId !== companyId) throw new Error('Unauthorized');

    const results = [];

    for (const line of invoice.lines) {
      if (line.productId) {
        // Deduct stock (negative quantity)
        const quantity = -Number(line.quantity);
        
        try {
          const tx = await this.createTransaction(
            companyId,
            line.productId,
            InventoryTransactionType.SALE,
            quantity,
            userId,
            {
              referenceType: 'invoice',
              referenceId: invoice.id,
              note: `Invoice #${invoice.invoiceNumber}`,
            }
          );
          results.push(tx);
        } catch (error) {
          logger.error(`Failed to deduct stock for product ${line.productId} in invoice ${invoiceId}`, error);
          // Continue with other lines? Or fail hard?
          // For now, log and continue, but ideally this should be atomic.
        }
      }
    }

    return results;
  }

  /**
   * Process stock addition from Incoming Invoice
   */
  static async processIncomingInvoiceStockAddition(
    companyId: string,
    incomingInvoiceId: string,
    userId: string
  ) {
    const invoice = await prisma.incomingInvoice.findUnique({
      where: { id: incomingInvoiceId },
      include: {
        lines: true,
      },
    });

    if (!invoice) throw new Error('Incoming Invoice not found');
    if (invoice.companyId !== companyId) throw new Error('Unauthorized');

    const results = [];

    for (const line of invoice.lines) {
      if (line.productId) {
        // Add stock (positive quantity)
        const quantity = Number(line.quantity);
        
        try {
          const tx = await this.createTransaction(
            companyId,
            line.productId,
            InventoryTransactionType.PURCHASE,
            quantity,
            userId,
            {
              referenceType: 'incoming_invoice',
              referenceId: invoice.id,
              note: `Incoming Invoice #${invoice.invoiceNumber} from ${invoice.supplierName}`,
            }
          );
          results.push(tx);
        } catch (error) {
          logger.error(`Failed to add stock for product ${line.productId} in incoming invoice ${incomingInvoiceId}`, error);
        }
      }
    }

    return results;
  }
}
