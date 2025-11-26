import { Response } from 'express';
import { pettyCashService } from '../services/pettyCashService';
import { PettyCashEntrySchema } from '@sef-app/shared';
import { z } from 'zod';
import { AuthenticatedRequest } from '../middleware/auth';

export class PettyCashController {
  
  // --- Accounts ---

  async createAccount(req: AuthenticatedRequest, res: Response) {
    try {
      const companyId = req.user?.companyId;
      if (!companyId) {
        return res.status(400).json({ success: false, error: 'Company ID missing' });
      }

      const { name, currency } = req.body;
      if (!name) {
        return res.status(400).json({ success: false, error: 'Name is required' });
      }

      const account = await pettyCashService.createAccount(companyId, name, currency);
      res.status(201).json({ success: true, data: account });
    } catch (error) {
      console.error('Create petty cash account error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }

  async getAccounts(req: AuthenticatedRequest, res: Response) {
    try {
      const companyId = req.user?.companyId;
      if (!companyId) {
        return res.status(400).json({ success: false, error: 'Company ID missing' });
      }

      const accounts = await pettyCashService.getAccounts(companyId);
      res.json({ success: true, data: accounts });
    } catch (error) {
      console.error('Get petty cash accounts error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }

  async getAccount(req: AuthenticatedRequest, res: Response) {
    try {
      const companyId = req.user?.companyId;
      const { id } = req.params;
      
      if (!companyId) {
        return res.status(400).json({ success: false, error: 'Company ID missing' });
      }

      const account = await pettyCashService.getAccountById(companyId, id);
      if (!account) {
        return res.status(404).json({ success: false, error: 'Account not found' });
      }

      res.json({ success: true, data: account });
    } catch (error) {
      console.error('Get petty cash account error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }

  // --- Entries ---

  async createEntry(req: AuthenticatedRequest, res: Response) {
    try {
      const companyId = req.user?.companyId;
      const userId = req.user?.id;
      
      if (!companyId || !userId) {
        return res.status(400).json({ success: false, error: 'User context missing' });
      }

      const validatedData = PettyCashEntrySchema.parse(req.body);
      
      const entry = await pettyCashService.createEntry(companyId, userId, validatedData);
      res.status(201).json({ success: true, data: entry });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ success: false, error: error.errors });
      }
      console.error('Create petty cash entry error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }

  async listEntries(req: AuthenticatedRequest, res: Response) {
    try {
      const companyId = req.user?.companyId;
      if (!companyId) {
        return res.status(400).json({ success: false, error: 'Company ID missing' });
      }

      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 20;
      const accountId = req.query.accountId as string;

      const result = await pettyCashService.listEntries(companyId, accountId, page, limit);
      res.json({ success: true, data: result });
    } catch (error) {
      console.error('List petty cash entries error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }

  async getNextEntryNumber(req: AuthenticatedRequest, res: Response) {
    try {
      const companyId = req.user?.companyId;
      const { accountId } = req.params;
      
      if (!companyId) {
        return res.status(400).json({ success: false, error: 'Company ID missing' });
      }

      const number = await pettyCashService.getNextEntryNumber(companyId, accountId);
      res.json({ success: true, data: { number } });
    } catch (error) {
      console.error('Get next entry number error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }
}

export const pettyCashController = new PettyCashController();
