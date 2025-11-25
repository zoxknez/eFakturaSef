import { Request, Response } from 'express';
import { logger } from '../utils/logger';
import { PartnerService, CreatePartnerSchema, UpdatePartnerSchema } from '../services/partnerService';
import { z } from 'zod';
import { PartnerType } from '@prisma/client';

const ListPartnersQuerySchema = z.object({
  page: z.string().optional().default('1'),
  limit: z.string().optional().default('50'),
  search: z.string().optional(),
  type: z.nativeEnum(PartnerType).optional(),
  isActive: z.enum(['true', 'false']).optional(),
  sortBy: z.enum(['name', 'pib', 'createdAt']).optional().default('name'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('asc'),
});

export class PartnerController {
  /**
   * List partners with pagination and filtering
   * GET /api/partners
   */
  static async list(req: Request, res: Response) {
    try {
      const user = (req as any).user;
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

      const result = await PartnerService.listPartners(user.companyId, {
        page: parseInt(page),
        limit: parseInt(limit),
        search,
        type,
        isActive: isActive ? isActive === 'true' : undefined,
        sortBy,
        sortOrder: sortOrder as 'asc' | 'desc',
      });

      return res.json(result);
    } catch (error: any) {
      logger.error('Failed to list partners:', error);
      return res.status(500).json({ error: 'Failed to fetch partners' });
    }
  }

  /**
   * Get single partner by ID
   * GET /api/partners/:id
   */
  static async get(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const id = req.params.id as string;

      if (!user?.companyId) {
        return res.status(403).json({ error: 'User not associated with a company' });
      }

      const partner = await PartnerService.getPartner(id, user.companyId);
      return res.json(partner);
    } catch (error: any) {
      logger.error('Failed to get partner:', error);
      if (error.message === 'Partner not found') {
        return res.status(404).json({ error: error.message });
      }
      return res.status(500).json({ error: 'Failed to fetch partner' });
    }
  }

  /**
   * Create new partner
   * POST /api/partners
   */
  static async create(req: Request, res: Response) {
    try {
      const user = (req as any).user;
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

      const partner = await PartnerService.createPartner(user.companyId, validationResult.data, user.id);
      return res.status(201).json(partner);
    } catch (error: any) {
      logger.error('Failed to create partner:', error);
      if (error.message.includes('already exists')) {
        return res.status(409).json({ error: error.message });
      }
      return res.status(500).json({ error: 'Failed to create partner' });
    }
  }

  /**
   * Update existing partner
   * PUT /api/partners/:id
   */
  static async update(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const id = req.params.id as string;

      if (!user?.companyId) {
        return res.status(403).json({ error: 'User not associated with a company' });
      }

      // Validate request body
      const validationResult = UpdatePartnerSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({
          error: 'Validation failed',
          details: validationResult.error.format(),
        });
      }

      const partner = await PartnerService.updatePartner(id, user.companyId, validationResult.data, user.id);
      return res.json(partner);
    } catch (error: any) {
      logger.error('Failed to update partner:', error);
      if (error.message === 'Partner not found') {
        return res.status(404).json({ error: error.message });
      }
      if (error.message.includes('already exists')) {
        return res.status(409).json({ error: error.message });
      }
      return res.status(500).json({ error: 'Failed to update partner' });
    }
  }

  /**
   * Soft delete partner (set isActive = false)
   * DELETE /api/partners/:id
   */
  static async delete(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const id = req.params.id as string;

      if (!user?.companyId) {
        return res.status(403).json({ error: 'User not associated with a company' });
      }

      const result = await PartnerService.deletePartner(id, user.companyId, user.id);
      return res.json(result);
    } catch (error: any) {
      logger.error('Failed to delete partner:', error);
      if (error.message === 'Partner not found') {
        return res.status(404).json({ error: error.message });
      }
      return res.status(500).json({ error: 'Failed to delete partner' });
    }
  }

  /**
   * Autocomplete search for partner selection
   * GET /api/partners/autocomplete?q=searchTerm&type=BUYER
   */
  static async autocomplete(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const { q, type } = req.query;

      if (!q || typeof q !== 'string') {
        return res.status(400).json({ error: 'Query parameter "q" is required' });
      }

      if (!user?.companyId) {
        return res.status(403).json({ error: 'User not associated with a company' });
      }

      const partners = await PartnerService.autocomplete(
        user.companyId, 
        q, 
        type as PartnerType | undefined
      );
      return res.json(partners);
    } catch (error: any) {
      logger.error('Failed to autocomplete partners:', error);
      return res.status(500).json({ error: 'Failed to search partners' });
    }
  }

  /**
   * Get partner statistics
   * GET /api/partners/:id/stats
   */
  static async stats(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const id = req.params.id as string;

      if (!user?.companyId) {
        return res.status(403).json({ error: 'User not associated with a company' });
      }

      const stats = await PartnerService.getStats(id, user.companyId);
      return res.json(stats);
    } catch (error: any) {
      logger.error('Failed to get partner stats:', error);
      if (error.message === 'Partner not found') {
        return res.status(404).json({ error: error.message });
      }
      return res.status(500).json({ error: 'Failed to fetch partner statistics' });
    }
  }
}
