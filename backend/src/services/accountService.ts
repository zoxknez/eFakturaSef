/**
 * Chart of Accounts (Kontni Plan) Service
 * Implements Serbian accounting standards (Pravilnik o kontnom okviru)
 */

import { prisma } from '../db/prisma';
import { AccountType, AccountSide, Prisma } from '@prisma/client';
import { logger } from '../utils/logger';
import { z } from 'zod';

// ========================================
// VALIDATION SCHEMAS
// ========================================

export const CreateAccountSchema = z.object({
  code: z.string().min(1).max(10).regex(/^\d+$/, 'Code must contain only digits'),
  name: z.string().min(1).max(255),
  nameEn: z.string().max(255).optional(),
  description: z.string().optional(),
  type: z.nativeEnum(AccountType),
  normalSide: z.nativeEnum(AccountSide),
  parentId: z.string().uuid().optional(),
  isActive: z.boolean().optional().default(true),
});

export const UpdateAccountSchema = CreateAccountSchema.partial().omit({ code: true });

export type CreateAccountDTO = z.infer<typeof CreateAccountSchema>;
export type UpdateAccountDTO = z.infer<typeof UpdateAccountSchema>;

// ========================================
// SERBIAN STANDARD CHART OF ACCOUNTS
// ========================================

export const SERBIAN_ACCOUNT_CLASSES = [
  { code: '0', name: 'Nematerijalna imovina, nekretnine, postrojenja, oprema i biološka sredstva', type: AccountType.ASSET },
  { code: '1', name: 'Zalihe i stalna sredstva namenjena prodaji', type: AccountType.ASSET },
  { code: '2', name: 'Kratkoročna potraživanja, plasmani i gotovina', type: AccountType.ASSET },
  { code: '3', name: 'Kapital', type: AccountType.EQUITY },
  { code: '4', name: 'Dugoročne i kratkoročne obaveze', type: AccountType.LIABILITY },
  { code: '5', name: 'Rashodi', type: AccountType.EXPENSE },
  { code: '6', name: 'Prihodi', type: AccountType.REVENUE },
  { code: '7', name: 'Otvaranje i zaključak računa stanja i uspeha', type: AccountType.OFF_BALANCE },
  { code: '8', name: 'Vanbilansna aktiva', type: AccountType.OFF_BALANCE },
  { code: '9', name: 'Vanbilansna pasiva', type: AccountType.OFF_BALANCE },
];

// Common accounts for automatic setup
export const COMMON_ACCOUNTS = [
  // Klasa 0 - Stalna imovina
  { code: '00', name: 'Nematerijalna imovina', level: 2, type: AccountType.ASSET, normalSide: AccountSide.DEBIT },
  { code: '01', name: 'Goodwill', level: 2, type: AccountType.ASSET, normalSide: AccountSide.DEBIT },
  { code: '02', name: 'Nekretnine, postrojenja i oprema', level: 2, type: AccountType.ASSET, normalSide: AccountSide.DEBIT },
  { code: '022', name: 'Građevinski objekti', level: 3, type: AccountType.ASSET, normalSide: AccountSide.DEBIT },
  { code: '023', name: 'Oprema', level: 3, type: AccountType.ASSET, normalSide: AccountSide.DEBIT },
  
  // Klasa 1 - Zalihe
  { code: '10', name: 'Materijal', level: 2, type: AccountType.ASSET, normalSide: AccountSide.DEBIT },
  { code: '13', name: 'Roba', level: 2, type: AccountType.ASSET, normalSide: AccountSide.DEBIT },
  { code: '14', name: 'Gotovi proizvodi', level: 2, type: AccountType.ASSET, normalSide: AccountSide.DEBIT },
  
  // Klasa 2 - Potraživanja i novac
  { code: '20', name: 'Potraživanja od prodaje', level: 2, type: AccountType.ASSET, normalSide: AccountSide.DEBIT },
  { code: '204', name: 'Kupci u zemlji', level: 3, type: AccountType.ASSET, normalSide: AccountSide.DEBIT },
  { code: '2040', name: 'Kupci - pravna lica', level: 4, type: AccountType.ASSET, normalSide: AccountSide.DEBIT },
  { code: '21', name: 'Potraživanja iz specifičnih poslova', level: 2, type: AccountType.ASSET, normalSide: AccountSide.DEBIT },
  { code: '24', name: 'Gotovinski ekvivalenti i gotovina', level: 2, type: AccountType.ASSET, normalSide: AccountSide.DEBIT },
  { code: '241', name: 'Tekući računi', level: 3, type: AccountType.ASSET, normalSide: AccountSide.DEBIT },
  { code: '243', name: 'Blagajna', level: 3, type: AccountType.ASSET, normalSide: AccountSide.DEBIT },
  { code: '27', name: 'PDV', level: 2, type: AccountType.ASSET, normalSide: AccountSide.DEBIT },
  { code: '270', name: 'PDV u primljenim fakturama', level: 3, type: AccountType.ASSET, normalSide: AccountSide.DEBIT },
  
  // Klasa 3 - Kapital
  { code: '30', name: 'Osnovni kapital', level: 2, type: AccountType.EQUITY, normalSide: AccountSide.CREDIT },
  { code: '34', name: 'Neraspoređena dobit', level: 2, type: AccountType.EQUITY, normalSide: AccountSide.CREDIT },
  { code: '35', name: 'Gubitak', level: 2, type: AccountType.EQUITY, normalSide: AccountSide.DEBIT },
  
  // Klasa 4 - Obaveze
  { code: '40', name: 'Dugoročne obaveze', level: 2, type: AccountType.LIABILITY, normalSide: AccountSide.CREDIT },
  { code: '43', name: 'Obaveze iz poslovanja', level: 2, type: AccountType.LIABILITY, normalSide: AccountSide.CREDIT },
  { code: '432', name: 'Dobavljači u zemlji', level: 3, type: AccountType.LIABILITY, normalSide: AccountSide.CREDIT },
  { code: '4320', name: 'Dobavljači - pravna lica', level: 4, type: AccountType.LIABILITY, normalSide: AccountSide.CREDIT },
  { code: '47', name: 'Obaveze za PDV', level: 2, type: AccountType.LIABILITY, normalSide: AccountSide.CREDIT },
  { code: '470', name: 'Obaveze za PDV po izdatim fakturama', level: 3, type: AccountType.LIABILITY, normalSide: AccountSide.CREDIT },
  { code: '48', name: 'Obaveze za zarade', level: 2, type: AccountType.LIABILITY, normalSide: AccountSide.CREDIT },
  
  // Klasa 5 - Rashodi
  { code: '50', name: 'Nabavna vrednost prodate robe', level: 2, type: AccountType.EXPENSE, normalSide: AccountSide.DEBIT },
  { code: '51', name: 'Troškovi materijala', level: 2, type: AccountType.EXPENSE, normalSide: AccountSide.DEBIT },
  { code: '52', name: 'Troškovi zarada, naknada i ostali lični rashodi', level: 2, type: AccountType.EXPENSE, normalSide: AccountSide.DEBIT },
  { code: '53', name: 'Troškovi proizvodnih usluga', level: 2, type: AccountType.EXPENSE, normalSide: AccountSide.DEBIT },
  { code: '54', name: 'Troškovi amortizacije', level: 2, type: AccountType.EXPENSE, normalSide: AccountSide.DEBIT },
  { code: '55', name: 'Nematerijalni troškovi', level: 2, type: AccountType.EXPENSE, normalSide: AccountSide.DEBIT },
  { code: '56', name: 'Finansijski rashodi', level: 2, type: AccountType.EXPENSE, normalSide: AccountSide.DEBIT },
  { code: '57', name: 'Ostali rashodi', level: 2, type: AccountType.EXPENSE, normalSide: AccountSide.DEBIT },
  
  // Klasa 6 - Prihodi
  { code: '60', name: 'Prihodi od prodaje robe', level: 2, type: AccountType.REVENUE, normalSide: AccountSide.CREDIT },
  { code: '61', name: 'Prihodi od prodaje proizvoda i usluga', level: 2, type: AccountType.REVENUE, normalSide: AccountSide.CREDIT },
  { code: '62', name: 'Prihodi od aktiviranja učinaka', level: 2, type: AccountType.REVENUE, normalSide: AccountSide.CREDIT },
  { code: '64', name: 'Prihodi od premija, subvencija', level: 2, type: AccountType.REVENUE, normalSide: AccountSide.CREDIT },
  { code: '66', name: 'Finansijski prihodi', level: 2, type: AccountType.REVENUE, normalSide: AccountSide.CREDIT },
  { code: '67', name: 'Ostali prihodi', level: 2, type: AccountType.REVENUE, normalSide: AccountSide.CREDIT },
  
  // Klasa 7 - Zatvaranje
  { code: '70', name: 'Otvaranje računa stanja', level: 2, type: AccountType.OFF_BALANCE, normalSide: AccountSide.DEBIT },
  { code: '71', name: 'Zaključak računa stanja', level: 2, type: AccountType.OFF_BALANCE, normalSide: AccountSide.CREDIT },
  { code: '72', name: 'Račun dobitka i gubitka', level: 2, type: AccountType.OFF_BALANCE, normalSide: AccountSide.CREDIT },
];

// ========================================
// SERVICE CLASS
// ========================================

export class AccountService {
  /**
   * Initialize standard chart of accounts for a company
   */
  static async initializeChartOfAccounts(companyId: string): Promise<void> {
    logger.info(`Initializing chart of accounts for company: ${companyId}`);

    // Check if accounts already exist
    const existingCount = await prisma.account.count({
      where: { companyId },
    });

    if (existingCount > 0) {
      logger.warn(`Company ${companyId} already has accounts, skipping initialization`);
      return;
    }

    // Create class accounts (level 1)
    const classAccounts = await prisma.$transaction(
      SERBIAN_ACCOUNT_CLASSES.map((cls) =>
        prisma.account.create({
          data: {
            code: cls.code,
            name: cls.name,
            level: 1,
            type: cls.type,
            normalSide: cls.type === AccountType.ASSET || cls.type === AccountType.EXPENSE 
              ? AccountSide.DEBIT 
              : AccountSide.CREDIT,
            isSystem: true,
            companyId,
          },
        })
      )
    );

    // Create common accounts with proper hierarchy
    const accountMap = new Map<string, string>();
    classAccounts.forEach((acc) => {
      accountMap.set(acc.code, acc.id);
    });

    // Sort by code length to ensure parents are created first
    const sortedCommon = [...COMMON_ACCOUNTS].sort((a, b) => a.code.length - b.code.length);

    for (const account of sortedCommon) {
      // Find parent code
      let parentId: string | undefined;
      for (let i = account.code.length - 1; i >= 1; i--) {
        const potentialParentCode = account.code.substring(0, i);
        if (accountMap.has(potentialParentCode)) {
          parentId = accountMap.get(potentialParentCode);
          break;
        }
      }

      const created = await prisma.account.create({
        data: {
          code: account.code,
          name: account.name,
          level: account.level,
          type: account.type,
          normalSide: account.normalSide,
          parentId,
          isSystem: account.level <= 2,
          companyId,
        },
      });

      accountMap.set(account.code, created.id);
    }

    logger.info(`Chart of accounts initialized for company: ${companyId}, created ${accountMap.size} accounts`);
  }

  /**
   * Get all accounts for a company (hierarchical)
   */
  static async getAccounts(
    companyId: string,
    options?: {
      type?: AccountType;
      level?: number;
      isActive?: boolean;
      search?: string;
      flat?: boolean;
    }
  ) {
    const where: Prisma.AccountWhereInput = { companyId };

    if (options?.type) {
      where.type = options.type;
    }
    if (options?.level !== undefined) {
      where.level = options.level;
    }
    if (options?.isActive !== undefined) {
      where.isActive = options.isActive;
    }
    if (options?.search) {
      where.OR = [
        { code: { contains: options.search } },
        { name: { contains: options.search, mode: 'insensitive' } },
      ];
    }

    const accounts = await prisma.account.findMany({
      where,
      orderBy: { code: 'asc' },
      include: options?.flat
        ? undefined
        : {
            children: {
              where: { isActive: options?.isActive ?? true },
              orderBy: { code: 'asc' },
              include: {
                children: {
                  where: { isActive: options?.isActive ?? true },
                  orderBy: { code: 'asc' },
                  include: {
                    children: {
                      where: { isActive: options?.isActive ?? true },
                      orderBy: { code: 'asc' },
                    },
                  },
                },
              },
            },
          },
    });

    // If hierarchical, return only root accounts
    if (!options?.flat) {
      return accounts.filter((a) => !a.parentId);
    }

    return accounts;
  }

  /**
   * Get single account by ID
   */
  static async getAccount(id: string, companyId: string) {
    const account = await prisma.account.findFirst({
      where: { id, companyId },
      include: {
        parent: true,
        children: {
          orderBy: { code: 'asc' },
        },
      },
    });

    if (!account) {
      throw new Error('Account not found');
    }

    return account;
  }

  /**
   * Get account by code
   */
  static async getAccountByCode(code: string, companyId: string) {
    return prisma.account.findUnique({
      where: {
        companyId_code: { companyId, code },
      },
    });
  }

  /**
   * Create a new account
   */
  static async createAccount(companyId: string, data: CreateAccountDTO) {
    // Validate code doesn't exist
    const existing = await prisma.account.findUnique({
      where: {
        companyId_code: { companyId, code: data.code },
      },
    });

    if (existing) {
      throw new Error(`Account with code ${data.code} already exists`);
    }

    // Determine level based on code length
    const level = data.code.length;

    // Find parent based on code
    let parentId = data.parentId;
    if (!parentId && level > 1) {
      const parentCode = data.code.substring(0, level - 1);
      const parent = await this.getAccountByCode(parentCode, companyId);
      if (parent) {
        parentId = parent.id;
      }
    }

    const account = await prisma.account.create({
      data: {
        ...data,
        level,
        parentId,
        companyId,
      },
      include: {
        parent: true,
      },
    });

    logger.info(`Account created: ${account.code} - ${account.name}`);
    return account;
  }

  /**
   * Update an account
   */
  static async updateAccount(id: string, companyId: string, data: UpdateAccountDTO) {
    const account = await prisma.account.findFirst({
      where: { id, companyId },
    });

    if (!account) {
      throw new Error('Account not found');
    }

    if (account.isSystem && (data.type !== undefined || data.normalSide !== undefined)) {
      throw new Error('Cannot modify system account type or normal side');
    }

    const updated = await prisma.account.update({
      where: { id },
      data,
      include: {
        parent: true,
        children: true,
      },
    });

    logger.info(`Account updated: ${updated.code}`);
    return updated;
  }

  /**
   * Delete an account (soft delete by deactivating)
   */
  static async deleteAccount(id: string, companyId: string) {
    const account = await prisma.account.findFirst({
      where: { id, companyId },
      include: {
        children: true,
        journalLines: { take: 1 },
      },
    });

    if (!account) {
      throw new Error('Account not found');
    }

    if (account.isSystem) {
      throw new Error('Cannot delete system account');
    }

    if (account.children.length > 0) {
      throw new Error('Cannot delete account with child accounts');
    }

    if (account.journalLines.length > 0) {
      // Soft delete if has transactions
      await prisma.account.update({
        where: { id },
        data: { isActive: false },
      });
      logger.info(`Account deactivated: ${account.code}`);
      return { message: 'Account deactivated (has transactions)' };
    }

    // Hard delete if no transactions
    await prisma.account.delete({ where: { id } });
    logger.info(`Account deleted: ${account.code}`);
    return { message: 'Account deleted' };
  }

  /**
   * Get account balance
   */
  static async getAccountBalance(
    accountId: string,
    companyId: string,
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

    const journalLineWhere: Prisma.JournalLineWhereInput = {
      accountId,
      journalEntry: {
        companyId,
        status: 'POSTED',
        ...(options?.fiscalYearId && { fiscalYearId: options.fiscalYearId }),
        ...(options?.fromDate && { date: { gte: options.fromDate } }),
        ...(options?.toDate && { date: { lte: options.toDate } }),
      },
    };

    const aggregation = await prisma.journalLine.aggregate({
      where: journalLineWhere,
      _sum: {
        debitAmount: true,
        creditAmount: true,
      },
    });

    const totalDebit = Number(aggregation._sum.debitAmount || 0);
    const totalCredit = Number(aggregation._sum.creditAmount || 0);

    // Calculate balance based on normal side
    const balance =
      account.normalSide === AccountSide.DEBIT
        ? totalDebit - totalCredit
        : totalCredit - totalDebit;

    return {
      account: {
        id: account.id,
        code: account.code,
        name: account.name,
        type: account.type,
        normalSide: account.normalSide,
      },
      totalDebit,
      totalCredit,
      balance,
      period: {
        from: options?.fromDate,
        to: options?.toDate,
      },
    };
  }

  /**
   * Get trial balance (Bruto bilans)
   */
  static async getTrialBalance(
    companyId: string,
    options?: {
      fromDate?: Date;
      toDate?: Date;
      fiscalYearId?: string;
      level?: number;
    }
  ) {
    const accounts = await prisma.account.findMany({
      where: {
        companyId,
        isActive: true,
        ...(options?.level && { level: { lte: options.level } }),
      },
      orderBy: { code: 'asc' },
    });

    const balances = await Promise.all(
      accounts.map((account) =>
        this.getAccountBalance(account.id, companyId, options)
      )
    );

    const totals = balances.reduce(
      (acc, b) => ({
        totalDebit: acc.totalDebit + b.totalDebit,
        totalCredit: acc.totalCredit + b.totalCredit,
      }),
      { totalDebit: 0, totalCredit: 0 }
    );

    return {
      accounts: balances.filter((b) => b.totalDebit !== 0 || b.totalCredit !== 0),
      totals,
      isBalanced: Math.abs(totals.totalDebit - totals.totalCredit) < 0.01,
    };
  }

  /**
   * Autocomplete for account selection
   */
  static async autocomplete(companyId: string, query: string, limit: number = 10) {
    return prisma.account.findMany({
      where: {
        companyId,
        isActive: true,
        OR: [
          { code: { startsWith: query } },
          { name: { contains: query, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        code: true,
        name: true,
        type: true,
        normalSide: true,
      },
      orderBy: { code: 'asc' },
      take: limit,
    });
  }
}

export default AccountService;
