// @ts-nocheck - Temporary workaround for Prisma Client cache issue (autoStockDeduction, partnerId not recognized by TS Server)
import { Request, Response } from 'express';
import { Prisma, InvoiceStatus, InvoiceType } from '@prisma/client';
import { prisma } from '../db/prisma';
import { sefService } from '../services/sefService';
import { UBLGenerator } from '../services/ublGenerator';
import { logger } from '../utils/logger';
import { queueInvoice } from '../queue/invoiceQueue';
import {
  parseCursorPagination,
  buildCursorQuery,
  processCursorResults,
  createSearchFilter,
  combineFilters,
} from '../utils/pagination';
import {
  toDecimal,
  toTwo,
  calculateLineTotal,
  calculateInvoiceTotals,
  isPositive,
  isValidTaxRate,
  toNumber,
  toString,
} from '../utils/decimal';

/* ========================= Helpers / Validation ========================= */

type InvoiceLineInput = {
  name: string;
  quantity: number | string;
  unitPrice: number | string;
  taxRate: number | string;
  productId?: string; // NEW: Optional reference to Product from šifarnik
};

type CreateInvoiceBody = {
  companyId: string;
  partnerId?: string; // NEW: Reference to Partner from šifarnik
  // Legacy fields (backward compatibility for manual input)
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

type UpdateInvoiceBody = Partial<{
  buyerName: string;
  buyerPIB: string;
  buyerAddress: string;
  buyerCity: string;
  buyerPostalCode: string;
  dueDate: string;
  currency: string;
  note: string;
}>;

// Note: toTwo and parseNumber replaced by decimal.js utilities
// Old implementations removed to avoid conflicts

const parseDate = (value: unknown): Date | null => {
  if (!value) return null;
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? null : d;
};

/** Case-insensitive match za Prisma string enum vrednosti */
const parseEnumValue = <E extends string>(value: unknown, enumObj: Record<string, E>): E | undefined => {
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim().toUpperCase();
  const match = (Object.values(enumObj) as string[]).find(v => v.toUpperCase() === normalized);
  return match as E | undefined;
};

const normalizeCurrency = (value: unknown, fallback = 'RSD'): string => {
  if (typeof value !== 'string') return fallback;
  const cc = value.trim().toUpperCase();
  // dozvoli samo 3 slova (ISO 4217 stil), default RSD
  return /^[A-Z]{3}$/.test(cc) ? cc : fallback;
};

const ensureDateOrder = (issue: Date, due?: Date | null) => {
  if (!due) return;
  if (due.getTime() < issue.getTime()) {
    throw new Error('dueDate cannot be before issueDate');
  }
};

// Note: assertTaxRate replaced by isValidTaxRate from decimal.ts

const buildInvoiceLines = (lines: InvoiceLineInput[]) => {
  if (!Array.isArray(lines) || lines.length === 0) {
    throw new Error('At least one line item is required');
  }

  const invoiceLines: Prisma.InvoiceLineUncheckedCreateWithoutInvoiceInput[] = [];
  const productIds: string[] = []; // Collect productIds for validation
  
  // Parse lines and calculate totals using Decimal
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
      amount: toNumber(lineTotals.totalAmount), // ukupno sa PDV-om
    };

    // NEW: Include productId if provided (product from šifarnik)
    if (line.productId?.trim()) {
      (invoiceLine as any).productId = line.productId.trim();
      productIds.push(line.productId.trim()); // Collect for validation
    }

    invoiceLines.push(invoiceLine);
    
    return {
      quantity: toNumber(quantity),
      unitPrice: toNumber(unitPrice),
      taxRate: toNumber(taxRate),
    };
  });

  // Calculate invoice totals
  const invoiceTotals = calculateInvoiceTotals(parsedLines);

  return {
    invoiceLines,
    productIds, // Return for validation
    totals: {
      taxExclusive: toNumber(invoiceTotals.taxExclusiveAmount),
      tax: toNumber(invoiceTotals.taxAmount),
      taxInclusive: toNumber(invoiceTotals.taxInclusiveAmount),
    },
  };
};

/* ========================= Controller ========================= */

export class InvoiceController {
  /** List invoices with cursor-based pagination and filters */
  static async getAll(req: Request, res: Response) {
    try {
      const { status, type, search } = req.query;
      const user = (req as any).user;

      // Parse cursor pagination params
      const paginationParams = parseCursorPagination(req.query);

      // Build filters
      const filters: any[] = [];

      // Filter by company (user's company)
      if (user?.companyId) {
        filters.push({ companyId: user.companyId });
      }

      // Status filter
      const statusFilter = parseEnumValue(status, InvoiceStatus);
      if (statusFilter) {
        filters.push({ status: statusFilter });
      }

      // Type filter
      const typeFilter = parseEnumValue(type, InvoiceType);
      if (typeFilter) {
        filters.push({ type: typeFilter });
      }

      // Search filter (invoice number, buyer name, buyer PIB)
      const searchFilter = createSearchFilter(search as string | undefined, [
        'invoiceNumber',
        'buyerName',
        'buyerPIB',
      ]);
      if (searchFilter) {
        filters.push(searchFilter);
      }

      const where = combineFilters(...filters);

      // Build cursor query
      const query = buildCursorQuery(paginationParams, where);

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
      const result = processCursorResults(invoices, paginationParams.limit || 20);

      return res.json(result);
    } catch (error) {
      logger.error('Failed to list invoices', error);
      return res.status(500).json({ error: 'Failed to fetch invoices' });
    }
  }

  /** Retrieve single invoice by ID */
  static async getById(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const invoice = await prisma.invoice.findUnique({
        where: { id },
        include: {
          lines: true,
          company: true,
        },
      });

      if (!invoice) {
        return res.status(404).json({ error: 'Invoice not found' });
      }

      return res.json(invoice);
    } catch (error) {
      logger.error('Failed to fetch invoice', error);
      return res.status(500).json({ error: 'Failed to fetch invoice' });
    }
  }

  /** Create a new invoice */
  static async create(req: Request, res: Response) {
    try {
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
      } = req.body as CreateInvoiceBody;

      if (!companyId?.trim()) return res.status(400).json({ error: 'companyId is required' });
      if (!invoiceNumber?.trim()) return res.status(400).json({ error: 'invoiceNumber is required' });
      if (!issueDate?.trim()) return res.status(400).json({ error: 'issueDate is required' });

      // FK sanity: da firma postoji (brže failuje od FK exception-a)
      const company = await prisma.company.findUnique({ where: { id: companyId } });
      if (!company) {
        return res.status(400).json({ error: 'Company does not exist' });
      }

      // Partner integration: If partnerId is provided, fetch partner data
      let partner: any = null;
      let finalBuyerName: string;
      let finalBuyerPIB: string;
      let finalBuyerAddress: string | undefined;
      let finalBuyerCity: string | undefined;
      let finalBuyerPostalCode: string | undefined;

      if (partnerId?.trim()) {
        // Fetch partner from database
        partner = await prisma.partner.findFirst({
          where: { 
            id: partnerId,
            companyId: companyId // Ensure partner belongs to the same company
          }
        });

        if (!partner) {
          return res.status(400).json({ error: 'Partner does not exist or does not belong to this company' });
        }

        // Use partner data
        finalBuyerName = partner.name;
        finalBuyerPIB = partner.pib;
        finalBuyerAddress = partner.address;
        finalBuyerCity = partner.city;
        finalBuyerPostalCode = partner.postalCode;
      } else {
        // Legacy: Use manually entered data (backward compatibility)
        if (!buyerPIB?.trim()) {
          return res.status(400).json({ error: 'buyerPIB is required when partner is not selected' });
        }
        
        finalBuyerName = buyerName?.trim() || 'Unknown Buyer';
        finalBuyerPIB = buyerPIB!.trim(); // Safe after validation above
        finalBuyerAddress = buyerAddress?.trim();
        finalBuyerCity = buyerCity?.trim();
        finalBuyerPostalCode = buyerPostalCode?.trim();
      }

      const issueDateObj = parseDate(issueDate);
      if (!issueDateObj) return res.status(400).json({ error: 'Invalid issueDate' });

      const dueDateObj = dueDate ? parseDate(dueDate) : null;
      if (dueDate && !dueDateObj) return res.status(400).json({ error: 'Invalid dueDate' });
      try {
        ensureDateOrder(issueDateObj, dueDateObj);
      } catch (e: any) {
        return res.status(400).json({ error: e.message || 'Invalid date order' });
      }

      let invoiceLinesData: ReturnType<typeof buildInvoiceLines>;
      try {
        invoiceLinesData = buildInvoiceLines(lines);
      } catch (validationError: any) {
        return res.status(400).json({ error: validationError?.message || 'Invalid invoice lines' });
      }

      // Validate products if productIds were provided
      if (invoiceLinesData.productIds.length > 0) {
        const products = await (prisma as any).product.findMany({
          where: {
            id: { in: invoiceLinesData.productIds },
            companyId: companyId
          },
          select: { 
            id: true,
            name: true,
            trackInventory: true,
            currentStock: true,
          }
        });

        if (products.length !== invoiceLinesData.productIds.length) {
          const foundIds = products.map((p: any) => p.id);
          const missingIds = invoiceLinesData.productIds.filter(id => !foundIds.includes(id));
          return res.status(400).json({
            error: 'Some products do not exist or do not belong to this company',
            details: { missingProductIds: missingIds }
          });
        }

        // Stock auto-deduction: Check if company has this feature enabled
        if (company.autoStockDeduction) {
          // Create a map of productId -> requested quantity
          const lineQuantities = new Map<string, number>();
          lines.forEach((line) => {
            if (line.productId) {
              const existing = lineQuantities.get(line.productId) || 0;
              lineQuantities.set(line.productId, existing + Number(line.quantity));
            }
          });

          // Validate stock availability for each product
          for (const product of products) {
            if (product.trackInventory) {
              const requestedQty = lineQuantities.get(product.id) || 0;
              const availableStock = Number(product.currentStock);

              if (availableStock < requestedQty) {
                return res.status(400).json({
                  error: 'Insufficient stock',
                  details: {
                    productId: product.id,
                    productName: product.name,
                    available: availableStock,
                    requested: requestedQty,
                    shortfall: requestedQty - availableStock,
                  }
                });
              }
            }
          }
        }
      }

      const invoiceType = parseEnumValue(type, InvoiceType) ?? InvoiceType.OUTGOING;
      const currencyCode = normalizeCurrency(currency);

      // Jedinstvenost broja fakture u okviru kompanije (poželjno pravilo)
      const existing = await prisma.invoice.findFirst({
        where: { companyId, invoiceNumber },
        select: { id: true },
      });
      if (existing) {
        return res.status(409).json({ error: 'Invoice number already exists for this company' });
      }

      const created = await prisma.invoice.create({
        data: {
          companyId,
          partnerId: partnerId?.trim() || null, // NEW: Store partnerId reference
          invoiceNumber: invoiceNumber.trim(),
          issueDate: issueDateObj,
          dueDate: dueDateObj ?? undefined,
          currency: currencyCode,
          note,
          type: invoiceType,
          // Buyer fields (from partner or manual input)
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
          partner: true, // Include partner data in response
        },
      });

      // Stock auto-deduction: Atomically decrement stock for products with trackInventory = true
      if (company.autoStockDeduction && invoiceLinesData.productIds.length > 0) {
        // Create a map of productId -> total quantity to deduct
        const lineQuantities = new Map<string, number>();
        lines.forEach((line) => {
          if (line.productId) {
            const existing = lineQuantities.get(line.productId) || 0;
            lineQuantities.set(line.productId, existing + Number(line.quantity));
          }
        });

        // Atomic decrement for each product (only if trackInventory = true)
        const stockUpdates = Array.from(lineQuantities.entries()).map(async ([productId, quantity]) => {
          // Use updateMany with WHERE condition to ensure trackInventory = true
          return (prisma as any).product.updateMany({
            where: {
              id: productId,
              trackInventory: true,
            },
            data: {
              currentStock: {
                decrement: quantity,
              },
            },
          });
        });

        await Promise.all(stockUpdates);
        
        logger.info(`Stock deducted for invoice ${created.id}`, {
          invoiceId: created.id,
          products: Array.from(lineQuantities.entries()).map(([id, qty]) => ({ productId: id, quantity: qty })),
        });
      }

      logger.info(`Invoice created: ${created.id}`);
      return res.status(201).json(created);
    } catch (error: any) {
      logger.error('Failed to create invoice', error);
      // Prisma unique constraint fallback
      if (error?.code === 'P2002') {
        return res.status(409).json({ error: 'Invoice number must be unique' });
      }
      return res.status(500).json({ error: 'Failed to create invoice' });
    }
  }

  /** Update invoice metadata (only while draft) */
  static async update(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const updateData = req.body as UpdateInvoiceBody;

      const invoice = await prisma.invoice.findUnique({ where: { id } });
      if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

      if (invoice.status !== InvoiceStatus.DRAFT) {
        return res.status(400).json({ error: 'Only drafts can be updated' });
      }

      const data: Prisma.InvoiceUpdateInput = {};

      if (typeof updateData.buyerName === 'string') data.buyerName = updateData.buyerName.trim();
      if (typeof updateData.buyerPIB === 'string') data.buyerPIB = updateData.buyerPIB.trim();
      if (typeof updateData.buyerAddress === 'string') data.buyerAddress = updateData.buyerAddress.trim();
      if (typeof updateData.buyerCity === 'string') data.buyerCity = updateData.buyerCity.trim();
      if (typeof updateData.buyerPostalCode === 'string') data.buyerPostalCode = updateData.buyerPostalCode.trim();
      if (typeof updateData.currency === 'string') data.currency = normalizeCurrency(updateData.currency);
      if (typeof updateData.note === 'string') data.note = updateData.note;

      if (typeof updateData.dueDate === 'string') {
        const parsed = parseDate(updateData.dueDate);
        if (!parsed) return res.status(400).json({ error: 'Invalid dueDate' });
        try {
          ensureDateOrder(invoice.issueDate, parsed);
        } catch (e: any) {
          return res.status(400).json({ error: e.message || 'Invalid date order' });
        }
        data.dueDate = parsed;
      }

      const updated = await prisma.invoice.update({
        where: { id },
        data,
        include: {
          lines: true,
          company: true,
        },
      });

      logger.info(`Invoice updated: ${id}`);
      return res.json(updated);
    } catch (error) {
      logger.error('Failed to update invoice', error);
      return res.status(500).json({ error: 'Failed to update invoice' });
    }
  }

  /** Delete invoice (only drafts) */
  static async delete(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const invoice = await prisma.invoice.findUnique({ 
        where: { id },
        include: {
          lines: true,
          company: {
            select: { autoStockDeduction: true }
          }
        }
      });
      
      if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

      if (invoice.status !== InvoiceStatus.DRAFT) {
        return res.status(400).json({ error: 'Only drafts can be deleted' });
      }

      // Stock restoration: If auto-deduction was enabled, restore stock for products
      if (invoice.company?.autoStockDeduction) {
        // Collect productIds and quantities from invoice lines
        const productQuantities = new Map<string, number>();
        
        invoice.lines.forEach((line: any) => {
          if (line.productId) {
            const existing = productQuantities.get(line.productId) || 0;
            productQuantities.set(line.productId, existing + Number(line.quantity));
          }
        });

        // Atomic increment to restore stock
        if (productQuantities.size > 0) {
          const stockRestores = Array.from(productQuantities.entries()).map(async ([productId, quantity]) => {
            return (prisma as any).product.updateMany({
              where: {
                id: productId,
                trackInventory: true,
              },
              data: {
                currentStock: {
                  increment: quantity,
                },
              },
            });
          });

          await Promise.all(stockRestores);
          
          logger.info(`Stock restored for deleted invoice ${id}`, {
            invoiceId: id,
            products: Array.from(productQuantities.entries()).map(([pid, qty]) => ({ productId: pid, quantity: qty })),
          });
        }
      }

      await prisma.invoice.delete({ where: { id } });
      logger.info(`Invoice deleted: ${id}`);
      return res.json({ message: 'Invoice deleted successfully' });
    } catch (error) {
      logger.error('Failed to delete invoice', error);
      return res.status(500).json({ error: 'Failed to delete invoice' });
    }
  }

  /** Send invoice to SEF system (via queue) */
  static async sendToSEF(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = (req as any).user?.id; // From auth middleware

      const invoice = await prisma.invoice.findUnique({
        where: { id },
        include: {
          lines: true,
          company: true,
        },
      });

      if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
      if (invoice.status !== InvoiceStatus.DRAFT) {
        return res.status(400).json({ error: 'Invoice has already been processed' });
      }
      if (!invoice.company) {
        return res.status(400).json({ error: 'Issuer company is missing' });
      }
      if (!invoice.company.sefApiKey) {
        return res.status(400).json({ error: 'Company does not have SEF API key configured' });
      }

      // Validate invoice data before queuing
      const ublData = {
        invoiceNumber: invoice.invoiceNumber,
        issueDate: invoice.issueDate, // Zod will coerce to Date
        dueDate: invoice.dueDate || undefined, // Zod will coerce to Date
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
          pib: invoice.buyerPIB,
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
          taxExclusiveAmount: toNumber(toTwo(Number(invoice.totalAmount) - Number(invoice.taxAmount))),
          taxInclusiveAmount: toNumber(toTwo(Number(invoice.totalAmount))),
          taxAmount: toNumber(toTwo(Number(invoice.taxAmount))),
          payableAmount: toNumber(toTwo(Number(invoice.totalAmount))),
        },
      };

      const validation = UBLGenerator.validateInvoice(ublData);
      if (!validation.valid) {
        return res.status(400).json({
          error: 'Invalid invoice data',
          details: validation.errors,
        });
      }

      // Queue the invoice for processing
      const job = await queueInvoice({
        invoiceId: invoice.id,
        companyId: invoice.companyId,
        userId,
      });

      logger.info(`Invoice ${id} queued for SEF submission`, { jobId: job.id });
      
      return res.json({ 
        message: 'Invoice queued for processing',
        jobId: job.id,
        invoiceId: invoice.id,
        estimatedProcessingTime: '1-2 minutes'
      });
    } catch (error) {
      logger.error('Failed to queue invoice for SEF', error);
      return res.status(500).json({ error: 'Failed to queue invoice for SEF' });
    }
  }

  /** Retrieve latest status from SEF */
  static async getStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const invoice = await prisma.invoice.findUnique({ where: { id } });
      if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
      if (!invoice.sefId) return res.status(400).json({ error: 'Invoice has not been sent to SEF' });

      const sefStatus = await sefService.getInvoiceStatus(invoice.sefId);

      if (sefStatus?.status && sefStatus.status !== invoice.sefStatus) {
        await prisma.invoice.update({
          where: { id },
          data: { sefStatus: sefStatus.status },
        });
      }

      return res.json(sefStatus);
    } catch (error) {
      logger.error('Failed to get SEF status', error);
      return res.status(500).json({ error: 'Failed to get invoice status' });
    }
  }

  /** Cancel invoice in SEF system */
  static async cancel(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { reason } = req.body as { reason?: string };

      const invoice = await prisma.invoice.findUnique({ 
        where: { id },
        include: {
          lines: true,
          company: {
            select: { autoStockDeduction: true }
          }
        }
      });
      
      if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
      if (!invoice.sefId) return res.status(400).json({ error: 'Invoice has not been sent to SEF' });

      const sefResponse = await sefService.cancelInvoice(invoice.sefId, reason);

      const updated = await prisma.invoice.update({
        where: { id },
        data: {
          status: InvoiceStatus.CANCELLED,
          sefStatus: sefResponse?.status ?? 'CANCELLED',
        },
      });

      // Stock restoration: If auto-deduction was enabled, restore stock for cancelled invoice
      if (invoice.company?.autoStockDeduction) {
        const productQuantities = new Map<string, number>();
        
        invoice.lines.forEach((line: any) => {
          if (line.productId) {
            const existing = productQuantities.get(line.productId) || 0;
            productQuantities.set(line.productId, existing + Number(line.quantity));
          }
        });

        if (productQuantities.size > 0) {
          const stockRestores = Array.from(productQuantities.entries()).map(async ([productId, quantity]) => {
            return (prisma as any).product.updateMany({
              where: {
                id: productId,
                trackInventory: true,
              },
              data: {
                currentStock: {
                  increment: quantity,
                },
              },
            });
          });

          await Promise.all(stockRestores);
          
          logger.info(`Stock restored for cancelled invoice ${id}`, {
            invoiceId: id,
            products: Array.from(productQuantities.entries()).map(([pid, qty]) => ({ productId: pid, quantity: qty })),
          });
        }
      }

      logger.info(`Invoice ${id} cancelled in SEF`);
      return res.json({ invoice: updated, sefResponse });
    } catch (error) {
      logger.error('Failed to cancel invoice', error);
      return res.status(500).json({ error: 'Failed to cancel invoice' });
    }
  }
}
