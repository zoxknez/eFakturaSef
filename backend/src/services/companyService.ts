import { prisma } from '../db/prisma';
import { logger } from '../utils/logger';
import { z } from 'zod';

// ========================================
// ZOD VALIDATION SCHEMAS
// ========================================

export const CreateCompanySchema = z.object({
  name: z.string().min(1, 'Company name is required').max(255),
  pib: z.string().length(9, 'PIB must be exactly 9 digits'),
  address: z.string().optional(),
  city: z.string().optional(),
  postalCode: z.string().optional(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().optional(),
});

export const UpdateCompanySchema = z.object({
  name: z.string().min(1).max(255).optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  bankAccount: z.string().optional(),
  sefApiKey: z.string().optional(),
  sefEnvironment: z.enum(['DEMO', 'PROD']).optional(),
  autoStockDeduction: z.boolean().optional(),
});

export type CreateCompanyDTO = z.infer<typeof CreateCompanySchema>;
export type UpdateCompanyDTO = z.infer<typeof UpdateCompanySchema>;

export class CompanyService {
  /**
   * Get company by ID
   */
  static async getCompany(id: string) {
    const company = await prisma.company.findUnique({
      where: { id },
    });

    if (!company) {
      throw new Error('Company not found');
    }

    return company;
  }

  /**
   * Get company associated with a user
   */
  static async getUserCompany(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { company: true },
    });

    if (!user || !user.company) {
      throw new Error('Company not found for this user');
    }

    return user.company;
  }

  /**
   * Create new company
   */
  static async createCompany(data: CreateCompanyDTO) {
    // Check if company with same PIB exists
    const existingCompany = await prisma.company.findUnique({
      where: { pib: data.pib },
    });

    if (existingCompany) {
      throw new Error(`Company with PIB ${data.pib} already exists`);
    }

    const company = await prisma.company.create({
      data: {
        name: data.name,
        pib: data.pib,
        address: data.address || '',
        city: data.city || '',
        postalCode: data.postalCode || '',
        country: 'RS',
        email: data.email,
        phone: data.phone,
      },
    });

    logger.info(`Company created: ${company.id} (PIB: ${company.pib})`);
    return company;
  }

  /**
   * Update company
   */
  static async updateCompany(id: string, data: UpdateCompanyDTO) {
    // Check if company exists
    const existingCompany = await prisma.company.findUnique({
      where: { id },
    });

    if (!existingCompany) {
      throw new Error('Company not found');
    }

    const company = await prisma.company.update({
      where: { id },
      data,
    });

    logger.info(`Company updated: ${id}`, { fields: Object.keys(data) });
    return company;
  }
}
