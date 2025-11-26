import { Request, Response } from 'express';
import { logger } from '../utils/logger';
import { CompanyService, CreateCompanySchema, UpdateCompanySchema } from '../services/companyService';
import { AuthenticatedRequest } from '../middleware/auth';
import { getErrorMessage } from '../types/common';

export class CompanyController {
  /**
   * Get user's company
   */
  static async get(req: Request, res: Response) {
    try {
      const authReq = req as AuthenticatedRequest;
      const userId = authReq.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }
      const company = await CompanyService.getUserCompany(userId);
      return res.json({ success: true, data: company });
    } catch (error: unknown) {
      const message = getErrorMessage(error);
      logger.error('Failed to get company:', error);
      if (message === 'Company not found for this user') {
        return res.status(404).json({ success: false, error: message });
      }
      return res.status(500).json({ success: false, error: 'Failed to fetch company' });
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
        return res.status(400).json({
          error: 'Validation failed',
          details: validationResult.error.format(),
        });
      }

      const company = await CompanyService.createCompany(validationResult.data);
      return res.status(201).json(company);
    } catch (error: unknown) {
      const message = getErrorMessage(error);
      logger.error('Failed to create company:', error);
      if (message.includes('already exists')) {
        return res.status(409).json({ error: message });
      }
      return res.status(500).json({ error: 'Failed to create company' });
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
        return res.status(401).json({ error: 'Unauthorized' });
      }
      
      // Get user's company ID first
      const company = await CompanyService.getUserCompany(userId);
      
      // Validate request body
      const validationResult = UpdateCompanySchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({
          error: 'Validation failed',
          details: validationResult.error.format(),
        });
      }

      const updatedCompany = await CompanyService.updateCompany(company.id, validationResult.data);
      return res.json({ success: true, data: updatedCompany });
    } catch (error: unknown) {
      const message = getErrorMessage(error);
      logger.error('Failed to update company:', error);
      if (message === 'Company not found' || message === 'Company not found for this user') {
        return res.status(404).json({ error: message });
      }
      return res.status(500).json({ error: 'Failed to update company' });
    }
  }
}
