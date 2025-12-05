import { Prisma, PartnerType } from '@prisma/client';
import { prisma } from '../db/prisma';
import { logger } from '../utils/logger';
import { z } from 'zod';
import cacheService, { CachePrefix } from './cacheService';
import { sanitizeSearchQuery, validatePIB, normalizePIB } from '../utils/validation';

// ========================================
// ZOD VALIDATION SCHEMAS
// ========================================

const BankAccountSchema = z.object({
  bankName: z.string().min(1, 'Bank name is required'),
  accountNumber: z.string().min(1, 'Account number is required'),
  swift: z.string().optional(),
  isPrimary: z.boolean().default(false),
});

export const CreatePartnerSchema = z.object({
  type: z.nativeEnum(PartnerType),
  pib: z.string().length(9, 'PIB must be exactly 9 digits'),
  name: z.string().min(1, 'Name is required').max(255),
  shortName: z.string().max(100).optional(),
  
  // Adresa
  address: z.string().min(1, 'Address is required'),
  city: z.string().min(1, 'City is required'),
  postalCode: z.string().min(1, 'Postal code is required'),
  country: z.string().default('RS'),
  
  // Kontakt
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().optional(),
  fax: z.string().optional(),
  website: z.string().url('Invalid URL').optional().or(z.literal('')),
  contactPerson: z.string().optional(),
  
  // PDV
  vatPayer: z.boolean().default(true),
  vatNumber: z.string().optional(),
  
  // Platni uslovi
  defaultPaymentTerms: z.number().int().min(0).default(15),
  creditLimit: z.number().positive().optional(),
  discount: z.number().min(0).max(100).default(0),
  
  // Bankovni računi
  bankAccounts: z.array(BankAccountSchema).optional(),
  
  // Napomena
  note: z.string().optional(),
  
  // Status
  isActive: z.boolean().default(true),
});

export const UpdatePartnerSchema = CreatePartnerSchema.partial();

export type CreatePartnerDTO = z.infer<typeof CreatePartnerSchema>;
export type UpdatePartnerDTO = z.infer<typeof UpdatePartnerSchema>;

export interface PartnerListParams {
  page?: number;
  limit?: number;
  search?: string;
  type?: PartnerType;
  isActive?: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export class PartnerService {
  /**
   * List partners with pagination and filtering
   */
  static async listPartners(companyId: string, params: PartnerListParams) {
    const { 
      page = 1, 
      limit = 50, 
      search, 
      type, 
      isActive, 
      sortBy = 'name', 
      sortOrder = 'asc' 
    } = params;

    const skip = (page - 1) * limit;

    // Build where clause
    const where: Prisma.PartnerWhereInput = {
      companyId,
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { pib: { contains: search } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (type) {
      where.type = type;
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    // Get total count
    const total = await prisma.partner.count({ where });

    // Get partners
    const partners = await prisma.partner.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
      select: {
        id: true,
        type: true,
        pib: true,
        name: true,
        shortName: true,
        address: true,
        city: true,
        postalCode: true,
        country: true,
        email: true,
        phone: true,
        vatPayer: true,
        defaultPaymentTerms: true,
        creditLimit: true,
        discount: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: { invoices: true },
        },
      },
    });

    return {
      data: partners,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get single partner by ID
   */
  static async getPartner(id: string, companyId: string) {
    const cacheKey = `${companyId}:${id}`;
    
    return cacheService.getOrSet(
      CachePrefix.PARTNER,
      cacheKey,
      async () => {
        const partner = await prisma.partner.findFirst({
          where: {
            id,
            companyId,
          },
          include: {
            _count: {
              select: { invoices: true },
            },
          },
        });

        if (!partner) {
          throw new Error('Partner not found');
        }

        return partner;
      },
      300 // Cache for 5 minutes
    );
  }

  /**
   * Create new partner
   */
  static async createPartner(companyId: string, data: CreatePartnerDTO, userId: string) {
    // Check if partner with same PIB already exists for this company
    const existingPartner = await prisma.partner.findFirst({
      where: {
        companyId,
        pib: data.pib,
      },
    });

    if (existingPartner) {
      throw new Error(`Partner with PIB '${data.pib}' already exists`);
    }

    // Create partner
    const partner = await prisma.partner.create({
      data: {
        ...data,
        pib: normalizePIB(data.pib) || data.pib, // Use normalized PIB
        companyId,
        email: data.email || null,
        website: data.website || null,
      },
    });

    // Invalidate autocomplete cache for this company
    cacheService.invalidatePattern(`cache:${CachePrefix.PARTNER}:${companyId}:autocomplete:*`).catch(err => {
      logger.warn('Failed to invalidate partner autocomplete cache', { error: err });
    });

    logger.info(`Partner created: ${partner.id} (PIB: ${partner.pib}) by user ${userId}`);
    return partner;
  }

  /**
   * Update existing partner
   */
  static async updatePartner(id: string, companyId: string, data: UpdatePartnerDTO, userId: string) {
    // Check if partner exists and belongs to user's company
    const existingPartner = await prisma.partner.findFirst({
      where: {
        id,
        companyId,
      },
    });

    if (!existingPartner) {
      throw new Error('Partner not found');
    }

    // If PIB is being changed, check for duplicates
    if (data.pib && data.pib !== existingPartner.pib) {
      const duplicatePIB = await prisma.partner.findFirst({
        where: {
          companyId,
          pib: data.pib,
          id: { not: id },
        },
      });

      if (duplicatePIB) {
        throw new Error(`Another partner with PIB '${data.pib}' already exists`);
      }
    }

    // Update partner
    const partner = await prisma.partner.update({
      where: { id },
      data: {
        ...data,
        email: data.email || null,
        website: data.website || null,
      },
    });

    // Invalidate cache for this partner and autocomplete
    cacheService.del(CachePrefix.PARTNER, `${companyId}:${id}`).catch(err => {
      logger.warn('Failed to invalidate partner cache', { error: err });
    });
    cacheService.invalidatePattern(`cache:${CachePrefix.PARTNER}:${companyId}:autocomplete:*`).catch(err => {
      logger.warn('Failed to invalidate partner autocomplete cache', { error: err });
    });

    logger.info(`Partner updated: ${id} by user ${userId}`);
    return partner;
  }

  /**
   * Delete partner (soft or hard)
   */
  static async deletePartner(id: string, companyId: string, userId: string) {
    // Check if partner exists and belongs to user's company
    const existingPartner = await prisma.partner.findFirst({
      where: {
        id,
        companyId,
      },
      include: {
        _count: {
          select: { invoices: true },
        },
      },
    });

    if (!existingPartner) {
      throw new Error('Partner not found');
    }

    // Check if partner has invoices
    if (existingPartner._count.invoices > 0) {
      // Soft delete only
      const partner = await prisma.partner.update({
        where: { id },
        data: { isActive: false },
      });

      // Invalidate cache
    cacheService.del(CachePrefix.PARTNER, `${companyId}:${id}`).catch(err => {
      logger.warn('Failed to invalidate partner cache', { error: err });
    });
    cacheService.invalidatePattern(`cache:${CachePrefix.PARTNER}:${companyId}:autocomplete:*`).catch(err => {
      logger.warn('Failed to invalidate partner autocomplete cache', { error: err });
    });

    logger.info(`Partner soft deleted: ${id} (has ${existingPartner._count.invoices} invoices) by user ${userId}`);
      return { 
        message: 'Partner deactivated (has invoices)',
        partner,
        softDeleted: true
      };
    }

    // Hard delete if no invoices
    await prisma.partner.delete({
      where: { id },
    });

    logger.info(`Partner hard deleted: ${id} by user ${userId}`);
    return { 
      message: 'Partner deleted successfully',
      softDeleted: false
    };
  }

  /**
   * Autocomplete search
   */
  static async autocomplete(companyId: string, query: string, type?: PartnerType) {
    // Cache key includes query and type for proper cache separation
    const cacheKey = `${companyId}:autocomplete:${query.toLowerCase()}:${type || 'all'}`;
    
    return cacheService.getOrSet(
      CachePrefix.PARTNER,
      cacheKey,
      async () => {
        const where: Prisma.PartnerWhereInput = {
          companyId,
          isActive: true,
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { pib: { contains: query } },
            { shortName: { contains: query, mode: 'insensitive' } },
          ],
        };

        if (type) {
          where.type = type;
        }

        // Get partners (limit 20 for autocomplete)
        return prisma.partner.findMany({
          where,
          take: 20,
          orderBy: { name: 'asc' },
          select: {
            id: true,
            pib: true,
            name: true,
            shortName: true,
            type: true,
            address: true,
            city: true,
            email: true,
            phone: true,
            defaultPaymentTerms: true,
            vatPayer: true,
          },
        });
      },
      60 // Cache for 1 minute (short TTL for search results)
    );
  }

  /**
   * Get partner statistics
   */
  static async getStats(id: string, companyId: string) {
    // Check if partner exists
    const partner = await prisma.partner.findFirst({
      where: {
        id,
        companyId,
      },
    });

    if (!partner) {
      throw new Error('Partner not found');
    }

    // Get invoice statistics
    const invoices = await prisma.invoice.findMany({
      where: {
        partnerId: id,
        companyId,
      },
      select: {
        totalAmount: true,
        paymentStatus: true,
        paidAmount: true,
        status: true,
      },
    });

    return {
      totalInvoices: invoices.length,
      totalAmount: invoices.reduce((sum, inv) => sum + Number(inv.totalAmount || 0), 0),
      paidAmount: invoices.reduce((sum, inv) => sum + Number(inv.paidAmount || 0), 0),
      unpaidAmount: invoices
        .filter(inv => inv.paymentStatus === 'UNPAID' || inv.paymentStatus === 'PARTIALLY_PAID')
        .reduce((sum, inv) => sum + (Number(inv.totalAmount || 0) - Number(inv.paidAmount || 0)), 0),
      byStatus: {
        paid: invoices.filter(inv => inv.paymentStatus === 'PAID').length,
        unpaid: invoices.filter(inv => inv.paymentStatus === 'UNPAID').length,
        partial: invoices.filter(inv => inv.paymentStatus === 'PARTIALLY_PAID').length,
        overdue: invoices.filter(inv => inv.paymentStatus === 'OVERDUE').length,
      },
    };
  }
}
