import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth';
import { z } from 'zod';

const prisma = new PrismaClient();

// Validation schemas
const updateCompanySchema = z.object({
  name: z.string().min(1, 'Company name is required').optional(),
  address: z.string().min(1, 'Address is required').optional(),
  city: z.string().min(1, 'City is required').optional(),
  postalCode: z.string().min(1, 'Postal code is required').optional(),
  country: z.string().default('RS').optional(),
  email: z.string().email('Invalid email format').optional(),
  phone: z.string().optional(),
  bankAccount: z.string().optional(),
  vatNumber: z.string().optional(),
  sefApiKey: z.string().optional(),
  sefEnvironment: z.enum(['demo', 'production']).optional()
});

const createCompanySchema = z.object({
  pib: z.string().min(8, 'PIB must be at least 8 characters').max(9, 'PIB cannot exceed 9 characters'),
  name: z.string().min(1, 'Company name is required'),
  address: z.string().min(1, 'Address is required'),
  city: z.string().min(1, 'City is required'),  
  postalCode: z.string().min(1, 'Postal code is required'),
  country: z.string().default('RS'),
  email: z.string().email('Invalid email format').optional(),
  phone: z.string().optional(),
  bankAccount: z.string().optional(),
  vatNumber: z.string().optional(),
  sefApiKey: z.string().optional(),
  sefEnvironment: z.enum(['demo', 'production']).default('demo')
});

/**
 * Get current company profile
 */
export const getCompany = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const company = await prisma.company.findUnique({
      where: { id: req.user!.companyId },
      select: {
        id: true,
        pib: true,
        name: true,
        address: true,
        city: true,
        postalCode: true,
        country: true,
        email: true,
        phone: true,
        bankAccount: true,
        vatNumber: true,
        sefEnvironment: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        // Don't expose API key for security
        _count: {
          select: {
            users: true,
            suppliedInvoices: true,
            receivedInvoices: true
          }
        }
      }
    });

    if (!company) {
      res.status(404).json({
        success: false,
        message: 'Company not found'
      });
      return;
    }

    res.json({
      success: true,
      data: company
    });

  } catch (error) {
    console.error('Get company error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Update company profile (ADMIN only)
 */
export const updateCompany = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const validatedData = updateCompanySchema.parse(req.body);

    const updatedCompany = await prisma.company.update({
      where: { id: req.user!.companyId },
      data: {
        ...validatedData,
        updatedAt: new Date()
      },
      select: {
        id: true,
        pib: true,
        name: true,
        address: true,
        city: true,
        postalCode: true,
        country: true,
        email: true,
        phone: true,
        bankAccount: true,
        vatNumber: true,
        sefEnvironment: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      }
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        entityType: 'company',
        entityId: req.user!.companyId,
        action: 'UPDATED',
        newData: JSON.stringify(validatedData),
        userId: req.user!.userId
      }
    });

    res.json({
      success: true,
      message: 'Company updated successfully',
      data: updatedCompany
    });

  } catch (error) {
    console.error('Update company error:', error);
    
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: error.issues
      });
      return;
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Create new company (Public endpoint for registration)
 */
export const createCompany = async (req: any, res: Response): Promise<void> => {
  try {
    const validatedData = createCompanySchema.parse(req.body);

    // Check if company with this PIB already exists
    const existingCompany = await prisma.company.findUnique({
      where: { pib: validatedData.pib }
    });

    if (existingCompany) {
      res.status(409).json({
        success: false,
        message: 'Company with this PIB already exists'
      });
      return;
    }

    const newCompany = await prisma.company.create({
      data: {
        ...validatedData,
        isActive: true
      },
      select: {
        id: true,
        pib: true,
        name: true,
        address: true,
        city: true,
        postalCode: true,
        country: true,
        email: true,
        phone: true,
        bankAccount: true,
        vatNumber: true,
        sefEnvironment: true,
        isActive: true,
        createdAt: true
      }
    });

    res.status(201).json({
      success: true,
      message: 'Company created successfully',
      data: newCompany
    });

  } catch (error) {
    console.error('Create company error:', error);
    
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: error.issues
      });
      return;
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Get company users (ADMIN only)
 */
export const getCompanyUsers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const users = await prisma.user.findMany({
      where: { companyId: req.user!.companyId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      data: users
    });

  } catch (error) {
    console.error('Get company users error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Update user role (ADMIN only)
 */
export const updateUserRole = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const { role, isActive } = req.body;

    // Validate role
    const validRoles = ['ADMIN', 'ACCOUNTANT', 'AUDITOR', 'OPERATOR'];
    if (role && !validRoles.includes(role)) {
      res.status(400).json({
        success: false,
        message: 'Invalid role'
      });
      return;
    }

    // Check if user belongs to same company
    const existingUser = await prisma.user.findFirst({
      where: {
        id: userId,
        companyId: req.user!.companyId
      }
    });

    if (!existingUser) {
      res.status(404).json({
        success: false,
        message: 'User not found'
      });
      return;
    }

    // Prevent user from deactivating themselves
    if (userId === req.user!.userId && isActive === false) {
      res.status(400).json({
        success: false,
        message: 'Cannot deactivate your own account'
      });
      return;
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(role && { role }),
        ...(typeof isActive === 'boolean' && { isActive }),
        updatedAt: new Date()
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        updatedAt: true
      }
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        entityType: 'user',
        entityId: userId,
        action: 'ROLE_UPDATED',
        newData: JSON.stringify({ role, isActive }),
        userId: req.user!.userId
      }
    });

    res.json({
      success: true,
      message: 'User updated successfully',
      data: updatedUser
    });

  } catch (error) {
    console.error('Update user role error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Get company statistics (ADMIN and ACCOUNTANT only)
 */
export const getCompanyStats = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { dateFrom, dateTo } = req.query;
    
    // Build date filter
    const dateFilter: any = {};
    if (dateFrom) dateFilter.gte = new Date(dateFrom as string);
    if (dateTo) dateFilter.lte = new Date(dateTo as string);

    const where = {
      OR: [
        { supplierId: req.user!.companyId },
        { buyerId: req.user!.companyId }
      ],
      ...(Object.keys(dateFilter).length > 0 && { issueDate: dateFilter })
    };

    const [
      totalInvoices,
      outgoingInvoices,
      incomingInvoices,
      draftInvoices,
      sentInvoices,
      acceptedInvoices,
      totalAmount,
      totalUsers
    ] = await Promise.all([
      // Total invoices
      prisma.invoice.count({ where }),
      
      // Outgoing invoices count
      prisma.invoice.count({
        where: { ...where, direction: 'OUTGOING' }
      }),
      
      // Incoming invoices count
      prisma.invoice.count({
        where: { ...where, direction: 'INCOMING' }
      }),
      
      // Draft invoices
      prisma.invoice.count({
        where: { ...where, status: 'DRAFT' }
      }),
      
      // Sent invoices
      prisma.invoice.count({
        where: { ...where, status: 'SENT' }
      }),
      
      // Accepted invoices
      prisma.invoice.count({
        where: { ...where, status: 'ACCEPTED' }
      }),
      
      // Total amount (outgoing invoices only)
      prisma.invoice.aggregate({
        where: { 
          supplierId: req.user!.companyId,
          ...(Object.keys(dateFilter).length > 0 && { issueDate: dateFilter })
        },
        _sum: { totalAmount: true }
      }),
      
      // Total company users
      prisma.user.count({
        where: { companyId: req.user!.companyId }
      })
    ]);

    res.json({
      success: true,
      data: {
        invoices: {
          total: totalInvoices,
          outgoing: outgoingInvoices,
          incoming: incomingInvoices,
          draft: draftInvoices,
          sent: sentInvoices,
          accepted: acceptedInvoices
        },
        totalAmount: Number(totalAmount._sum.totalAmount || 0),
        totalUsers,
        period: {
          from: dateFrom || null,
          to: dateTo || null
        }
      }
    });

  } catch (error) {
    console.error('Get company stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Search companies by PIB or name (for invoice creation)
 */
export const searchCompanies = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { search, limit = '10' } = req.query;

    if (!search || (search as string).length < 2) {
      res.status(400).json({
        success: false,
        message: 'Search term must be at least 2 characters'
      });
      return;
    }

    const companies = await prisma.company.findMany({
      where: {
        AND: [
          { isActive: true },
          { id: { not: req.user!.companyId } }, // Exclude own company
          {
            OR: [
              { pib: { contains: search as string } },
              { name: { contains: search as string } }
            ]
          }
        ]
      },
      select: {
        id: true,
        pib: true,
        name: true,
        city: true
      },
      take: parseInt(limit as string),
      orderBy: { name: 'asc' }
    });

    res.json({
      success: true,
      data: companies
    });

  } catch (error) {
    console.error('Search companies error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};