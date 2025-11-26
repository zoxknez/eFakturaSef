import { PrismaClient, FixedAsset, FixedAssetStatus } from '@prisma/client';
import { prisma } from '../db/prisma';
import { FixedAssetSchema } from '@sef-app/shared';
import { z } from 'zod';

export class FixedAssetService {
  
  async createFixedAsset(companyId: string, data: Omit<z.infer<typeof FixedAssetSchema>, 'id' | 'companyId' | 'createdAt' | 'updatedAt'>) {
    return prisma.fixedAsset.create({
      data: {
        ...data,
        companyId,
        purchaseDate: new Date(data.purchaseDate),
        // Ensure decimals are handled correctly if passed as numbers
        purchaseValue: data.purchaseValue,
        amortizationRate: data.amortizationRate,
        currentValue: data.currentValue,
        accumulatedAmortization: data.accumulatedAmortization
      }
    });
  }

  async getFixedAsset(companyId: string, id: string) {
    return prisma.fixedAsset.findFirst({
      where: { id, companyId }
    });
  }

  async listFixedAssets(companyId: string, page = 1, limit = 20, search?: string) {
    const skip = (page - 1) * limit;
    
    const where: any = { companyId };
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { inventoryNumber: { contains: search, mode: 'insensitive' } }
      ];
    }

    const [total, items] = await Promise.all([
      prisma.fixedAsset.count({ where }),
      prisma.fixedAsset.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' }
      })
    ]);

    return {
      data: items,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    };
  }

  async updateFixedAsset(companyId: string, id: string, data: Partial<z.infer<typeof FixedAssetSchema>>) {
    const { id: _id, createdAt, updatedAt, companyId: _cid, ...updateData } = data;

    return prisma.fixedAsset.update({
      where: { id, companyId },
      data: {
        ...updateData,
        purchaseDate: updateData.purchaseDate ? new Date(updateData.purchaseDate) : undefined
      }
    });
  }

  async deleteFixedAsset(companyId: string, id: string) {
    return prisma.fixedAsset.delete({
      where: { id, companyId }
    });
  }

  /**
   * Calculates amortization for all active assets for a given year.
   * This is a simulation/preview. To apply it, we would need a transaction.
   */
  async calculateAmortizationPreview(companyId: string, year: number) {
    const assets = await prisma.fixedAsset.findMany({
      where: { 
        companyId, 
        status: FixedAssetStatus.ACTIVE,
        currentValue: { gt: 0 }
      }
    });

    const results = assets.map(asset => {
      // Simple straight-line amortization
      // Annual Amortization = Purchase Value * (Rate / 100)
      const rate = Number(asset.amortizationRate);
      const purchaseValue = Number(asset.purchaseValue);
      const currentVal = Number(asset.currentValue);
      
      let annualAmortization = purchaseValue * (rate / 100);
      
      // Don't amortize more than current value
      if (annualAmortization > currentVal) {
        annualAmortization = currentVal;
      }

      return {
        assetId: asset.id,
        name: asset.name,
        inventoryNumber: asset.inventoryNumber,
        currentValue: currentVal,
        amortizationAmount: annualAmortization,
        newValue: currentVal - annualAmortization
      };
    });

    return results;
  }
  
  /**
   * Applies the amortization for the year.
   * Updates asset values and creates accounting journal entries (TODO).
   */
  async applyAmortization(companyId: string, year: number) {
    const preview = await this.calculateAmortizationPreview(companyId, year);
    
    const updates = [];
    
    for (const item of preview) {
      if (item.amortizationAmount > 0) {
        const update = prisma.fixedAsset.update({
          where: { id: item.assetId },
          data: {
            currentValue: item.newValue,
            accumulatedAmortization: { increment: item.amortizationAmount }
          }
        });
        updates.push(update);
      }
    }

    // Execute all updates in transaction
    await prisma.$transaction(updates);
    
    return { processed: updates.length };
  }
}

export const fixedAssetService = new FixedAssetService();
