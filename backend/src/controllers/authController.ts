import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { z } from 'zod';
import { prisma } from '../db/prisma';
import { config } from '../config';
import { logger } from '../utils/logger';
import tokenService from '../services/tokenService';
import { emailTemplates } from '../services/emailService';
import { AuthenticatedRequest } from '../middleware/auth';

// Validation schemas
const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters')
});

// Password complexity validation
const passwordComplexitySchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: passwordComplexitySchema,
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  companyId: z.string().uuid('Invalid company ID')
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required')
});

const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email format')
});

const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  password: passwordComplexitySchema
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
    } catch (error) {
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
    } catch (error) {
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
    } catch (error) {
      logger.error('Token refresh error:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const status = errorMessage.includes('revoked') || errorMessage.includes('expired') || errorMessage.includes('Invalid') 
        ? 401 
        : 500;
        
      return res.status(status).json({
        success: false,
        error: errorMessage || 'Token refresh failed'
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
    } catch (error) {
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
      const authReq = req as AuthenticatedRequest;
      const user = authReq.user;
      
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
    } catch (error) {
      logger.error('Get me error:', error);
      return res.status(500).json({ error: 'Server error' });
    }
  }

  /**
   * Request password reset
   * POST /api/auth/forgot-password
   */
  static async forgotPassword(req: Request, res: Response) {
    try {
      const validation = forgotPasswordSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: validation.error.errors
        });
      }

      const { email } = validation.data;

      // Always return success to prevent email enumeration
      const successResponse = {
        success: true,
        message: 'Ako postoji nalog sa ovom email adresom, link za resetovanje lozinke će biti poslat.'
      };

      // Find user
      const user = await prisma.user.findUnique({
        where: { email }
      });

      if (!user || !user.isActive) {
        // Log but don't reveal to user
        logger.info(`Password reset requested for non-existent/inactive email: ${email}`);
        return res.json(successResponse);
      }

      // Generate secure token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

      // Delete any existing tokens for this user
      await prisma.passwordResetToken.deleteMany({
        where: { userId: user.id }
      });

      // Create new token (valid for 1 hour)
      await prisma.passwordResetToken.create({
        data: {
          token: hashedToken,
          userId: user.id,
          expiresAt: new Date(Date.now() + 60 * 60 * 1000) // 1 hour
        }
      });

      // TODO: Send email with reset link
      // For now, log the token (remove in production!)
      const resetUrl = `${config.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}`;
      
      // Send password reset email
      await emailTemplates.passwordReset(user.email, {
        firstName: user.firstName,
        resetUrl
      });
      
      // Also log in development for testing
      if (config.NODE_ENV !== 'production') {
        logger.info(`Password reset link for ${email}: ${resetUrl}`);
      }

      return res.json(successResponse);
    } catch (error) {
      logger.error('Forgot password error:', error);
      return res.status(500).json({
        success: false,
        error: 'Server error'
      });
    }
  }

  /**
   * Reset password with token
   * POST /api/auth/reset-password
   */
  static async resetPassword(req: Request, res: Response) {
    try {
      const validation = resetPasswordSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: validation.error.errors
        });
      }

      const { token, password } = validation.data;

      // Hash the incoming token
      const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

      // Find the token in database
      const resetToken = await prisma.passwordResetToken.findUnique({
        where: { token: hashedToken },
        include: { user: true }
      });

      if (!resetToken) {
        logger.warn('Password reset attempted with invalid token');
        return res.status(400).json({
          success: false,
          error: 'Link za resetovanje lozinke nije validan ili je istekao.'
        });
      }

      // Check if token is expired
      if (resetToken.expiresAt < new Date()) {
        await prisma.passwordResetToken.delete({ where: { id: resetToken.id } });
        return res.status(400).json({
          success: false,
          error: 'Link za resetovanje lozinke je istekao. Molimo zatražite novi.'
        });
      }

      // Check if token was already used
      if (resetToken.usedAt) {
        return res.status(400).json({
          success: false,
          error: 'Ovaj link je već iskorišćen. Molimo zatražite novi.'
        });
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(password, config.BCRYPT_ROUNDS);

      // Update password and mark token as used (in transaction)
      await prisma.$transaction([
        prisma.user.update({
          where: { id: resetToken.userId },
          data: { password: hashedPassword }
        }),
        prisma.passwordResetToken.update({
          where: { id: resetToken.id },
          data: { usedAt: new Date() }
        }),
        // Revoke all existing refresh tokens for security
        prisma.refreshToken.updateMany({
          where: { userId: resetToken.userId },
          data: { revoked: true, revokedAt: new Date() }
        })
      ]);

      logger.info(`Password successfully reset for user: ${resetToken.user.email}`);

      // Send confirmation email
      await emailTemplates.passwordChanged(resetToken.user.email, {
        firstName: resetToken.user.firstName
      });

      return res.json({
        success: true,
        message: 'Lozinka je uspešno promenjena. Sada se možete prijaviti.'
      });
    } catch (error) {
      logger.error('Reset password error:', error);
      return res.status(500).json({
        success: false,
        error: 'Server error'
      });
    }
  }
}
