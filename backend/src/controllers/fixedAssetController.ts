import { Response } from 'express';
import { fixedAssetService } from '../services/fixedAssetService';
import { FixedAssetSchema } from '@sef-app/shared';
import { z } from 'zod';
import { AuthenticatedRequest } from '../middleware/auth';

export class FixedAssetController {
  
  async create(req: AuthenticatedRequest, res: Response) {
    try {
      const companyId = req.user?.companyId;
      if (!companyId) {
        return res.status(400).json({ success: false, error: 'Company ID missing' });
      }

      const validatedData = FixedAssetSchema.omit({
        id: true,
        companyId: true,
        createdAt: true,
        updatedAt: true
      }).parse(req.body);
      const asset = await fixedAssetService.createFixedAsset(companyId, validatedData);
      
      res.status(201).json({ success: true, data: asset });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ success: false, error: error.errors });
      }
      console.error('Create fixed asset error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }

  async get(req: AuthenticatedRequest, res: Response) {
    try {
      const companyId = req.user?.companyId;
      const { id } = req.params;
      
      if (!companyId) {
        return res.status(400).json({ success: false, error: 'Company ID missing' });
      }

      const asset = await fixedAssetService.getFixedAsset(companyId, id);
      
      if (!asset) {
        return res.status(404).json({ success: false, error: 'Fixed asset not found' });
      }

      res.json({ success: true, data: asset });
    } catch (error) {
      console.error('Get fixed asset error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }

  async list(req: AuthenticatedRequest, res: Response) {
    try {
      const companyId = req.user?.companyId;
      if (!companyId) {
        return res.status(400).json({ success: false, error: 'Company ID missing' });
      }

      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 20;
      const search = req.query.search as string;

      const result = await fixedAssetService.listFixedAssets(companyId, page, limit, search);
      
      res.json({ success: true, data: result });
    } catch (error) {
      console.error('List fixed assets error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }

  async update(req: AuthenticatedRequest, res: Response) {
    try {
      const companyId = req.user?.companyId;
      const { id } = req.params;
      
      if (!companyId) {
        return res.status(400).json({ success: false, error: 'Company ID missing' });
      }

      // Partial validation for update
      const validatedData = FixedAssetSchema.partial().parse(req.body);
      
      const asset = await fixedAssetService.updateFixedAsset(companyId, id, validatedData);
      
      res.json({ success: true, data: asset });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ success: false, error: error.errors });
      }
      console.error('Update fixed asset error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }

  async delete(req: AuthenticatedRequest, res: Response) {
    try {
      const companyId = req.user?.companyId;
      const { id } = req.params;
      
      if (!companyId) {
        return res.status(400).json({ success: false, error: 'Company ID missing' });
      }

      await fixedAssetService.deleteFixedAsset(companyId, id);
      
      res.json({ success: true, message: 'Fixed asset deleted' });
    } catch (error) {
      console.error('Delete fixed asset error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }

  async calculateAmortization(req: AuthenticatedRequest, res: Response) {
    try {
      const companyId = req.user?.companyId;
      if (!companyId) {
        return res.status(400).json({ success: false, error: 'Company ID missing' });
      }

      const year = Number(req.body.year) || new Date().getFullYear();
      const apply = req.body.apply === true;

      if (apply) {
        const result = await fixedAssetService.applyAmortization(companyId, year);
        res.json({ success: true, data: result, message: 'Amortization applied successfully' });
      } else {
        const result = await fixedAssetService.calculateAmortizationPreview(companyId, year);
        res.json({ success: true, data: result, message: 'Amortization preview calculated' });
      }
    } catch (error) {
      console.error('Calculate amortization error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }
}

export const fixedAssetController = new FixedAssetController();
