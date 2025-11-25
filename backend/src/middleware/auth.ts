import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';
import { config } from '../config';
import { prisma } from '../db/prisma';
import { logger } from '../utils/logger';
import { UserRole } from '@prisma/client';
import { default as cacheService, CachePrefix } from '../services/cacheService';

/**
 * JWT Payload structure
 */
interface JWTPayload {
  id: string;
  email: string;
  role: UserRole;
  companyId: string;
  iat: number;
  exp: number;
}

/**
 * Authenticated user data attached to request
 */
export interface AuthenticatedUser {
  id: string;
  email: string;
  role: UserRole;
  companyId: string;
  isActive: boolean;
}

/**
 * Extended Request with authenticated user
 */
export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

/**
 * Check if token has been revoked
 * TODO: Implement Redis-based token revocation store for better performance
 */
async function isTokenRevoked(_token: string, userId: string): Promise<boolean> {
  try {
    // Check if user has any active refresh tokens
    // If all refresh tokens are revoked, consider access token revoked too
    const activeTokens = await prisma.refreshToken.count({
      where: {
        userId,
        revoked: false,
        expiresAt: {
          gt: new Date(),
        },
      },
    });

    // If user has no active refresh tokens, they've logged out everywhere
    // Consider their access tokens revoked
    return activeTokens === 0;
  } catch (error) {
    logger.error('Error checking token revocation', { error, userId });
    // Fail open - allow request to proceed but log the error
    return false;
  }
}

/**
 * Authentication middleware
 * Verifies JWT token and loads user data from database
 */
export const authMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Extract token from Authorization header
    const authHeader = req.header('Authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      res.status(401).json({
        success: false,
        error: 'No authentication token provided',
      });
      return;
    }

    // Verify and decode JWT token
    let decoded: JWTPayload;
    try {
      decoded = jwt.verify(token, config.JWT_SECRET) as JWTPayload;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        res.status(401).json({
          success: false,
          error: 'Token has expired',
          code: 'TOKEN_EXPIRED',
        });
        return;
      }
      if (error instanceof jwt.JsonWebTokenError) {
        res.status(401).json({
          success: false,
          error: 'Invalid token',
          code: 'INVALID_TOKEN',
        });
        return;
      }
      throw error;
    }

    // Check if token has been revoked (user logged out)
    const revoked = await isTokenRevoked(token, decoded.id);
    if (revoked) {
      res.status(401).json({
        success: false,
        error: 'Token has been revoked',
        code: 'TOKEN_REVOKED',
      });
      return;
    }

    // Fetch user from cache or database
    const user = await cacheService.getOrSet(
      CachePrefix.USER,
      decoded.id,
      async () => {
        return await prisma.user.findUnique({
          where: { id: decoded.id },
          select: {
            id: true,
            email: true,
            role: true,
            companyId: true,
            isActive: true,
            company: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        });
      },
      300 // 5 minutes TTL
    );

    if (!user) {
      res.status(401).json({
        success: false,
        error: 'User not found',
        code: 'USER_NOT_FOUND',
      });
      return;
    }

    if (!user.isActive) {
      res.status(401).json({
        success: false,
        error: 'User account is disabled',
        code: 'USER_DISABLED',
      });
      return;
    }

    // Validate company exists
    if (!user.company) {
      res.status(401).json({
        success: false,
        error: 'User company not found',
        code: 'COMPANY_NOT_FOUND',
      });
      return;
    }

    // Attach authenticated user to request
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      companyId: user.companyId,
      isActive: user.isActive,
    };

    logger.debug('User authenticated', {
      userId: user.id,
      email: user.email,
      role: user.role,
      companyId: user.companyId,
    });

    next();
  } catch (error: any) {
    logger.error('Authentication error', {
      error: error.message,
      stack: error.stack,
    });

    res.status(500).json({
      success: false,
      error: 'Authentication failed',
      code: 'AUTH_ERROR',
    });
  }
};

/**
 * Role-based access control middleware
 * Requires user to have one of the specified roles
 */
export const requireRole = (roles: UserRole[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
      return;
    }

    if (!roles.includes(req.user.role)) {
      logger.warn('Access denied - insufficient permissions', {
        userId: req.user.id,
        userRole: req.user.role,
        requiredRoles: roles,
      });

      res.status(403).json({
        success: false,
        error: 'Insufficient permissions',
        code: 'FORBIDDEN',
      });
      return;
    }

    next();
  };
};

/**
 * Optional authentication middleware
 * Loads user if token is present, but doesn't require it
 */
export const optionalAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.header('Authorization');
  const token = authHeader?.replace('Bearer ', '');

  if (!token) {
    // No token provided, proceed without authentication
    next();
    return;
  }

  try {
    // Try to authenticate, but don't fail if it doesn't work
    await authMiddleware(req, res, () => {});
  } catch (error) {
    // Ignore authentication errors for optional auth
    logger.debug('Optional auth failed, proceeding without user', { error });
  }

  next();
};