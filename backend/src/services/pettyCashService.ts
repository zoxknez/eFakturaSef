import { PrismaClient, PettyCashType } from '@prisma/client';
import { prisma } from '../db/prisma';
import { PettyCashAccountSchema, PettyCashEntrySchema } from '@sef-app/shared';
import { z } from 'zod';

export class PettyCashService {
  
  // --- Accounts ---

  async createAccount(companyId: string, name: string, currency = 'RSD') {
    return prisma.pettyCashAccount.create({
      data: {
        companyId,
        name,
        currency,
        balance: 0
      }
    });
  }

  async getAccounts(companyId: string) {
    return prisma.pettyCashAccount.findMany({
      where: { companyId },
      orderBy: { name: 'asc' }
    });
  }

  async getAccountById(companyId: string, id: string) {
    return prisma.pettyCashAccount.findFirst({
      where: { id, companyId }
    });
  }

  // --- Entries ---

  async createEntry(companyId: string, userId: string, data: z.infer<typeof PettyCashEntrySchema>) {
    const { accountId, amount, type, date, ...rest } = data;

    // Start a transaction to ensure balance is updated correctly
    return prisma.$transaction(async (tx) => {
      // 1. Verify account belongs to company
      const account = await tx.pettyCashAccount.findFirst({
        where: { id: accountId, companyId }
      });

      if (!account) {
        throw new Error('Petty cash account not found');
      }

      // 2. Create entry
      const entry = await tx.pettyCashEntry.create({
        data: {
          accountId,
          entryNumber: data.entryNumber,
          date: new Date(date),
          type: type as PettyCashType,
          amount,
          description: data.description,
          partnerId: data.partnerId,
          partnerName: data.partnerName,
          expenseCategory: data.expenseCategory,
          createdBy: userId
        }
      });

      // 3. Update account balance
      const balanceChange = type === 'DEPOSIT' ? amount : -amount;
      
      await tx.pettyCashAccount.update({
        where: { id: accountId },
        data: {
          balance: { increment: balanceChange }
        }
      });

      return entry;
    });
  }

  async listEntries(companyId: string, accountId?: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    
    const where: any = {
      account: {
        companyId
      }
    };

    if (accountId) {
      where.accountId = accountId;
    }

    const [total, items] = await Promise.all([
      prisma.pettyCashEntry.count({ where }),
      prisma.pettyCashEntry.findMany({
        where,
        skip,
        take: limit,
        orderBy: { date: 'desc' },
        include: {
          account: true
        }
      })
    ]);

    return {
      data: items,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async getNextEntryNumber(companyId: string, accountId: string) {
    // Simple auto-increment logic for entry number based on count
    // In production, might want something more robust or year-based
    const count = await prisma.pettyCashEntry.count({
      where: { accountId }
    });
    
    const year = new Date().getFullYear();
    return `${year}-${(count + 1).toString().padStart(4, '0')}`;
  }
}

export const pettyCashService = new PettyCashService();
