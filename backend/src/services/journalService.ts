/**
 * Journal Entry (Nalog za Knjiženje) Service
 * Implements double-entry bookkeeping
 */

import { prisma } from '../db/prisma';
import { JournalStatus, JournalType, Prisma } from '@prisma/client';
import { logger } from '../utils/logger';
import { z } from 'zod';
import { toDecimal, toNumber } from '../utils/decimal';
import cacheService from './cacheService';

// ========================================
// VALIDATION SCHEMAS
// ========================================

const JournalLineSchema = z.object({
  accountId: z.string().uuid(),
  debitAmount: z.number().min(0).optional().default(0),
  creditAmount: z.number().min(0).optional().default(0),
  description: z.string().optional(),
  partnerId: z.string().uuid().optional(),
}).refine(
  (data) => data.debitAmount > 0 || data.creditAmount > 0,
  { message: 'Either debit or credit amount must be greater than 0' }
).refine(
  (data) => !(data.debitAmount > 0 && data.creditAmount > 0),
  { message: 'Cannot have both debit and credit on the same line' }
);

export const CreateJournalEntrySchema = z.object({
  date: z.coerce.date(),
  description: z.string().min(1).max(1000),
  type: z.nativeEnum(JournalType).optional().default(JournalType.MANUAL),
  referenceType: z.string().optional(),
  referenceId: z.string().uuid().optional(),
  lines: z.array(JournalLineSchema).min(2),
}).refine(
  (data) => {
    const totalDebit = data.lines.reduce((sum, line) => sum + (line.debitAmount || 0), 0);
    const totalCredit = data.lines.reduce((sum, line) => sum + (line.creditAmount || 0), 0);
    return Math.abs(totalDebit - totalCredit) < 0.01;
  },
  { message: 'Journal entry must be balanced (total debit must equal total credit)' }
);

export const UpdateJournalEntrySchema = z.object({
  date: z.coerce.date().optional(),
  description: z.string().min(1).max(1000).optional(),
  lines: z.array(JournalLineSchema).min(2).optional(),
}).refine(
  (data) => {
    if (!data.lines) return true;
    const totalDebit = data.lines.reduce((sum, line) => sum + (line.debitAmount || 0), 0);
    const totalCredit = data.lines.reduce((sum, line) => sum + (line.creditAmount || 0), 0);
    return Math.abs(totalDebit - totalCredit) < 0.01;
  },
  { message: 'Journal entry must be balanced' }
);

export type CreateJournalEntryDTO = z.infer<typeof CreateJournalEntrySchema>;
export type UpdateJournalEntryDTO = z.infer<typeof UpdateJournalEntrySchema>;

// ========================================
// SERVICE CLASS
// ========================================

export class JournalService {
  /**
   * Get or create fiscal year for a date
   */
  private static async getOrCreateFiscalYear(companyId: string, date: Date): Promise<string> {
    const year = date.getFullYear();
    
    let fiscalYear = await prisma.fiscalYear.findUnique({
      where: {
        companyId_year: { companyId, year },
      },
    });

    if (!fiscalYear) {
      fiscalYear = await prisma.fiscalYear.create({
        data: {
          year,
          startDate: new Date(year, 0, 1),
          endDate: new Date(year, 11, 31),
          companyId,
        },
      });
      logger.info(`Created fiscal year ${year} for company ${companyId}`);
    }

    if (fiscalYear.status === 'CLOSED') {
      throw new Error(`Fiscal year ${year} is closed. Cannot create entries.`);
    }

    return fiscalYear.id;
  }

  /**
   * Generate next entry number
   */
  private static async generateEntryNumber(companyId: string, fiscalYearId: string): Promise<string> {
    const lastEntry = await prisma.journalEntry.findFirst({
      where: { companyId, fiscalYearId },
      orderBy: { entryNumber: 'desc' },
      select: { entryNumber: true },
    });

    const lastNumber = lastEntry 
      ? parseInt(lastEntry.entryNumber.split('-').pop() || '0') 
      : 0;
    
    const fiscalYear = await prisma.fiscalYear.findUnique({
      where: { id: fiscalYearId },
      select: { year: true },
    });

    return `${fiscalYear?.year || new Date().getFullYear()}-${String(lastNumber + 1).padStart(6, '0')}`;
  }

  /**
   * Create a new journal entry
   */
  static async createJournalEntry(
    companyId: string,
    data: CreateJournalEntryDTO,
    userId: string
  ) {
    // Get or create fiscal year
    const fiscalYearId = await this.getOrCreateFiscalYear(companyId, data.date);
    
    // Generate entry number
    const entryNumber = await this.generateEntryNumber(companyId, fiscalYearId);

    // Validate all accounts exist and belong to company
    const accountIds = [...new Set(data.lines.map(l => l.accountId))];
    const accounts = await prisma.account.findMany({
      where: {
        id: { in: accountIds },
        companyId,
        isActive: true,
      },
    });

    if (accounts.length !== accountIds.length) {
      throw new Error('One or more accounts are invalid or inactive');
    }

    // Calculate totals
    const totalDebit = toNumber(toDecimal(
      data.lines.reduce((sum, l) => sum + (l.debitAmount || 0), 0)
    ));
    const totalCredit = toNumber(toDecimal(
      data.lines.reduce((sum, l) => sum + (l.creditAmount || 0), 0)
    ));

    // Create entry with lines
    const entry = await prisma.journalEntry.create({
      data: {
        entryNumber,
        date: data.date,
        description: data.description,
        type: data.type,
        referenceType: data.referenceType,
        referenceId: data.referenceId,
        fiscalYearId,
        totalDebit,
        totalCredit,
        companyId,
        createdBy: userId,
        lines: {
          create: data.lines.map((line, index) => ({
            lineNumber: index + 1,
            accountId: line.accountId,
            debitAmount: line.debitAmount || 0,
            creditAmount: line.creditAmount || 0,
            description: line.description,
            partnerId: line.partnerId,
          })),
        },
      },
      include: {
        lines: {
          include: {
            account: {
              select: {
                id: true,
                code: true,
                name: true,
              },
            },
          },
          orderBy: { lineNumber: 'asc' },
        },
        fiscalYear: true,
      },
    });

    logger.info(`Journal entry created: ${entryNumber}`, { companyId, userId });
    
    // Invalidate dashboard cache
    await cacheService.invalidate.dashboard(companyId);

    return entry;
  }

  /**
   * Update a journal entry (only drafts)
   */
  static async updateJournalEntry(
    id: string,
    companyId: string,
    data: UpdateJournalEntryDTO,
    userId: string
  ) {
    const entry = await prisma.journalEntry.findFirst({
      where: { id, companyId },
    });

    if (!entry) {
      throw new Error('Journal entry not found');
    }

    if (entry.status !== JournalStatus.DRAFT) {
      throw new Error('Only draft entries can be updated');
    }

    const updateData: Prisma.JournalEntryUpdateInput = {};

    if (data.date) {
      updateData.date = data.date;
    }
    if (data.description) {
      updateData.description = data.description;
    }

    if (data.lines) {
      // Validate accounts
      const accountIds = [...new Set(data.lines.map(l => l.accountId))];
      const accounts = await prisma.account.findMany({
        where: { id: { in: accountIds }, companyId, isActive: true },
      });

      if (accounts.length !== accountIds.length) {
        throw new Error('One or more accounts are invalid or inactive');
      }

      // Calculate new totals
      updateData.totalDebit = toNumber(toDecimal(
        data.lines.reduce((sum, l) => sum + (l.debitAmount || 0), 0)
      ));
      updateData.totalCredit = toNumber(toDecimal(
        data.lines.reduce((sum, l) => sum + (l.creditAmount || 0), 0)
      ));

      // Delete existing lines and create new ones
      await prisma.journalLine.deleteMany({
        where: { journalEntryId: id },
      });

      updateData.lines = {
        create: data.lines.map((line, index) => ({
          lineNumber: index + 1,
          accountId: line.accountId,
          debitAmount: line.debitAmount || 0,
          creditAmount: line.creditAmount || 0,
          description: line.description,
          partnerId: line.partnerId,
        })),
      };
    }

    const updated = await prisma.journalEntry.update({
      where: { id },
      data: updateData,
      include: {
        lines: {
          include: {
            account: {
              select: { id: true, code: true, name: true },
            },
          },
          orderBy: { lineNumber: 'asc' },
        },
        fiscalYear: true,
      },
    });

    logger.info(`Journal entry updated: ${entry.entryNumber}`, { id, userId });
    return updated;
  }

  /**
   * Post a journal entry (make it permanent)
   */
  static async postJournalEntry(id: string, companyId: string, userId: string) {
    const entry = await prisma.journalEntry.findFirst({
      where: { id, companyId },
      include: { lines: true, fiscalYear: true },
    });

    if (!entry) {
      throw new Error('Journal entry not found');
    }

    if (entry.status !== JournalStatus.DRAFT) {
      throw new Error('Only draft entries can be posted');
    }

    if (entry.fiscalYear.status === 'CLOSED') {
      throw new Error('Cannot post to a closed fiscal year');
    }

    // Verify balanced
    const totalDebit = entry.lines.reduce((sum, l) => sum + Number(l.debitAmount), 0);
    const totalCredit = entry.lines.reduce((sum, l) => sum + Number(l.creditAmount), 0);

    if (Math.abs(totalDebit - totalCredit) >= 0.01) {
      throw new Error('Journal entry is not balanced');
    }

    const posted = await prisma.journalEntry.update({
      where: { id },
      data: {
        status: JournalStatus.POSTED,
        postedAt: new Date(),
        postedBy: userId,
      },
      include: {
        lines: {
          include: {
            account: { select: { id: true, code: true, name: true } },
          },
        },
      },
    });

    logger.info(`Journal entry posted: ${entry.entryNumber}`, { id, userId });
    
    // Invalidate dashboard cache
    await cacheService.invalidate.dashboard(companyId);

    return posted;
  }

  /**
   * Reverse (storno) a posted entry
   */
  static async reverseJournalEntry(
    id: string,
    companyId: string,
    userId: string,
    reason: string
  ) {
    const entry = await prisma.journalEntry.findFirst({
      where: { id, companyId },
      include: { lines: true },
    });

    if (!entry) {
      throw new Error('Journal entry not found');
    }

    if (entry.status !== JournalStatus.POSTED) {
      throw new Error('Only posted entries can be reversed');
    }

    // Get fiscal year for today (reversal date)
    const fiscalYearId = await this.getOrCreateFiscalYear(companyId, new Date());
    const entryNumber = await this.generateEntryNumber(companyId, fiscalYearId);

    // Create reversal entry (swap debit/credit)
    const reversalEntry = await prisma.$transaction(async (tx) => {
      // Mark original as reversed
      await tx.journalEntry.update({
        where: { id },
        data: { status: JournalStatus.REVERSED },
      });

      // Create reversal
      const reversal = await tx.journalEntry.create({
        data: {
          entryNumber,
          date: new Date(),
          description: `STORNO: ${entry.description} - ${reason}`,
          type: JournalType.ADJUSTMENT,
          referenceType: 'journal_entry',
          referenceId: id,
          fiscalYearId,
          status: JournalStatus.POSTED,
          postedAt: new Date(),
          postedBy: userId,
          totalDebit: entry.totalCredit, // Swapped
          totalCredit: entry.totalDebit, // Swapped
          companyId,
          createdBy: userId,
          lines: {
            create: entry.lines.map((line, index) => ({
              lineNumber: index + 1,
              accountId: line.accountId,
              debitAmount: line.creditAmount, // Swapped
              creditAmount: line.debitAmount, // Swapped
              description: `STORNO: ${line.description || ''}`,
              partnerId: line.partnerId,
            })),
          },
        },
        include: {
          lines: {
            include: {
              account: { select: { id: true, code: true, name: true } },
            },
          },
        },
      });

      return reversal;
    });

    logger.info(`Journal entry reversed: ${entry.entryNumber} -> ${reversalEntry.entryNumber}`);
    
    // Invalidate cache
    await cacheService.invalidate.dashboard(companyId);

    return reversalEntry;
  }

  /**
   * Delete a draft journal entry
   */
  static async deleteJournalEntry(id: string, companyId: string) {
    const entry = await prisma.journalEntry.findFirst({
      where: { id, companyId },
    });

    if (!entry) {
      throw new Error('Journal entry not found');
    }

    if (entry.status !== JournalStatus.DRAFT) {
      throw new Error('Only draft entries can be deleted');
    }

    await prisma.journalEntry.delete({ where: { id } });

    logger.info(`Journal entry deleted: ${entry.entryNumber}`);
    return { message: 'Journal entry deleted' };
  }

  /**
   * Get journal entry by ID
   */
  static async getJournalEntry(id: string, companyId: string) {
    const entry = await prisma.journalEntry.findFirst({
      where: { id, companyId },
      include: {
        lines: {
          include: {
            account: {
              select: { id: true, code: true, name: true, type: true },
            },
          },
          orderBy: { lineNumber: 'asc' },
        },
        fiscalYear: true,
      },
    });

    if (!entry) {
      throw new Error('Journal entry not found');
    }

    return entry;
  }

  /**
   * List journal entries with pagination
   */
  static async listJournalEntries(
    companyId: string,
    options?: {
      page?: number;
      limit?: number;
      status?: JournalStatus;
      type?: JournalType;
      fiscalYearId?: string;
      fromDate?: Date;
      toDate?: Date;
      search?: string;
    }
  ) {
    const page = options?.page || 1;
    const limit = options?.limit || 50;
    const skip = (page - 1) * limit;

    const where: Prisma.JournalEntryWhereInput = { companyId };

    if (options?.status) {
      where.status = options.status;
    }
    if (options?.type) {
      where.type = options.type;
    }
    if (options?.fiscalYearId) {
      where.fiscalYearId = options.fiscalYearId;
    }
    if (options?.fromDate || options?.toDate) {
      where.date = {};
      if (options.fromDate) where.date.gte = options.fromDate;
      if (options.toDate) where.date.lte = options.toDate;
    }
    if (options?.search) {
      where.OR = [
        { entryNumber: { contains: options.search } },
        { description: { contains: options.search, mode: 'insensitive' } },
      ];
    }

    const [entries, total] = await Promise.all([
      prisma.journalEntry.findMany({
        where,
        include: {
          lines: {
            include: {
              account: { select: { id: true, code: true, name: true } },
            },
            orderBy: { lineNumber: 'asc' },
          },
          fiscalYear: { select: { year: true } },
        },
        orderBy: { date: 'desc' },
        skip,
        take: limit,
      }),
      prisma.journalEntry.count({ where }),
    ]);

    return {
      data: entries,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get general ledger (Glavna Knjiga) for an account
   */
  static async getGeneralLedger(
    companyId: string,
    accountId: string,
    options?: {
      fromDate?: Date;
      toDate?: Date;
      fiscalYearId?: string;
    }
  ) {
    const account = await prisma.account.findFirst({
      where: { id: accountId, companyId },
    });

    if (!account) {
      throw new Error('Account not found');
    }

    const where: Prisma.JournalLineWhereInput = {
      accountId,
      journalEntry: {
        companyId,
        status: JournalStatus.POSTED,
        ...(options?.fiscalYearId && { fiscalYearId: options.fiscalYearId }),
        ...(options?.fromDate && { date: { gte: options.fromDate } }),
        ...(options?.toDate && { date: { lte: options.toDate } }),
      },
    };

    const lines = await prisma.journalLine.findMany({
      where,
      include: {
        journalEntry: {
          select: {
            id: true,
            entryNumber: true,
            date: true,
            description: true,
          },
        },
      },
      orderBy: {
        journalEntry: { date: 'asc' },
      },
    });

    // Calculate running balance
    let runningBalance = 0;
    const ledger = lines.map((line) => {
      const debit = Number(line.debitAmount);
      const credit = Number(line.creditAmount);
      
      runningBalance += account.normalSide === 'DEBIT' 
        ? (debit - credit) 
        : (credit - debit);

      return {
        date: line.journalEntry.date,
        entryNumber: line.journalEntry.entryNumber,
        description: line.description || line.journalEntry.description,
        debit,
        credit,
        balance: runningBalance,
        journalEntryId: line.journalEntry.id,
      };
    });

    return {
      account: {
        id: account.id,
        code: account.code,
        name: account.name,
        normalSide: account.normalSide,
      },
      entries: ledger,
      summary: {
        totalDebit: lines.reduce((sum, l) => sum + Number(l.debitAmount), 0),
        totalCredit: lines.reduce((sum, l) => sum + Number(l.creditAmount), 0),
        closingBalance: runningBalance,
      },
    };
  }

  /**
   * Auto-post invoice to journal
   */
  static async postInvoiceToJournal(
    invoiceId: string,
    companyId: string,
    userId: string
  ) {
    const invoice = await prisma.invoice.findFirst({
      where: { id: invoiceId, companyId },
      include: { lines: true, partner: true },
    });

    if (!invoice) {
      throw new Error('Invoice not found');
    }

    // Get standard accounts
    const revenueAccount = await prisma.account.findFirst({
      where: { companyId, code: { startsWith: '61' }, isActive: true },
      orderBy: { code: 'asc' },
    });
    const vatAccount = await prisma.account.findFirst({
      where: { companyId, code: { startsWith: '470' }, isActive: true },
      orderBy: { code: 'asc' },
    });
    const receivableAccount = await prisma.account.findFirst({
      where: { companyId, code: { startsWith: '204' }, isActive: true },
      orderBy: { code: 'asc' },
    });

    if (!revenueAccount || !vatAccount || !receivableAccount) {
      throw new Error('Required accounts not found. Initialize chart of accounts first.');
    }

    const totalWithoutVAT = Number(invoice.totalAmount) - Number(invoice.taxAmount);
    const vatAmount = Number(invoice.taxAmount);
    const totalAmount = Number(invoice.totalAmount);

    // Create journal entry
    // Debit: Receivables (2040)
    // Credit: Revenue (61xx), VAT (470)
    const entry = await this.createJournalEntry(
      companyId,
      {
        date: invoice.issueDate,
        description: `Faktura ${invoice.invoiceNumber} - ${invoice.buyerName || invoice.partner?.name || 'Kupac'}`,
        type: JournalType.INVOICE,
        referenceType: 'invoice',
        referenceId: invoiceId,
        lines: [
          {
            accountId: receivableAccount.id,
            debitAmount: totalAmount,
            creditAmount: 0,
            partnerId: invoice.partnerId || undefined,
          },
          {
            accountId: revenueAccount.id,
            debitAmount: 0,
            creditAmount: totalWithoutVAT,
          },
          {
            accountId: vatAccount.id,
            debitAmount: 0,
            creditAmount: vatAmount,
          },
        ],
      },
      userId
    );

    // Auto-post
    await this.postJournalEntry(entry.id, companyId, userId);

    return entry;
  }
}

export default JournalService;
