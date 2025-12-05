import { Request, Response } from 'express';
import { logger } from '../utils/logger';
import { CompanyService, CreateCompanySchema, UpdateCompanySchema } from '../services/companyService';
import { AuthenticatedRequest } from '../middleware/auth';
import { AppError, Errors, handleControllerError } from '../utils/errorHandler';

export class CompanyController {
  /**
   * Get user's company
   */
  static async get(req: Request, res: Response) {
    try {
      const authReq = req as AuthenticatedRequest;
      const userId = authReq.user?.id;
      
      if (!userId) {
        throw Errors.unauthorized('User not authenticated');
      }
      
      const company = await CompanyService.getUserCompany(userId);
      return res.json({ success: true, data: company });
    } catch (error: unknown) {
      return handleControllerError('CompanyController.get', error, res);
    }
  }

  /**
   * Create company
   */
  static async create(req: Request, res: Response) {
    try {
      // Validate request body
      const validationResult = CreateCompanySchema.safeParse(req.body);
      if (!validationResult.success) {
        throw Errors.validationError(validationResult.error.errors);
      }

      const company = await CompanyService.createCompany(validationResult.data);
      return res.status(201).json({ success: true, data: company });
    } catch (error: unknown) {
      return handleControllerError('CompanyController.create', error, res);
    }
  }

  /**
   * Update company
   */
  static async update(req: Request, res: Response) {
    try {
      const authReq = req as AuthenticatedRequest;
      const userId = authReq.user?.id;
      
      if (!userId) {
        throw Errors.unauthorized('User not authenticated');
      }
      
      // Get user's company ID first
      const company = await CompanyService.getUserCompany(userId);
      
      // Validate request body
      const validationResult = UpdateCompanySchema.safeParse(req.body);
      if (!validationResult.success) {
        throw Errors.validationError(validationResult.error.errors);
      }

      const updatedCompany = await CompanyService.updateCompany(company.id, validationResult.data);
      return res.json({ success: true, data: updatedCompany });
    } catch (error: unknown) {
      return handleControllerError('CompanyController.update', error, res);
    }
  }
}
