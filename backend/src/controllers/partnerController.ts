// @ts-nocheck - Temporary workaround for Prisma Client cache issue (Partner model not recognized by TS Server)
import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../db/prisma';
import { logger } from '../utils/logger';
import { PartnerType } from '@prisma/client';

// ========================================
// ZOD VALIDATION SCHEMAS
// ========================================

const BankAccountSchema = z.object({
  bankName: z.string().min(1, 'Bank name is required'),
  accountNumber: z.string().min(1, 'Account number is required'),
  swift: z.string().optional(),
  isPrimary: z.boolean().default(false),
});

const CreatePartnerSchema = z.object({
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

const UpdatePartnerSchema = CreatePartnerSchema.partial();

const ListPartnersQuerySchema = z.object({
  page: z.string().optional().default('1'),
  limit: z.string().optional().default('50'),
  search: z.string().optional(),
  type: z.nativeEnum(PartnerType).optional(),
  isActive: z.enum(['true', 'false']).optional(),
  sortBy: z.enum(['name', 'pib', 'createdAt']).optional().default('name'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('asc'),
});

// ========================================
// PARTNER CONTROLLER
// ========================================

export class PartnerController {
  /**
   * List partners with pagination and filtering
   * GET /api/partners
   */
  static async list(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;

      // Get user's company
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { companyId: true },
      });

      if (!user?.companyId) {
        return res.status(403).json({ error: 'User not associated with a company' });
      }

      // Validate query params
      const queryResult = ListPartnersQuerySchema.safeParse(req.query);
      if (!queryResult.success) {
        return res.status(400).json({ 
          error: 'Invalid query parameters',
          details: queryResult.error.format(),
        });
      }

      const { page, limit, search, type, isActive, sortBy, sortOrder } = queryResult.data;
      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);
      const skip = (pageNum - 1) * limitNum;

      // Build where clause
      const where: any = {
        companyId: user.companyId,
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
        where.isActive = isActive === 'true';
      }

      // Get total count
      const total = await prisma.partner.count({ where });

      // Get partners
      const partners = await prisma.partner.findMany({
        where,
        skip,
        take: limitNum,
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

      res.json({
        data: partners,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      });
    } catch (error: any) {
      logger.error('Failed to list partners:', error);
      res.status(500).json({ error: 'Failed to fetch partners' });
    }
  }

  /**
   * Get single partner by ID
   * GET /api/partners/:id
   */
  static async get(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      const { id } = req.params;

      // Get user's company
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { companyId: true },
      });

      if (!user?.companyId) {
        return res.status(403).json({ error: 'User not associated with a company' });
      }

      const partner = await prisma.partner.findFirst({
        where: {
          id,
          companyId: user.companyId,
        },
        include: {
          _count: {
            select: { invoices: true },
          },
        },
      });

      if (!partner) {
        return res.status(404).json({ error: 'Partner not found' });
      }

      res.json(partner);
    } catch (error: any) {
      logger.error('Failed to get partner:', error);
      res.status(500).json({ error: 'Failed to fetch partner' });
    }
  }

  /**
   * Create new partner
   * POST /api/partners
   */
  static async create(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;

      // Get user's company
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { companyId: true },
      });

      if (!user?.companyId) {
        return res.status(403).json({ error: 'User not associated with a company' });
      }

      // Validate request body
      const validationResult = CreatePartnerSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({
          error: 'Validation failed',
          details: validationResult.error.format(),
        });
      }

      const data = validationResult.data;

      // Check if partner with same PIB already exists for this company
      const existingPartner = await prisma.partner.findFirst({
        where: {
          companyId: user.companyId,
          pib: data.pib,
        },
      });

      if (existingPartner) {
        return res.status(409).json({ 
          error: 'Partner with this PIB already exists',
          existingPartnerId: existingPartner.id,
        });
      }

      // Create partner
      const partner = await prisma.partner.create({
        data: {
          ...data,
          companyId: user.companyId,
          email: data.email || null,
          website: data.website || null,
        },
      });

      logger.info(`Partner created: ${partner.id} (PIB: ${partner.pib}) by user ${userId}`);
      res.status(201).json(partner);
    } catch (error: any) {
      logger.error('Failed to create partner:', error);
      res.status(500).json({ error: 'Failed to create partner' });
    }
  }

  /**
   * Update existing partner
   * PUT /api/partners/:id
   */
  static async update(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      const { id } = req.params;

      // Get user's company
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { companyId: true },
      });

      if (!user?.companyId) {
        return res.status(403).json({ error: 'User not associated with a company' });
      }

      // Check if partner exists and belongs to user's company
      const existingPartner = await prisma.partner.findFirst({
        where: {
          id,
          companyId: user.companyId,
        },
      });

      if (!existingPartner) {
        return res.status(404).json({ error: 'Partner not found' });
      }

      // Validate request body
      const validationResult = UpdatePartnerSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({
          error: 'Validation failed',
          details: validationResult.error.format(),
        });
      }

      const data = validationResult.data;

      // If PIB is being changed, check for duplicates
      if (data.pib && data.pib !== existingPartner.pib) {
        const duplicatePIB = await prisma.partner.findFirst({
          where: {
            companyId: user.companyId,
            pib: data.pib,
            id: { not: id },
          },
        });

        if (duplicatePIB) {
          return res.status(409).json({ 
            error: 'Another partner with this PIB already exists',
            conflictingPartnerId: duplicatePIB.id,
          });
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

      logger.info(`Partner updated: ${id} by user ${userId}`);
      res.json(partner);
    } catch (error: any) {
      logger.error('Failed to update partner:', error);
      res.status(500).json({ error: 'Failed to update partner' });
    }
  }

  /**
   * Soft delete partner (set isActive = false)
   * DELETE /api/partners/:id
   */
  static async delete(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      const { id } = req.params;

      // Get user's company
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { companyId: true },
      });

      if (!user?.companyId) {
        return res.status(403).json({ error: 'User not associated with a company' });
      }

      // Check if partner exists and belongs to user's company
      const existingPartner = await prisma.partner.findFirst({
        where: {
          id,
          companyId: user.companyId,
        },
        include: {
          _count: {
            select: { invoices: true },
          },
        },
      });

      if (!existingPartner) {
        return res.status(404).json({ error: 'Partner not found' });
      }

      // Check if partner has invoices
      if (existingPartner._count.invoices > 0) {
        // Soft delete only
        const partner = await prisma.partner.update({
          where: { id },
          data: { isActive: false },
        });

        logger.info(`Partner soft deleted: ${id} (has ${existingPartner._count.invoices} invoices) by user ${userId}`);
        return res.json({ 
          message: 'Partner deactivated (has invoices)',
          partner,
        });
      }

      // Hard delete if no invoices
      await prisma.partner.delete({
        where: { id },
      });

      logger.info(`Partner hard deleted: ${id} by user ${userId}`);
      res.json({ message: 'Partner deleted successfully' });
    } catch (error: any) {
      logger.error('Failed to delete partner:', error);
      res.status(500).json({ error: 'Failed to delete partner' });
    }
  }

  /**
   * Autocomplete search for partner selection
   * GET /api/partners/autocomplete?q=searchTerm&type=BUYER
   */
  static async autocomplete(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      const { q, type } = req.query;

      if (!q || typeof q !== 'string') {
        return res.status(400).json({ error: 'Query parameter "q" is required' });
      }

      // Get user's company
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { companyId: true },
      });

      if (!user?.companyId) {
        return res.status(403).json({ error: 'User not associated with a company' });
      }

      // Build where clause
      const where: any = {
        companyId: user.companyId,
        isActive: true,
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { pib: { contains: q } },
          { shortName: { contains: q, mode: 'insensitive' } },
        ],
      };

      if (type && (type === 'BUYER' || type === 'SUPPLIER' || type === 'BOTH')) {
        where.type = type;
      }

      // Get partners (limit 20 for autocomplete)
      const partners = await prisma.partner.findMany({
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

      res.json(partners);
    } catch (error: any) {
      logger.error('Failed to autocomplete partners:', error);
      res.status(500).json({ error: 'Failed to search partners' });
    }
  }

  /**
   * Get partner statistics
   * GET /api/partners/:id/stats
   */
  static async stats(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      const { id } = req.params;

      // Get user's company
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { companyId: true },
      });

      if (!user?.companyId) {
        return res.status(403).json({ error: 'User not associated with a company' });
      }

      // Check if partner exists
      const partner = await prisma.partner.findFirst({
        where: {
          id,
          companyId: user.companyId,
        },
      });

      if (!partner) {
        return res.status(404).json({ error: 'Partner not found' });
      }

      // Get invoice statistics
      const invoices = await prisma.invoice.findMany({
        where: {
          partnerId: id,
          companyId: user.companyId,
        },
        select: {
          totalAmount: true,
          paymentStatus: true,
          paidAmount: true,
          status: true,
        },
      });

      const stats = {
        totalInvoices: invoices.length,
        totalAmount: invoices.reduce((sum, inv) => sum + Number(inv.totalAmount || 0), 0),
        paidAmount: invoices.reduce((sum, inv) => sum + Number(inv.paidAmount || 0), 0),
        unpaidAmount: invoices
          .filter(inv => inv.paymentStatus === 'UNPAID' || inv.paymentStatus === 'PARTIAL')
          .reduce((sum, inv) => sum + (Number(inv.totalAmount || 0) - Number(inv.paidAmount || 0)), 0),
        byStatus: {
          paid: invoices.filter(inv => inv.paymentStatus === 'PAID').length,
          unpaid: invoices.filter(inv => inv.paymentStatus === 'UNPAID').length,
          partial: invoices.filter(inv => inv.paymentStatus === 'PARTIAL').length,
          overdue: invoices.filter(inv => inv.paymentStatus === 'OVERDUE').length,
        },
      };

      res.json(stats);
    } catch (error: any) {
      logger.error('Failed to get partner stats:', error);
      res.status(500).json({ error: 'Failed to fetch partner statistics' });
    }
  }
}
