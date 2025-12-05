import { Request, Response } from 'express';
import { logger } from '../utils/logger';
import { PartnerService, CreatePartnerSchema, UpdatePartnerSchema } from '../services/partnerService';
import { z } from 'zod';
import { PartnerType } from '@prisma/client';
import { AuthenticatedRequest } from '../middleware/auth';
import { AppError, Errors, handleControllerError, getAuthenticatedCompanyId } from '../utils/errorHandler';

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
      const authReq = req as AuthenticatedRequest;
      const companyId = getAuthenticatedCompanyId(authReq.user);

      // Validate query params
      const queryResult = ListPartnersQuerySchema.safeParse(req.query);
      if (!queryResult.success) {
        throw Errors.validationError(queryResult.error.errors);
      }

      const { page, limit, search, type, isActive, sortBy, sortOrder } = queryResult.data;

      const result = await PartnerService.listPartners(companyId, {
        page: parseInt(page),
        limit: parseInt(limit),
        search,
        type,
        isActive: isActive ? isActive === 'true' : undefined,
        sortBy,
        sortOrder: sortOrder as 'asc' | 'desc',
      });

      return res.json({ success: true, ...result });
    } catch (error: unknown) {
      return handleControllerError('PartnerController.list', error, res);
    }
  }

  /**
   * Get single partner by ID
   * GET /api/partners/:id
   */
  static async get(req: Request, res: Response) {
    try {
      const authReq = req as AuthenticatedRequest;
      const companyId = getAuthenticatedCompanyId(authReq.user);
      const id = req.params.id as string;

      if (!id) {
        throw Errors.badRequest('Partner ID is required');
      }

      const partner = await PartnerService.getPartner(id, companyId);
      return res.json({ success: true, data: partner });
    } catch (error: unknown) {
      return handleControllerError('PartnerController.get', error, res);
    }
  }

  /**
   * Create new partner
   * POST /api/partners
   */
  static async create(req: Request, res: Response) {
    try {
      const authReq = req as AuthenticatedRequest;
      const companyId = getAuthenticatedCompanyId(authReq.user);
      
      if (!authReq.user?.id) {
        throw Errors.unauthorized('User not authenticated');
      }

      // Validate request body
      const validationResult = CreatePartnerSchema.safeParse(req.body);
      if (!validationResult.success) {
        throw Errors.validationError(validationResult.error.errors);
      }

      const partner = await PartnerService.createPartner(companyId, validationResult.data, authReq.user.id);
      return res.status(201).json({ success: true, data: partner });
    } catch (error: unknown) {
      return handleControllerError('PartnerController.create', error, res);
    }
  }

  /**
   * Update existing partner
   * PUT /api/partners/:id
   */
  static async update(req: Request, res: Response) {
    try {
      const authReq = req as AuthenticatedRequest;
      const companyId = getAuthenticatedCompanyId(authReq.user);
      const id = req.params.id as string;
      
      if (!id) {
        throw Errors.badRequest('Partner ID is required');
      }
      
      if (!authReq.user?.id) {
        throw Errors.unauthorized('User not authenticated');
      }

      // Validate request body
      const validationResult = UpdatePartnerSchema.safeParse(req.body);
      if (!validationResult.success) {
        throw Errors.validationError(validationResult.error.errors);
      }

      const partner = await PartnerService.updatePartner(id, companyId, validationResult.data, authReq.user.id);
      return res.json({ success: true, data: partner });
    } catch (error: unknown) {
      return handleControllerError('PartnerController.update', error, res);
    }
  }

  /**
   * Soft delete partner (set isActive = false)
   * DELETE /api/partners/:id
   */
  static async delete(req: Request, res: Response) {
    try {
      const authReq = req as AuthenticatedRequest;
      const companyId = getAuthenticatedCompanyId(authReq.user);
      const id = req.params.id as string;
      
      if (!id) {
        throw Errors.badRequest('Partner ID is required');
      }

      if (!authReq.user?.id) {
        throw Errors.unauthorized('User not authenticated');
      }

      await PartnerService.deletePartner(id, companyId, authReq.user.id);
      return res.json({ success: true, message: 'Partner deleted successfully' });
    } catch (error: unknown) {
      return handleControllerError('PartnerController.delete', error, res);
    }
  }

  /**
   * Get partner statistics
   * GET /api/partners/:id/stats
   */
  static async stats(req: Request, res: Response) {
    try {
      const authReq = req as AuthenticatedRequest;
      const companyId = getAuthenticatedCompanyId(authReq.user);
      const id = req.params.id as string;
      
      if (!id) {
        throw Errors.badRequest('Partner ID is required');
      }

      const stats = await PartnerService.getStats(id, companyId);
      return res.json({ success: true, data: stats });
    } catch (error: unknown) {
      return handleControllerError('PartnerController.stats', error, res);
    }
  }

  /**
   * Autocomplete search for partner selection
   * GET /api/partners/autocomplete?q=searchTerm&type=BUYER
   */
  static async autocomplete(req: Request, res: Response) {
    try {
      const authReq = req as AuthenticatedRequest;
      const companyId = getAuthenticatedCompanyId(authReq.user);
      const { q, type } = req.query;

      if (!q || typeof q !== 'string') {
        throw Errors.badRequest('Query parameter "q" is required');
      }

      const partners = await PartnerService.autocomplete(
        companyId, 
        q, 
        type as PartnerType | undefined
      );
      return res.json({ success: true, data: partners });
    } catch (error: unknown) {
      return handleControllerError('PartnerController.autocomplete', error, res);
    }
  }
}
