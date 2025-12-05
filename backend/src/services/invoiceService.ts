import { Prisma, InvoiceStatus, InvoiceType, Product, InventoryTransactionType } from '@prisma/client';
import { prisma } from '../db/prisma';
import { logger } from '../utils/logger';
import { UBLGenerator } from './ublGenerator';
import { queueInvoice } from '../queue/invoiceQueue';
import { SEFService } from './sefService';
import { InventoryService } from './inventoryService';
import { 
  toDecimal, 
  toNumber, 
  calculateLineTotal, 
  calculateInvoiceTotals, 
  isPositive, 
  isValidTaxRate 
} from '../utils/decimal';
import {
  parseCursorPagination,
  buildCursorQuery,
  processCursorResults,
  createSearchFilter,
  combineFilters,
} from '../utils/pagination';
import { sanitizeSearchQuery, validateInvoiceNumber, validateDateNotFuture } from '../utils/validation';

export type InvoiceLineInput = {
  name: string;
  quantity: number | string;
  unitPrice: number | string;
  taxRate: number | string;
  productId?: string;
};

export type CreateInvoiceDTO = {
  companyId: string;
  partnerId?: string;
  buyerName?: string;
  buyerPIB?: string;
  buyerAddress?: string;
  buyerCity?: string;
  buyerPostalCode?: string;
  lines: InvoiceLineInput[];
  invoiceNumber: string;
  issueDate: string;
  dueDate?: string;
  currency?: string;
  note?: string;
  type?: InvoiceType | string;
};

export type UpdateInvoiceDTO = Partial<{
  buyerName: string;
  buyerPIB: string;
  buyerAddress: string;
  buyerCity: string;
  buyerPostalCode: string;
  dueDate: string;
  currency: string;
  note: string;
}>;

export interface InvoiceListParams {
  status?: string;
  type?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: 'issueDate' | 'dueDate' | 'totalAmount' | 'invoiceNumber' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
  cursor?: string;
  limit?: number;
  direction?: 'next' | 'prev';
}

export class InvoiceService {
  
  /**
   * Helper to parse and validate dates
   */
  private static parseDate(value: unknown): Date | null {
    if (!value) return null;
    const d = new Date(String(value));
    return Number.isNaN(d.getTime()) ? null : d;
  }

  /**
   * Helper to normalize currency
   */
  private static normalizeCurrency(value: unknown, fallback = 'RSD'): string {
    if (typeof value !== 'string') return fallback;
    const cc = value.trim().toUpperCase();
    return /^[A-Z]{3}$/.test(cc) ? cc : fallback;
  }

  /**
   * Helper to ensure date order
   */
  private static ensureDateOrder(issue: Date, due?: Date | null) {
    if (!due) return;
    if (due.getTime() < issue.getTime()) {
      throw new Error('dueDate cannot be before issueDate');
    }
  }

  /**
   * Build invoice lines and calculate totals
   */
  private static buildInvoiceLines(lines: InvoiceLineInput[]) {
    if (!Array.isArray(lines) || lines.length === 0) {
      throw new Error('At least one line item is required');
    }

    const invoiceLines: Prisma.InvoiceLineUncheckedCreateWithoutInvoiceInput[] = [];
    const productIds: string[] = [];
    
    const parsedLines = lines.map((line, index) => {
      if (!line || typeof line.name !== 'string' || !line.name.trim()) {
        throw new Error(`Line ${index + 1}: name is required`);
      }

      const quantity = toDecimal(line.quantity);
      const unitPrice = toDecimal(line.unitPrice);
      const taxRate = toDecimal(line.taxRate);

      if (!isPositive(quantity)) {
        throw new Error(`Line ${index + 1}: quantity must be greater than zero`);
      }
      if (!isValidTaxRate(taxRate)) {
        throw new Error(`Line ${index + 1}: taxRate must be between 0 and 100`);
      }

      const lineTotals = calculateLineTotal(quantity, unitPrice, taxRate);

      const invoiceLine: Prisma.InvoiceLineUncheckedCreateWithoutInvoiceInput = {
        lineNumber: index + 1,
        itemName: line.name.trim(),
        quantity: toNumber(quantity),
        unitPrice: toNumber(unitPrice),
        taxRate: toNumber(taxRate),
        taxAmount: toNumber(lineTotals.taxAmount),
        amount: toNumber(lineTotals.totalAmount),
      };

      if (line.productId?.trim()) {
        invoiceLine.productId = line.productId.trim();
        productIds.push(line.productId.trim());
      }

      invoiceLines.push(invoiceLine);
      
      return {
        quantity: toNumber(quantity),
        unitPrice: toNumber(unitPrice),
        taxRate: toNumber(taxRate),
      };
    });

    const invoiceTotals = calculateInvoiceTotals(parsedLines);

    return {
      invoiceLines,
      productIds,
      totals: {
        taxExclusive: toNumber(invoiceTotals.taxExclusiveAmount),
        tax: toNumber(invoiceTotals.taxAmount),
        taxInclusive: toNumber(invoiceTotals.taxInclusiveAmount),
      },
    };
  }

  /**
   * Create a new invoice
   */
  static async createInvoice(data: CreateInvoiceDTO, userId: string) {
    const {
      companyId,
      partnerId,
      buyerName,
      buyerPIB,
      buyerAddress,
      buyerCity,
      buyerPostalCode,
      lines,
      invoiceNumber,
      issueDate,
      dueDate,
      currency,
      note,
      type,
    } = data;

    // Basic validation
    if (!companyId?.trim()) throw new Error('companyId is required');
    if (!invoiceNumber?.trim()) throw new Error('invoiceNumber is required');
    if (!issueDate?.trim()) throw new Error('issueDate is required');

    // Check company existence
    const company = await prisma.company.findUnique({ where: { id: companyId } });
    if (!company) {
      throw new Error('Company does not exist');
    }

    // Partner resolution
    let finalBuyerName: string;
    let finalBuyerPIB: string;
    let finalBuyerAddress: string | undefined;
    let finalBuyerCity: string | undefined;
    let finalBuyerPostalCode: string | undefined;

    if (partnerId?.trim()) {
      const partner = await prisma.partner.findFirst({
        where: { 
          id: partnerId,
          companyId: companyId 
        }
      });

      if (!partner) {
        throw new Error('Partner does not exist or does not belong to this company');
      }

      finalBuyerName = partner.name;
      finalBuyerPIB = partner.pib;
      finalBuyerAddress = partner.address;
      finalBuyerCity = partner.city;
      finalBuyerPostalCode = partner.postalCode;
    } else {
      if (!buyerPIB?.trim()) {
        throw new Error('buyerPIB is required when partner is not selected');
      }
      
      finalBuyerName = buyerName?.trim() || 'Unknown Buyer';
      finalBuyerPIB = buyerPIB.trim();
      finalBuyerAddress = buyerAddress?.trim();
      finalBuyerCity = buyerCity?.trim();
      finalBuyerPostalCode = buyerPostalCode?.trim();
    }

    // Validate invoice number format
    if (!validateInvoiceNumber(invoiceNumber)) {
      throw new Error('Invalid invoice number format');
    }

    // Date parsing and validation
    const issueDateObj = this.parseDate(issueDate);
    if (!issueDateObj) throw new Error('Invalid issueDate');
    
    // Validate issue date is not in the future
    if (!validateDateNotFuture(issueDateObj, true)) {
      throw new Error('Issue date cannot be in the future');
    }

    const dueDateObj = dueDate ? this.parseDate(dueDate) : null;
    if (dueDate && !dueDateObj) throw new Error('Invalid dueDate');
    
    this.ensureDateOrder(issueDateObj, dueDateObj);

    // Build lines
    const invoiceLinesData = this.buildInvoiceLines(lines);

    // Product validation and stock check
    if (invoiceLinesData.productIds.length > 0) {
      const products = await prisma.product.findMany({
        where: {
          id: { in: invoiceLinesData.productIds },
          companyId: companyId
        }
      });

      if (products.length !== invoiceLinesData.productIds.length) {
        const foundIds = products.map(p => p.id);
        const missingIds = invoiceLinesData.productIds.filter(id => !foundIds.includes(id));
        throw new Error(`Some products do not exist: ${missingIds.join(', ')}`);
      }

      if (company.autoStockDeduction) {
        await this.validateStock(products, lines);
      }
    }

    const invoiceType = (type as InvoiceType) || InvoiceType.OUTGOING;
    const currencyCode = this.normalizeCurrency(currency);

    // Check uniqueness
    const existing = await prisma.invoice.findFirst({
      where: { companyId, invoiceNumber },
      select: { id: true },
    });
    if (existing) {
      throw new Error('Invoice number already exists for this company');
    }

    // Transaction for creation and stock update
    return await prisma.$transaction(async (tx) => {
      const created = await tx.invoice.create({
        data: {
          companyId,
          partnerId: partnerId?.trim() || null,
          invoiceNumber: invoiceNumber.trim(),
          issueDate: issueDateObj,
          dueDate: dueDateObj ?? undefined,
          currency: currencyCode,
          note,
          type: invoiceType,
          buyerName: finalBuyerName,
          buyerPIB: finalBuyerPIB,
          buyerAddress: finalBuyerAddress,
          buyerCity: finalBuyerCity,
          buyerPostalCode: finalBuyerPostalCode,
          totalAmount: invoiceLinesData.totals.taxInclusive,
          taxAmount: invoiceLinesData.totals.tax,
          status: InvoiceStatus.DRAFT,
          lines: {
            create: invoiceLinesData.invoiceLines,
          },
        },
        include: {
          lines: true,
          company: true,
          partner: true,
        },
      });

      if (company.autoStockDeduction && invoiceLinesData.productIds.length > 0) {
        await this.deductStock(tx, lines, created.id, userId, companyId);
      }

      logger.info(`Invoice created: ${created.id}`, { companyId, invoiceNumber });
      return created;
    });
  }

  /**
   * Update an existing invoice
   */
  static async updateInvoice(id: string, data: UpdateInvoiceDTO) {
    const invoice = await prisma.invoice.findUnique({ where: { id } });
    if (!invoice) throw new Error('Invoice not found');

    if (invoice.status !== InvoiceStatus.DRAFT) {
      throw new Error('Only drafts can be updated');
    }

    const updateData: Prisma.InvoiceUpdateInput = {};

    if (data.buyerName !== undefined) updateData.buyerName = data.buyerName.trim();
    if (data.buyerPIB !== undefined) updateData.buyerPIB = data.buyerPIB.trim();
    if (data.buyerAddress !== undefined) updateData.buyerAddress = data.buyerAddress.trim();
    if (data.buyerCity !== undefined) updateData.buyerCity = data.buyerCity.trim();
    if (data.buyerPostalCode !== undefined) updateData.buyerPostalCode = data.buyerPostalCode.trim();
    if (data.currency !== undefined) updateData.currency = this.normalizeCurrency(data.currency);
    if (data.note !== undefined) updateData.note = data.note;

    if (data.dueDate !== undefined) {
      const parsed = this.parseDate(data.dueDate);
      if (!parsed) throw new Error('Invalid dueDate');
      this.ensureDateOrder(invoice.issueDate, parsed);
      updateData.dueDate = parsed;
    }

    const updated = await prisma.invoice.update({
      where: { id },
      data: updateData,
      include: {
        lines: true,
        company: true,
      },
    });

    logger.info(`Invoice updated: ${id}`);
    return updated;
  }

  /**
   * Delete an invoice
   */
  static async deleteInvoice(id: string, userId: string) {
    const invoice = await prisma.invoice.findUnique({ 
      where: { id },
      include: {
        lines: true,
        company: {
          select: { autoStockDeduction: true }
        }
      }
    });
    
    if (!invoice) throw new Error('Invoice not found');

    if (invoice.status !== InvoiceStatus.DRAFT) {
      throw new Error('Only drafts can be deleted');
    }

    await prisma.$transaction(async (tx) => {
      if (invoice.company?.autoStockDeduction) {
        await this.restoreStock(tx, invoice.lines, invoice.id, userId, invoice.companyId);
      }
      await tx.invoice.delete({ where: { id } });
    });

    logger.info(`Invoice deleted: ${id}`);
  }

  /**
   * Validate stock availability
   */
  private static async validateStock(products: Product[], lines: InvoiceLineInput[]) {
    const lineQuantities = new Map<string, number>();
    lines.forEach((line) => {
      if (line.productId) {
        const existing = lineQuantities.get(line.productId) || 0;
        lineQuantities.set(line.productId, existing + Number(line.quantity));
      }
    });

    for (const product of products) {
      if (product.trackInventory) {
        const requestedQty = lineQuantities.get(product.id) || 0;
        const availableStock = Number(product.currentStock);

        if (availableStock < requestedQty) {
          throw new Error(`Insufficient stock for product ${product.name}. Available: ${availableStock}, Requested: ${requestedQty}`);
        }
      }
    }
  }

  /**
   * Deduct stock
   */
  private static async deductStock(
    tx: Prisma.TransactionClient, 
    lines: InvoiceLineInput[], 
    invoiceId: string, 
    userId: string,
    companyId: string
  ) {
    const lineQuantities = new Map<string, number>();
    lines.forEach((line) => {
      if (line.productId) {
        const existing = lineQuantities.get(line.productId) || 0;
        lineQuantities.set(line.productId, existing + Number(line.quantity));
      }
    });

    for (const [productId, quantity] of lineQuantities.entries()) {
      // Use InventoryService to create transaction and update stock
      // Note: We pass negative quantity for deduction
      await InventoryService.createTransaction(
        companyId,
        productId,
        InventoryTransactionType.SALE,
        -quantity,
        userId,
        {
          referenceType: 'invoice',
          referenceId: invoiceId,
          note: 'Invoice creation (auto-deduction)',
          tx
        }
      );
    }
  }

  /**
   * Restore stock
   */
  private static async restoreStock(
    tx: Prisma.TransactionClient, 
    lines: any[], 
    invoiceId: string, 
    userId: string,
    companyId: string
  ) {
    const productQuantities = new Map<string, number>();
    
    lines.forEach((line) => {
      if (line.productId) {
        const existing = productQuantities.get(line.productId) || 0;
        productQuantities.set(line.productId, existing + Number(line.quantity));
      }
    });

    for (const [productId, quantity] of productQuantities.entries()) {
      // Use InventoryService to create transaction and update stock
      // Note: We pass positive quantity for restoration
      await InventoryService.createTransaction(
        companyId,
        productId,
        InventoryTransactionType.ADJUSTMENT,
        quantity,
        userId,
        {
          referenceType: 'invoice',
          referenceId: invoiceId,
          note: 'Invoice cancellation/deletion (stock restore)',
          tx
        }
      );
    }
  }

  /**
   * Prepare and queue invoice for SEF submission
   */
  static async sendToSEF(id: string, userId: string) {
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        lines: true,
        company: true,
      },
    });

    if (!invoice) throw new Error('Invoice not found');
    if (invoice.status !== InvoiceStatus.DRAFT) {
      throw new Error('Invoice has already been processed');
    }
    if (!invoice.company) {
      throw new Error('Issuer company is missing');
    }
    if (!invoice.company.sefApiKey) {
      throw new Error('Company does not have SEF API key configured');
    }

    // Validate invoice data before queuing
    const ublData = {
      invoiceNumber: invoice.invoiceNumber,
      issueDate: invoice.issueDate,
      dueDate: invoice.dueDate || undefined,
      currency: invoice.currency,
      supplier: {
        name: invoice.company.name,
        pib: invoice.company.pib || '',
        address: invoice.company.address ?? '',
        city: invoice.company.city ?? '',
        postalCode: invoice.company.postalCode ?? '',
        country: invoice.company.country ?? 'RS',
      },
      buyer: {
        name: invoice.buyerName ?? 'Unknown',
        pib: invoice.buyerPIB || '',
        address: invoice.buyerAddress ?? '',
        city: invoice.buyerCity ?? '',
        postalCode: invoice.buyerPostalCode ?? '',
        country: 'RS',
      },
      lines: invoice.lines.map((line) => {
        const lineTotals = calculateLineTotal(
          Number(line.quantity),
          Number(line.unitPrice),
          Number(line.taxRate)
        );
        return {
          id: line.lineNumber,
          name: line.itemName,
          quantity: Number(line.quantity),
          unitCode: 'C62',
          unitPrice: Number(line.unitPrice),
          taxRate: Number(line.taxRate),
          taxAmount: toNumber(lineTotals.taxAmount),
          lineAmount: Number(line.amount),
        };
      }),
      totals: {
        taxExclusiveAmount: toNumber(toDecimal(Number(invoice.totalAmount) - Number(invoice.taxAmount))),
        taxInclusiveAmount: toNumber(toDecimal(Number(invoice.totalAmount))),
        taxAmount: toNumber(toDecimal(Number(invoice.taxAmount))),
        payableAmount: toNumber(toDecimal(Number(invoice.totalAmount))),
      },
    };

    const validation = UBLGenerator.validateInvoice(ublData);
    if (!validation.valid) {
      throw new Error(`Invalid invoice data: ${JSON.stringify(validation.errors)}`);
    }

    // Queue the invoice for processing
    const job = await queueInvoice({
      invoiceId: invoice.id,
      companyId: invoice.companyId,
      userId,
    });

    logger.info(`Invoice queued for SEF: ${id}`, { jobId: job.id });

    return { 
      jobId: job.id,
      invoiceId: invoice.id,
    };
  }

  /**
   * Cancel invoice in SEF
   */
  static async cancelInvoice(id: string, userId: string, reason?: string) {
    const invoice = await prisma.invoice.findUnique({ 
      where: { id },
      include: {
        lines: true,
        company: {
          select: { 
            autoStockDeduction: true,
            sefApiKey: true,
            sefEnvironment: true
          }
        }
      }
    });
    
    if (!invoice) throw new Error('Invoice not found');
    if (!invoice.sefId) throw new Error('Invoice has not been sent to SEF');
    if (!invoice.company?.sefApiKey) throw new Error('Company SEF API key not found');

    const sefService = new SEFService({
      apiKey: invoice.company.sefApiKey,
      baseUrl: invoice.company.sefEnvironment === 'production' 
        ? 'https://efaktura.mfin.gov.rs' 
        : 'https://demoefaktura.mfin.gov.rs'
    });

    const sefResponse = await sefService.cancelSalesInvoice({
      invoiceId: parseInt(invoice.sefId, 10),
      cancelComments: reason || 'Cancelled by user',
    });

    const updated = await prisma.$transaction(async (tx) => {
      const updatedInvoice = await tx.invoice.update({
        where: { id },
        data: {
          status: InvoiceStatus.CANCELLED,
          sefStatus: sefResponse?.Status ?? 'CANCELLED',
        },
      });

      if (invoice.company?.autoStockDeduction) {
        await this.restoreStock(tx, invoice.lines, invoice.id, userId, invoice.companyId);
      }

      return updatedInvoice;
    });

    logger.info(`Invoice cancelled: ${id}`, { sefStatus: sefResponse?.Status });
    return { invoice: updated, sefResponse };
  }

  /**
   * List invoices with cursor-based pagination and filters
   */
  static async listInvoices(companyId: string, params: InvoiceListParams) {
    const { status, type, search, dateFrom, dateTo, sortBy, sortOrder } = params;

    // Parse cursor pagination params
    const paginationParams = parseCursorPagination({
      cursor: params.cursor,
      limit: params.limit?.toString(),
      direction: params.direction,
    });

    // Build filters
    const filters: any[] = [];

    // Filter by company
    filters.push({ companyId });

    // Status filter
    if (status) {
      const statusEnum = Object.values(InvoiceStatus).find(s => s === status.toUpperCase());
      if (statusEnum) filters.push({ status: statusEnum });
    }

    // Type filter
    if (type) {
      const typeEnum = Object.values(InvoiceType).find(t => t === type.toUpperCase());
      if (typeEnum) filters.push({ type: typeEnum });
    }

    // Date range filter
    if (dateFrom || dateTo) {
      const dateFilter: { issueDate?: { gte?: Date; lte?: Date } } = { issueDate: {} };
      if (dateFrom) {
        const fromDate = this.parseDate(dateFrom);
        if (fromDate) dateFilter.issueDate!.gte = fromDate;
      }
      if (dateTo) {
        const toDate = this.parseDate(dateTo);
        if (toDate) {
          // Set to end of day
          toDate.setHours(23, 59, 59, 999);
          dateFilter.issueDate!.lte = toDate;
        }
      }
      if (Object.keys(dateFilter.issueDate || {}).length > 0) {
        filters.push(dateFilter);
      }
    }

    // Search filter (invoice number, buyer name, buyer PIB, partner name)
    let searchFilter: any = undefined;
    if (search) {
      // Sanitize search query to prevent injection
      const sanitizedSearch = sanitizeSearchQuery(search);
      if (sanitizedSearch) {
        searchFilter = {
          OR: [
            { invoiceNumber: { contains: sanitizedSearch, mode: 'insensitive' } },
            { buyerName: { contains: sanitizedSearch, mode: 'insensitive' } },
            { buyerPIB: { contains: sanitizedSearch } },
            { 
              partner: {
                OR: [
                  { name: { contains: sanitizedSearch, mode: 'insensitive' } },
                  { pib: { contains: sanitizedSearch } }
                ]
              }
            }
          ]
        };
        filters.push(searchFilter);
      }
    }

    const where = combineFilters(...filters);

    // Build cursor query
    const query = buildCursorQuery(paginationParams, where);

    // Apply custom sorting if specified
    if (sortBy) {
      const order = sortOrder === 'asc' ? 'asc' : 'desc';
      query.orderBy = { [sortBy]: order };
    }

    // Fetch invoices
    const invoices = await prisma.invoice.findMany({
      ...query,
      include: {
        lines: {
          select: {
            id: true,
            lineNumber: true,
            itemName: true,
            quantity: true,
            unitPrice: true,
            taxRate: true,
            amount: true,
          },
        },
        partner: {
          select: {
            id: true,
            name: true,
            pib: true,
            type: true,
          },
        },
        company: {
          select: {
            id: true,
            name: true,
            pib: true,
          },
        },
      },
    });

    // Process results with cursor pagination
    return processCursorResults(invoices, paginationParams.limit || 20);
  }

  /**
   * Retrieve single invoice by ID
   */
  static async getInvoice(id: string, companyId?: string) {
    const where: Prisma.InvoiceWhereUniqueInput = { id };
    
    // If companyId is provided, ensure invoice belongs to it
    if (companyId) {
      const invoice = await prisma.invoice.findFirst({
        where: { id, companyId },
        include: {
          lines: true,
          company: true,
          partner: true,
        },
      });
      
      if (!invoice) throw new Error('Invoice not found');
      return invoice;
    }

    const invoice = await prisma.invoice.findUnique({
      where,
      include: {
        lines: true,
        company: true,
        partner: true,
      },
    });

    if (!invoice) throw new Error('Invoice not found');
    return invoice;
  }

  /**
   * Sync invoice status with SEF
   */
  static async syncStatus(id: string) {
    const invoice = await prisma.invoice.findUnique({ 
      where: { id },
      include: {
        company: {
          select: {
            sefApiKey: true,
            sefEnvironment: true
          }
        }
      }
    });
    
    if (!invoice) throw new Error('Invoice not found');
    if (!invoice.sefId) throw new Error('Invoice has not been sent to SEF');
    if (!invoice.company?.sefApiKey) throw new Error('Company SEF API key not found');

    const sefService = new SEFService({
      apiKey: invoice.company.sefApiKey,
      baseUrl: invoice.company.sefEnvironment === 'production' 
        ? 'https://efaktura.mfin.gov.rs' 
        : 'https://demoefaktura.mfin.gov.rs'
    });

    const sefStatus = await sefService.getSalesInvoice(parseInt(invoice.sefId, 10));

    if (sefStatus?.Status && sefStatus.Status !== invoice.sefStatus) {
      await prisma.invoice.update({
        where: { id },
        data: { sefStatus: sefStatus.Status },
      });
    }

    return sefStatus;
  }

  /**
   * Get invoice status counts for all statuses
   */
  static async getStatusCounts(companyId: string) {
    const counts = await prisma.invoice.groupBy({
      by: ['status'],
      where: { companyId },
      _count: { id: true },
    });

    const result = {
      all: 0,
      draft: 0,
      sent: 0,
      approved: 0,
      rejected: 0,
      cancelled: 0,
    };

    for (const item of counts) {
      const count = item._count.id;
      result.all += count;
      
      switch (item.status) {
        case InvoiceStatus.DRAFT:
          result.draft = count;
          break;
        case InvoiceStatus.SENT:
          result.sent = count;
          break;
        case InvoiceStatus.ACCEPTED:
        case InvoiceStatus.DELIVERED:
          result.approved = count;
          break;
        case InvoiceStatus.REJECTED:
          result.rejected = count;
          break;
        case InvoiceStatus.CANCELLED:
        case InvoiceStatus.STORNO:
          result.cancelled = count;
          break;
      }
    }

    return result;
  }

  /**
   * Generate UBL XML for an invoice
   */
  static async generateUBLXML(id: string): Promise<string> {
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        lines: true,
        company: true,
      },
    });

    if (!invoice) throw new Error('Invoice not found');
    if (!invoice.company) throw new Error('Issuer company is missing');

    const ublData = {
      invoiceNumber: invoice.invoiceNumber,
      issueDate: invoice.issueDate,
      dueDate: invoice.dueDate || undefined,
      currency: invoice.currency,
      supplier: {
        name: invoice.company.name,
        pib: invoice.company.pib || '',
        address: invoice.company.address ?? '',
        city: invoice.company.city ?? '',
        postalCode: invoice.company.postalCode ?? '',
        country: invoice.company.country ?? 'RS',
      },
      buyer: {
        name: invoice.buyerName ?? 'Unknown',
        pib: invoice.buyerPIB || '',
        address: invoice.buyerAddress ?? '',
        city: invoice.buyerCity ?? '',
        postalCode: invoice.buyerPostalCode ?? '',
        country: 'RS',
      },
      lines: invoice.lines.map((line) => {
        const lineTotals = calculateLineTotal(
          Number(line.quantity),
          Number(line.unitPrice),
          Number(line.taxRate)
        );
        return {
          id: line.lineNumber,
          name: line.itemName,
          quantity: Number(line.quantity),
          unitCode: 'C62',
          unitPrice: Number(line.unitPrice),
          taxRate: Number(line.taxRate),
          taxAmount: toNumber(lineTotals.taxAmount),
          lineAmount: Number(line.amount),
        };
      }),
      totals: {
        taxExclusiveAmount: toNumber(toDecimal(Number(invoice.totalAmount) - Number(invoice.taxAmount))),
        taxInclusiveAmount: toNumber(toDecimal(Number(invoice.totalAmount))),
        taxAmount: toNumber(toDecimal(Number(invoice.taxAmount))),
        payableAmount: toNumber(toDecimal(Number(invoice.totalAmount))),
      },
    };

    return UBLGenerator.generateInvoiceXML(ublData);
  }
}
