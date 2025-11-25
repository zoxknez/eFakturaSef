import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../db/prisma';
import { config } from '../config';
import { logger } from '../utils/logger';
import tokenService from '../services/tokenService';

// Validation schemas
const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters')
});

const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  companyId: z.string().uuid('Invalid company ID')
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required')
});

export class AuthController {
  /**
   * User login
   * POST /api/auth/login
   */
  static async login(req: Request, res: Response) {
    try {
      // Validate input
      const validation = loginSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: validation.error.errors
        });
      }

      const { email, password } = validation.data;

      // Find user in database
      const user = await prisma.user.findUnique({
        where: { email },
        include: { company: true }
      });

      if (!user) {
        logger.warn(`Login attempt with non-existent email: ${email}`);
        return res.status(401).json({
          success: false,
          error: 'Invalid credentials'
        });
      }

      if (!user.isActive) {
        logger.warn(`Login attempt with inactive user: ${email}`);
        return res.status(401).json({
          success: false,
          error: 'Account is deactivated'
        });
      }

      // Check password
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        logger.warn(`Failed login attempt for user: ${email}`);
        return res.status(401).json({
          success: false,
          error: 'Invalid credentials'
        });
      }

      // Generate tokens using TokenService
      const tokenPair = await tokenService.generateTokenPair(
        {
          id: user.id,
          email: user.email,
          role: user.role,
          companyId: user.companyId
        },
        req.headers['user-agent'],
        req.ip
      );

      // Log successful login
      logger.info(`User logged in successfully: ${email}`);

      return res.json({
        success: true,
        data: {
          ...tokenPair,
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            company: {
              id: user.company.id,
              name: user.company.name,
              pib: user.company.pib
            }
          }
        }
      });
    } catch (error: any) {
      logger.error('Login error:', error);
      return res.status(500).json({
        success: false,
        error: 'Server error'
      });
    }
  }

  /**
   * Register new user
   * POST /api/auth/register
   */
  static async register(req: Request, res: Response) {
    try {
      // Validate input
      const validation = registerSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: validation.error.errors
        });
      }

      const { email, password, firstName, lastName, companyId } = validation.data;

      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email }
      });

      if (existingUser) {
        return res.status(409).json({
          success: false,
          error: 'User with this email already exists'
        });
      }

      // Check if company exists
      const company = await prisma.company.findUnique({
        where: { id: companyId }
      });

      if (!company) {
        return res.status(400).json({
          success: false,
          error: 'Company not found'
        });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, config.BCRYPT_ROUNDS);

      // Create user
      const user = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          firstName,
          lastName,
          role: 'OPERATOR', // Default role
          companyId
        },
        include: { company: true }
      });

      logger.info(`New user registered: ${email}`);

      return res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: {
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            company: {
              id: user.company.id,
              name: user.company.name,
              pib: user.company.pib
            }
          }
        }
      });
    } catch (error: any) {
      logger.error('Registration error:', error);
      return res.status(500).json({
        success: false,
        error: 'Server error'
      });
    }
  }

  /**
   * Refresh access token
   * POST /api/auth/refresh
   */
  static async refresh(req: Request, res: Response) {
    try {
      const validation = refreshSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          success: false,
          error: 'Refresh token is required'
        });
      }

      const { refreshToken } = validation.data;

      // Use TokenService to refresh
      const result = await tokenService.refreshAccessToken(
        refreshToken,
        req.headers['user-agent'],
        req.ip
      );

      return res.json({
        success: true,
        data: result
      });
    } catch (error: any) {
      logger.error('Token refresh error:', error);
      
      const status = error.message.includes('revoked') || error.message.includes('expired') || error.message.includes('Invalid') 
        ? 401 
        : 500;
        
      return res.status(status).json({
        success: false,
        error: error.message || 'Token refresh failed'
      });
    }
  }

  /**
   * Logout user
   * POST /api/auth/logout
   */
  static async logout(req: Request, res: Response) {
    try {
      const { refreshToken } = req.body;

      if (refreshToken) {
        await tokenService.revokeRefreshToken(refreshToken);
      }

      return res.json({
        success: true,
        message: 'Logged out successfully'
      });
    } catch (error: any) {
      logger.error('Logout error:', error);
      return res.status(500).json({
        success: false,
        error: 'Logout failed'
      });
    }
  }

  /**
   * Get current user info
   * GET /api/auth/me
   */
  static async me(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      
      if (!user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      // Fetch fresh user data
      const userData = await prisma.user.findUnique({
        where: { id: user.id },
        include: { company: true }
      });

      if (!userData) {
        return res.status(404).json({ error: 'User not found' });
      }

      return res.json({
        success: true,
        data: {
          user: {
            id: userData.id,
            email: userData.email,
            firstName: userData.firstName,
            lastName: userData.lastName,
            role: userData.role,
            company: {
              id: userData.company.id,
              name: userData.company.name,
              pib: userData.company.pib
            }
          }
        }
      });
    } catch (error: any) {
      logger.error('Get me error:', error);
      return res.status(500).json({ error: 'Server error' });
    }
  }
}
