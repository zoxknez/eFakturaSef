// src/controllers/settingsController.ts

import { Response } from 'express';
import prisma from '../db/prisma';
import { AuthRequest } from '../middleware/auth';
import { z } from 'zod';
import logger from '../utils/logger';
import { createSEFService } from '../services/sefService';

const updateSettingsSchema = z.object({
  apiKey: z.string().optional(),
  companyName: z.string().min(1).optional(),
  pib: z.string().min(8).optional(),
  address: z.string().min(1).optional(),
  city: z.string().min(1).optional(),
  postalCode: z.string().min(1).optional(),
  emailNotifications: z.boolean().optional(),
  smsNotifications: z.boolean().optional(),
  desktopNotifications: z.boolean().optional(),
  autoSend: z.boolean().optional(),
  retryAttempts: z.number().min(1).max(10).optional(),
  retryDelay: z.number().min(1).max(60).optional(),
});

/**
 * Dobij trenutne postavke kompanije
 */
export const getSettings = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.companyId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const company = await prisma.company.findUnique({
      where: { id: req.user.companyId }
    });

    if (!company) {
      res.status(404).json({ success: false, message: 'Company not found' });
      return;
    }

    // Ne vraćaj API ključ iz sigurnosnih razloga
    const settings = {
      companyName: company.name,
      pib: company.pib,
      address: company.address,
      city: company.city,
      postalCode: company.postalCode,
      apiKey: company.sefApiKey ? '***' : '', // Prikaži da postoji
      emailNotifications: true, // Ovo bi trebalo dodati u bazu
      smsNotifications: false,
      desktopNotifications: true,
      autoSend: false,
      retryAttempts: 3,
      retryDelay: 5
    };

    res.json({
      success: true,
      data: settings
    });

  } catch (error) {
    logger.error('Error getting settings:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/**
 * Ažuriraj postavke kompanije
 */
export const updateSettings = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.companyId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const parsed = updateSettingsSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: parsed.error.issues,
      });
      return;
    }

    const { apiKey, companyName, pib, address, city, postalCode } = parsed.data;

    // Ažuriraj company podatke
    const updateData: any = {};
    if (companyName) updateData.name = companyName;
    if (pib) updateData.pib = pib;
    if (address) updateData.address = address;
    if (city) updateData.city = city;
    if (postalCode) updateData.postalCode = postalCode;
    if (apiKey && apiKey !== '***') updateData.sefApiKey = apiKey;

    const updatedCompany = await prisma.company.update({
      where: { id: req.user.companyId },
      data: updateData
    });

    logger.info('Settings updated:', { companyId: req.user.companyId, userId: req.user.userId });

    res.json({
      success: true,
      message: 'Postavke su uspešno ažurirane',
      data: {
        companyName: updatedCompany.name,
        pib: updatedCompany.pib,
        address: updatedCompany.address,
        city: updatedCompany.city,
        postalCode: updatedCompany.postalCode,
        apiKey: updatedCompany.sefApiKey ? '***' : ''
      }
    });

  } catch (error) {
    logger.error('Error updating settings:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/**
 * Testiraj SEF API konekciju
 */
export const testSEFConnection = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.companyId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const company = await prisma.company.findUnique({
      where: { id: req.user.companyId }
    });

    if (!company?.sefApiKey) {
      res.status(400).json({
        success: false,
        message: 'SEF API ključ nije konfigurisan'
      });
      return;
    }

    const sefService = createSEFService(company.sefApiKey);
    const result = await sefService.testConnection();

    res.json(result);

  } catch (error) {
    logger.error('Error testing SEF connection:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/**
 * Izvezi konfiguraciju
 */
export const exportSettings = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.companyId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const company = await prisma.company.findUnique({
      where: { id: req.user.companyId }
    });

    if (!company) {
      res.status(404).json({ success: false, message: 'Company not found' });
      return;
    }

    const config = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      company: {
        name: company.name,
        pib: company.pib,
        address: company.address,
        city: company.city,
        postalCode: company.postalCode,
        // Ne uključuj API ključ iz sigurnosnih razloga
      },
      settings: {
        emailNotifications: true,
        smsNotifications: false,
        desktopNotifications: true,
        autoSend: false,
        retryAttempts: 3,
        retryDelay: 5
      }
    };

    const filename = `sef-config-${company.pib}-${new Date().toISOString().split('T')[0]}.json`;

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.json(config);

  } catch (error) {
    logger.error('Error exporting settings:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/**
 * Uvezi konfiguraciju
 */
export const importSettings = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.companyId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const { config } = req.body;

    if (!config || !config.company) {
      res.status(400).json({
        success: false,
        message: 'Neispravna konfiguracija'
      });
      return;
    }

    // Ažuriraj company podatke iz importa
    const updateData: any = {};
    if (config.company.name) updateData.name = config.company.name;
    if (config.company.pib) updateData.pib = config.company.pib;
    if (config.company.address) updateData.address = config.company.address;
    if (config.company.city) updateData.city = config.company.city;
    if (config.company.postalCode) updateData.postalCode = config.company.postalCode;

    await prisma.company.update({
      where: { id: req.user.companyId },
      data: updateData
    });

    logger.info('Settings imported:', { companyId: req.user.companyId, userId: req.user.userId });

    res.json({
      success: true,
      message: 'Konfiguracija je uspešno uvezena'
    });

  } catch (error) {
    logger.error('Error importing settings:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/**
 * Sinhronizuj sa SEF sistemom
 */
export const syncWithSEF = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.companyId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const company = await prisma.company.findUnique({
      where: { id: req.user.companyId }
    });

    if (!company?.sefApiKey) {
      res.status(400).json({
        success: false,
        message: 'SEF API ključ nije konfigurisan'
      });
      return;
    }

    const sefService = createSEFService(company.sefApiKey);
    const result = await sefService.syncAllInvoices();

    if (result.success) {
      logger.info('SEF sync completed:', { companyId: req.user.companyId });
    }

    res.json(result);

  } catch (error) {
    logger.error('Error syncing with SEF:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
