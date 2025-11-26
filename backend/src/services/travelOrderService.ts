import { prisma } from '../db/prisma';
import { TravelOrder, TravelOrderSchema, TravelOrderExpense, TravelOrderStatus } from '@sef-app/shared';
import { Prisma } from '@prisma/client';

export const travelOrderService = {
  async create(companyId: string, data: Partial<TravelOrder>) {
    // Generate number if not provided
    const number = data.number || await this.generateNextNumber(companyId);
    
    // Calculate totals
    const expenses = data.expenses || [];
    const totalExpenses = expenses.reduce((sum, exp) => sum + Number(exp.amount), 0);
    const advanceAmount = Number(data.advanceAmount || 0);
    const totalPayout = totalExpenses - advanceAmount;

    return prisma.travelOrder.create({
      data: {
        companyId,
        orderNumber: number, // Schema uses orderNumber
        employeeName: data.employeeName!,
        employeeId: data.employeeId,
        destination: data.destination!,
        country: data.country || 'RS',
        departureDate: new Date(data.departureDate!),
        returnDate: new Date(data.returnDate!),
        vehicle: data.vehicle,
        advanceAmount,
        status: (data.status as any) || 'DRAFT',
        totalExpenses,
        totalPayout,
        expenses: {
          create: expenses.map(exp => ({
            type: exp.type,
            date: new Date(exp.date),
            amount: exp.amount,
            currency: exp.currency || 'RSD',
            description: exp.description,
            attachmentUrl: exp.attachmentUrl
          }))
        }
      },
      include: {
        expenses: true
      }
    });
  },

  async update(companyId: string, id: string, data: Partial<TravelOrder>) {
    // Calculate totals if expenses changed
    let expenseUpdate = {};
    let totalsUpdate = {};

    if (data.expenses) {
      // Delete existing and recreate (simplest for now, or handle upsert)
      // For simplicity in this MVP, we'll replace all expenses
      
      const totalExpenses = data.expenses.reduce((sum, exp) => sum + Number(exp.amount), 0);
      const advanceAmount = Number(data.advanceAmount !== undefined ? data.advanceAmount : (await this.get(companyId, id))?.advanceAmount || 0);
      const totalPayout = totalExpenses - advanceAmount;

      expenseUpdate = {
        expenses: {
          deleteMany: {},
          create: data.expenses.map(exp => ({
            type: exp.type,
            date: new Date(exp.date),
            amount: exp.amount,
            currency: exp.currency || 'RSD',
            description: exp.description,
            attachmentUrl: exp.attachmentUrl
          }))
        }
      };
      
      totalsUpdate = {
        totalExpenses,
        totalPayout,
        advanceAmount // Update advance amount too if passed
      };
    } else if (data.advanceAmount !== undefined) {
       // Only advance changed
       const current = await this.get(companyId, id);
       if (current) {
         const totalExpenses = Number(current.totalExpenses);
         const advanceAmount = Number(data.advanceAmount);
         totalsUpdate = {
           advanceAmount,
           totalPayout: totalExpenses - advanceAmount
         };
       }
    }

    return prisma.travelOrder.update({
      where: { id, companyId },
      data: {
        employeeName: data.employeeName,
        employeeId: data.employeeId,
        destination: data.destination,
        country: data.country,
        departureDate: data.departureDate ? new Date(data.departureDate) : undefined,
        returnDate: data.returnDate ? new Date(data.returnDate) : undefined,
        vehicle: data.vehicle,
        status: data.status as any,
        ...totalsUpdate,
        ...expenseUpdate
      },
      include: {
        expenses: true
      }
    });
  },

  async get(companyId: string, id: string) {
    return prisma.travelOrder.findFirst({
      where: { id, companyId },
      include: { expenses: true }
    });
  },

  async list(companyId: string, page = 1, limit = 20, search?: string) {
    const skip = (page - 1) * limit;
    const where: Prisma.TravelOrderWhereInput = {
      companyId,
      ...(search ? {
        OR: [
          { orderNumber: { contains: search, mode: 'insensitive' } },
          { employeeName: { contains: search, mode: 'insensitive' } },
          { destination: { contains: search, mode: 'insensitive' } }
        ]
      } : {})
    };

    const [data, total] = await Promise.all([
      prisma.travelOrder.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { expenses: true }
      }),
      prisma.travelOrder.count({ where })
    ]);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  },

  async delete(companyId: string, id: string) {
    return prisma.travelOrder.delete({
      where: { id, companyId }
    });
  },

  async generateNextNumber(companyId: string): Promise<string> {
    const year = new Date().getFullYear();
    const count = await prisma.travelOrder.count({
      where: {
        companyId,
        createdAt: {
          gte: new Date(year, 0, 1),
          lt: new Date(year + 1, 0, 1)
        }
      }
    });
    return `PN-${year}-${(count + 1).toString().padStart(4, '0')}`;
  }
};
