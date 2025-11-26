import { prisma } from '../db/prisma';
import { RecurringInvoice, RecurringFrequency, RecurringInvoiceStatus, Prisma } from '@prisma/client';
import { InvoiceService } from './invoiceService';
import { logger } from '../utils/logger';
import { addDays, addMonths, addYears, addQuarters, startOfDay } from 'date-fns';

export class RecurringInvoiceService {
  /**
   * Create a new recurring invoice profile
   */
  static async create(data: {
    companyId: string;
    partnerId: string;
    frequency: RecurringFrequency;
    startDate: Date;
    endDate?: Date;
    items: any[];
    currency?: string;
    note?: string;
    createdBy: string;
  }) {
    const nextRunAt = startOfDay(data.startDate);

    return prisma.recurringInvoice.create({
      data: {
        companyId: data.companyId,
        partnerId: data.partnerId,
        frequency: data.frequency,
        startDate: data.startDate,
        endDate: data.endDate,
        nextRunAt,
        items: data.items,
        currency: data.currency || 'RSD',
        note: data.note,
        createdBy: data.createdBy,
        status: RecurringInvoiceStatus.ACTIVE
      }
    });
  }

  /**
   * Process due recurring invoices
   * This should be called by a cron job daily
   */
  static async processDueInvoices() {
    const now = new Date();
    logger.info('Starting recurring invoice processing...');

    // Find all active recurring invoices that are due
    const dueInvoices = await prisma.recurringInvoice.findMany({
      where: {
        status: RecurringInvoiceStatus.ACTIVE,
        nextRunAt: { lte: now },
        OR: [
          { endDate: null },
          { endDate: { gte: now } }
        ]
      },
      include: {
        partner: true,
        company: true
      }
    });

    logger.info(`Found ${dueInvoices.length} recurring invoices to process`);

    const results = {
      success: 0,
      failed: 0,
      errors: [] as any[]
    };

    for (const recurring of dueInvoices) {
      try {
        await prisma.$transaction(async (tx) => {
          // 1. Generate the invoice
          // We need to map the recurring template to InvoiceCreateInput
          // This is a simplified version, assuming InvoiceService.create handles the heavy lifting
          
          // Calculate due date (e.g., 15 days from now)
          const issueDate = new Date();
          const dueDate = addDays(issueDate, recurring.partner.defaultPaymentTerms || 15);

          // Create the invoice using InvoiceService (or direct Prisma call if Service is too tied to Request)
          // We'll use direct Prisma call here to avoid circular dependencies or complex request mocking
          
          // Calculate totals
          const items = recurring.items as any[];
          let totalAmount = new Prisma.Decimal(0);
          let taxAmount = new Prisma.Decimal(0);

          const lines = items.map((item: any, index: number) => {
            const quantity = new Prisma.Decimal(item.quantity);
            const price = new Prisma.Decimal(item.price);
            const taxRate = new Prisma.Decimal(item.vatRate || 20);
            
            const lineAmount = quantity.mul(price);
            const lineTax = lineAmount.mul(taxRate).div(100);
            
            totalAmount = totalAmount.add(lineAmount).add(lineTax);
            taxAmount = taxAmount.add(lineTax);

            return {
              lineNumber: index + 1,
              itemName: item.name,
              quantity,
              unit: item.unit || 'kom',
              unitPrice: price,
              taxRate,
              taxAmount: lineTax,
              amount: lineAmount.add(lineTax)
            };
          });

          // Generate invoice number (simplified - usually handled by a service)
          const year = issueDate.getFullYear();
          const count = await tx.invoice.count({
            where: { 
              companyId: recurring.companyId,
              issueDate: {
                gte: new Date(year, 0, 1),
                lt: new Date(year + 1, 0, 1)
              }
            }
          });
          const invoiceNumber = `${year}-${String(count + 1).padStart(6, '0')}`;

          const invoice = await tx.invoice.create({
            data: {
              companyId: recurring.companyId,
              partnerId: recurring.partnerId,
              invoiceNumber,
              issueDate,
              dueDate,
              totalAmount,
              taxAmount,
              currency: recurring.currency,
              status: 'DRAFT', // Created as draft first
              type: 'OUTGOING',
              note: recurring.note,
              lines: {
                create: lines
              }
            }
          });

          // 2. Update the recurring invoice next run date
          let nextRun = new Date(recurring.nextRunAt);
          switch (recurring.frequency) {
            case RecurringFrequency.WEEKLY:
              nextRun = addDays(nextRun, 7);
              break;
            case RecurringFrequency.MONTHLY:
              nextRun = addMonths(nextRun, 1);
              break;
            case RecurringFrequency.QUARTERLY:
              nextRun = addMonths(nextRun, 3);
              break;
            case RecurringFrequency.YEARLY:
              nextRun = addYears(nextRun, 1);
              break;
          }

          // Check if next run is after end date
          let status = recurring.status;
          if (recurring.endDate && nextRun > recurring.endDate) {
            status = RecurringInvoiceStatus.COMPLETED;
          }

          await tx.recurringInvoice.update({
            where: { id: recurring.id },
            data: {
              lastRunAt: now,
              nextRunAt: nextRun,
              status
            }
          });

          logger.info(`Generated invoice ${invoice.invoiceNumber} from recurring profile ${recurring.id}`);
        });
        results.success++;
      } catch (error) {
        logger.error(`Failed to process recurring invoice ${recurring.id}`, error);
        results.failed++;
        results.errors.push({ id: recurring.id, error });
      }
    }

    return results;
  }

  /**
   * Get all recurring invoices for a company
   */
  static async getAll(companyId: string) {
    return prisma.recurringInvoice.findMany({
      where: { companyId },
      include: { partner: true },
      orderBy: { createdAt: 'desc' }
    });
  }

  /**
   * Get a single recurring invoice
   */
  static async getById(id: string, companyId: string) {
    return prisma.recurringInvoice.findFirst({
      where: { id, companyId },
      include: { partner: true }
    });
  }

  /**
   * Update a recurring invoice
   */
  static async update(id: string, companyId: string, data: Partial<RecurringInvoice>) {
    const { id: _, companyId: __, ...updateData } = data;
    return prisma.recurringInvoice.update({
      where: { id, companyId },
      data: updateData as any
    });
  }

  /**
   * Delete (cancel) a recurring invoice
   */
  static async delete(id: string, companyId: string) {
    return prisma.recurringInvoice.update({
      where: { id, companyId },
      data: { status: RecurringInvoiceStatus.CANCELLED }
    });
  }
}
