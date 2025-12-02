import { Prisma, IncomingInvoice, IncomingInvoiceStatus, InvoicePaymentStatus } from '@prisma/client';
import { prisma } from '../db/prisma';
import { logger } from '../utils/logger';
import { AppError } from '../middleware/errorHandler';
import { SEFService } from './sefService';
import { InventoryService } from './inventoryService';

export interface CreateIncomingInvoiceDTO {
  invoiceNumber: string;
  issueDate: string | Date;
  dueDate?: string | Date;
  supplierName: string;
  supplierPIB: string;
  supplierAddress?: string;
  totalAmount: number;
  taxAmount: number;
  currency?: string;
  items: Array<{
    name: string;
    quantity: number;
    unitPrice: number;
    taxRate: number;
    amount: number;
  }>;
  status?: IncomingInvoiceStatus;
  paymentStatus?: InvoicePaymentStatus;
  sefId?: string;
}

export interface IncomingInvoiceFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: IncomingInvoiceStatus;
  paymentStatus?: InvoicePaymentStatus;
  dateFrom?: string;
  dateTo?: string;
  supplierPIB?: string;
}

export class IncomingInvoiceService {
  
  /**
   * Create a new incoming invoice (Manual entry)
   */
  static async create(companyId: string, data: CreateIncomingInvoiceDTO, userId: string) {
    return await prisma.$transaction(async (tx) => {
      // Check for duplicates if sefId is provided
      if (data.sefId) {
        const existing = await tx.incomingInvoice.findUnique({
          where: { sefId: data.sefId }
        });
        if (existing) {
          throw new AppError('Invoice with this SEF ID already exists', 409);
        }
      }

      // Calculate tax amount if not provided (simple check)
      let calculatedTax = new Prisma.Decimal(0);
      let calculatedTotal = new Prisma.Decimal(0);

      const lines = data.items.map((item, index) => {
        const amount = new Prisma.Decimal(item.quantity).mul(item.unitPrice);
        const tax = amount.mul(item.taxRate).div(100);
        
        calculatedTotal = calculatedTotal.add(amount).add(tax);
        calculatedTax = calculatedTax.add(tax);

        return {
          lineNumber: index + 1,
          itemName: item.name,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          taxRate: item.taxRate,
          taxAmount: tax,
          amount: amount.add(tax) // Total line amount including tax
        };
      });

      // Create invoice
      const invoice = await tx.incomingInvoice.create({
        data: {
          companyId,
          invoiceNumber: data.invoiceNumber,
          issueDate: new Date(data.issueDate),
          dueDate: data.dueDate ? new Date(data.dueDate) : null,
          supplierName: data.supplierName,
          supplierPIB: data.supplierPIB,
          supplierAddress: data.supplierAddress,
          totalAmount: data.totalAmount, // Trust provided amount or use calculatedTotal
          taxAmount: data.taxAmount,
          currency: data.currency || 'RSD',
          status: data.status || IncomingInvoiceStatus.RECEIVED,
          paymentStatus: data.paymentStatus || InvoicePaymentStatus.UNPAID,
          sefId: data.sefId,
          lines: {
            create: lines
          }
        },
        include: {
          lines: true
        }
      });

      // Log audit
      await tx.auditLog.create({
        data: {
          entityType: 'incoming_invoice',
          entityId: invoice.id,
          action: 'CREATED',
          userId,
          newData: invoice as unknown as Prisma.InputJsonValue
        }
      });

      return invoice;
    });
  }

  /**
   * List incoming invoices with pagination and filtering
   */
  static async list(companyId: string, filters: IncomingInvoiceFilters) {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.IncomingInvoiceWhereInput = {
      companyId,
      ...(filters.search && {
        OR: [
          { invoiceNumber: { contains: filters.search, mode: 'insensitive' } },
          { supplierName: { contains: filters.search, mode: 'insensitive' } },
          { supplierPIB: { contains: filters.search } }
        ]
      }),
      ...(filters.status && { status: filters.status }),
      ...(filters.paymentStatus && { paymentStatus: filters.paymentStatus }),
      ...(filters.supplierPIB && { supplierPIB: filters.supplierPIB }),
      ...(filters.dateFrom && { issueDate: { gte: new Date(filters.dateFrom) } }),
      ...(filters.dateTo && { issueDate: { lte: new Date(filters.dateTo) } })
    };

    const [total, invoices] = await Promise.all([
      prisma.incomingInvoice.count({ where }),
      prisma.incomingInvoice.findMany({
        where,
        skip,
        take: limit,
        orderBy: { issueDate: 'desc' },
        include: {
          lines: false // Don't fetch lines for list view to save bandwidth
        }
      })
    ]);

    return {
      data: invoices,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Get single invoice by ID
   */
  static async getById(id: string, companyId: string) {
    const invoice = await prisma.incomingInvoice.findUnique({
      where: { id },
      include: {
        lines: true
      }
    });

    if (!invoice || invoice.companyId !== companyId) {
      throw new AppError('Invoice not found', 404);
    }

    return invoice;
  }

  /**
   * Update status (Approve/Reject)
   */
  static async updateStatus(id: string, companyId: string, status: IncomingInvoiceStatus, userId: string, reason?: string) {
    const invoice = await prisma.incomingInvoice.findUnique({
      where: { id },
      include: {
        company: {
          select: { autoStockDeduction: true }
        }
      }
    });

    if (!invoice || invoice.companyId !== companyId) {
      throw new AppError('Invoice not found', 404);
    }

    const updateData: any = {
      status,
      updatedAt: new Date()
    };

    if (status === IncomingInvoiceStatus.ACCEPTED) {
      updateData.acceptedAt = new Date();
    } else if (status === IncomingInvoiceStatus.REJECTED) {
      updateData.rejectedAt = new Date();
      updateData.rejectionReason = reason;
    }

    const updated = await prisma.incomingInvoice.update({
      where: { id },
      data: updateData
    });

    // Process stock addition if accepted and auto-deduction (management) is enabled
    // Note: autoStockDeduction usually implies auto-management of stock
    if (status === IncomingInvoiceStatus.ACCEPTED && invoice.company?.autoStockDeduction) {
      try {
        await InventoryService.processIncomingInvoiceStockAddition(companyId, id, userId);
      } catch (error) {
        logger.error(`Failed to process stock addition for invoice ${id}`, error);
        // We don't fail the status update if stock update fails, but we log it.
        // Ideally this should be in a transaction or queue.
      }
    }

    await prisma.auditLog.create({
      data: {
        entityType: 'incoming_invoice',
        entityId: id,
        action: `STATUS_CHANGED_TO_${status}`,
        userId,
        oldData: { status: invoice.status } as unknown as Prisma.InputJsonValue,
        newData: { status } as unknown as Prisma.InputJsonValue
      }
    });

    return updated;
  }

  /**
   * Sync from SEF
   */
  static async syncFromSef(companyId: string, userId: string) {
    // 1. Get company config
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { sefApiKey: true, sefEnvironment: true }
    });

    if (!company?.sefApiKey) {
      throw new AppError('SEF API Key not configured', 400);
    }

    // 2. Init SEF Service
    const sefService = new SEFService({
      apiKey: company.sefApiKey,
      baseUrl: company.sefEnvironment === 'production' 
        ? 'https://efaktura.mfin.gov.rs' 
        : 'https://demoefaktura.mfin.gov.rs'
    });

    // 3. Fetch invoices (last 30 days by default for sync)
    const dateFrom = new Date();
    dateFrom.setDate(dateFrom.getDate() - 30);
    
    const sefInvoices = await sefService.getPurchaseInvoiceIds({
      dateFrom: dateFrom.toISOString().split('T')[0]
    });

    if (!Array.isArray(sefInvoices)) {
      return { synced: 0, errors: 0 };
    }

    let syncedCount = 0;
    let errorCount = 0;

    // 4. Process each invoice
    for (const sefInv of sefInvoices) {
      try {
        // Check if exists
        const exists = await prisma.incomingInvoice.findUnique({
          where: { sefId: sefInv.invoiceId?.toString() || sefInv.id?.toString() }
        });

        if (exists) {
          // Update status if changed
          if (exists.sefStatus !== sefInv.status) {
            await prisma.incomingInvoice.update({
              where: { id: exists.id },
              data: { sefStatus: sefInv.status }
            });
          }
          continue;
        }

        // Map SEF data to our model
        // Note: SEF API response structure needs to be handled carefully. 
        // Assuming sefInv has necessary fields.
        
        await IncomingInvoiceService.create(companyId, {
          invoiceNumber: sefInv.invoiceNumber || 'UNKNOWN',
          issueDate: sefInv.issueDate || new Date(),
          dueDate: sefInv.dueDate,
          supplierName: sefInv.supplierName || 'Unknown Supplier',
          supplierPIB: sefInv.supplierPib || sefInv.supplierPIB || '000000000',
          totalAmount: Number(sefInv.totalAmount || 0),
          taxAmount: Number(sefInv.taxAmount || 0),
          currency: sefInv.currency || 'RSD',
          sefId: sefInv.invoiceId?.toString() || sefInv.id?.toString(),
          status: IncomingInvoiceStatus.RECEIVED,
          items: [] // We might need a separate call to get details for each invoice if list doesn't have items
        }, userId);

        syncedCount++;
      } catch (err) {
        logger.error(`Failed to sync invoice ${sefInv.id}`, err);
        errorCount++;
      }
    }

    return { synced: syncedCount, errors: errorCount };
  }

  /**
   * Map a line item to a product
   */
  static async mapLineProduct(id: string, companyId: string, lineId: string, productId: string | null) {
    const invoice = await prisma.incomingInvoice.findUnique({
      where: { id },
      include: { lines: true }
    });

    if (!invoice || invoice.companyId !== companyId) {
      throw new AppError('Invoice not found', 404);
    }

    // Verify line belongs to invoice
    const line = invoice.lines.find(l => l.id === lineId);
    if (!line) {
      throw new AppError('Line item not found', 404);
    }

    // Verify product exists if provided
    if (productId) {
      const product = await prisma.product.findUnique({
        where: { id: productId }
      });
      if (!product || product.companyId !== companyId) {
        throw new AppError('Product not found', 404);
      }
    }

    const updatedLine = await prisma.incomingInvoiceLine.update({
      where: { id: lineId },
      data: { productId }
    });

    return updatedLine;
  }
}
