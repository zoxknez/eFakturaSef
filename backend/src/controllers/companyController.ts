import { Request, Response } from 'express';
import { prisma } from '../db/prisma';
import { logger } from '../utils/logger';

export class CompanyController {
  /**
   * Get user's company
   */
  static async get(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;

      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { company: true },
      });

      if (!user || !user.company) {
        return res.status(404).json({ success: false, error: 'Company not found' });
      }

      res.json({ success: true, data: user.company });
    } catch (error: any) {
      logger.error('Failed to get company:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch company' });
    }
  }

  /**
   * Create company
   */
  static async create(req: Request, res: Response) {
    try {
      const { name, pib, address, city, postalCode, email, phone } = req.body;

      if (!name || !pib) {
        return res.status(400).json({ error: 'Name and PIB are required' });
      }

      const company = await prisma.company.create({
        data: {
          name,
          pib,
          address: address || '',
          city: city || '',
          postalCode: postalCode || '',
          country: 'RS',
          email,
          phone,
        },
      });

      logger.info(`Company created: ${company.id}`);
      res.status(201).json(company);
    } catch (error: any) {
      logger.error('Failed to create company:', error);
      res.status(500).json({ error: 'Failed to create company' });
    }
  }

  /**
   * Update company
   */
  static async update(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      const updateData = req.body;

      // Get user's company
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { companyId: true },
      });

      if (!user?.companyId) {
        return res.status(404).json({ error: 'User has no company associated' });
      }

      // Whitelist allowed fields for update
      const allowedFields = [
        'name',
        'address',
        'city',
        'postalCode',
        'country',
        'email',
        'phone',
        'bankAccount',
        'sefApiKey',
        'sefEnvironment',
        'autoStockDeduction',
      ];

      const filteredData: any = {};
      for (const key of allowedFields) {
        if (updateData[key] !== undefined) {
          filteredData[key] = updateData[key];
        }
      }

      const company = await prisma.company.update({
        where: { id: user.companyId },
        data: filteredData,
      });

      logger.info(`Company updated: ${user.companyId}`, { fields: Object.keys(filteredData) });
      res.json({ success: true, data: company });
    } catch (error: any) {
      logger.error('Failed to update company:', error);
      res.status(500).json({ error: 'Failed to update company' });
    }
  }
}
