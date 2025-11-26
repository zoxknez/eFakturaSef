// @ts-nocheck - Temporary workaround for Prisma Client cache issue (RefreshToken model not recognized by TS Server)
import { prisma } from '../db/prisma';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { config } from '../config';
import { logger } from '../utils/logger';

/**
 * Refresh Token Service
 * Handles JWT refresh token generation, validation, and revocation
 */

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresIn: string;
  refreshTokenExpiresIn: string;
}

export interface TokenPayload {
  id: string;
  email: string;
  role: string;
  companyId: string;
}

/**
 * Generate access and refresh tokens
 */
export async function generateTokenPair(
  payload: TokenPayload,
  userAgent?: string,
  ipAddress?: string
): Promise<TokenPair> {
  // Generate access token (short-lived)
  // @ts-expect-error - expiresIn type compatibility issue with jsonwebtoken@9
  const accessToken = jwt.sign(
    payload,
    config.JWT_SECRET,
    {
      expiresIn: config.JWT_EXPIRE,
    }
  );

  // Generate refresh token (long-lived, cryptographically secure)
  const refreshTokenValue = crypto.randomBytes(64).toString('hex');

  // Calculate expiration
  const expiresAt = new Date();
  const refreshExpireDays = parseInt(config.JWT_REFRESH_EXPIRE.replace('d', ''));
  expiresAt.setDate(expiresAt.getDate() + refreshExpireDays);

  // Store refresh token in database
  await prisma.refreshToken.create({
    data: {
      token: refreshTokenValue,
      userId: payload.id,
      expiresAt,
      userAgent,
      ipAddress,
    },
  });

  logger.info('Generated token pair', {
    userId: payload.id,
    email: payload.email,
    ipAddress,
  });

  return {
    accessToken,
    refreshToken: refreshTokenValue,
    accessTokenExpiresIn: config.JWT_EXPIRE,
    refreshTokenExpiresIn: config.JWT_REFRESH_EXPIRE,
  };
}

/**
 * Validate and refresh access token using refresh token
 */
export async function refreshAccessToken(
  refreshToken: string,
  userAgent?: string,
  ipAddress?: string
): Promise<{ accessToken: string; accessTokenExpiresIn: string }> {
  // Find refresh token in database
  const storedToken = await prisma.refreshToken.findUnique({
    where: { token: refreshToken },
    include: {
      user: {
        include: {
          company: {
            select: { id: true },
          },
        },
      },
    },
  });

  // Validate token exists
  if (!storedToken) {
    logger.warn('Refresh token not found', { refreshToken: refreshToken.substring(0, 10) + '...' });
    throw new Error('Invalid refresh token');
  }

  // Validate token not revoked
  if (storedToken.revoked) {
    logger.warn('Attempted to use revoked refresh token', {
      userId: storedToken.userId,
      revokedAt: storedToken.revokedAt,
    });
    throw new Error('Refresh token has been revoked');
  }

  // Validate token not expired
  if (storedToken.expiresAt < new Date()) {
    logger.warn('Refresh token expired', {
      userId: storedToken.userId,
      expiresAt: storedToken.expiresAt,
    });
    
    // Clean up expired token
    await prisma.refreshToken.delete({
      where: { id: storedToken.id },
    });
    
    throw new Error('Refresh token expired');
  }

  // Validate user is still active
  if (!storedToken.user.isActive) {
    logger.warn('Attempted to refresh token for inactive user', {
      userId: storedToken.userId,
      email: storedToken.user.email,
    });
    
    // Revoke all tokens for this user
    await revokeAllUserTokens(storedToken.userId);
    
    throw new Error('User account is inactive');
  }

  // Optional: Validate user agent and IP for security
  if (storedToken.userAgent && userAgent && storedToken.userAgent !== userAgent) {
    // Log as debug instead of warn to avoid noise in dev environment
    // Browsers update frequently and some tools might not send consistent UA
    logger.debug('User agent mismatch on token refresh', {
      userId: storedToken.userId,
      storedUserAgent: storedToken.userAgent,
      requestUserAgent: userAgent,
    });
  }

  // Generate new access token
  // @ts-expect-error - expiresIn type compatibility issue with jsonwebtoken@9
  const accessToken = jwt.sign(
    {
      id: storedToken.user.id,
      email: storedToken.user.email,
      role: storedToken.user.role,
      companyId: storedToken.user.companyId,
    },
    config.JWT_SECRET,
    { expiresIn: config.JWT_EXPIRE }
  );

  logger.info('Access token refreshed', {
    userId: storedToken.userId,
    email: storedToken.user.email,
    ipAddress,
  });

  return {
    accessToken,
    accessTokenExpiresIn: config.JWT_EXPIRE,
  };
}

/**
 * Revoke a specific refresh token (logout)
 */
export async function revokeRefreshToken(refreshToken: string): Promise<void> {
  const token = await prisma.refreshToken.findUnique({
    where: { token: refreshToken },
  });

  if (!token) {
    logger.warn('Attempted to revoke non-existent token');
    return;
  }

  await prisma.refreshToken.update({
    where: { id: token.id },
    data: {
      revoked: true,
      revokedAt: new Date(),
    },
  });

  logger.info('Refresh token revoked', {
    userId: token.userId,
    tokenId: token.id,
  });
}

/**
 * Revoke all refresh tokens for a user (logout from all devices)
 */
export async function revokeAllUserTokens(userId: string): Promise<void> {
  const result = await prisma.refreshToken.updateMany({
    where: {
      userId,
      revoked: false,
    },
    data: {
      revoked: true,
      revokedAt: new Date(),
    },
  });

  logger.info('All user refresh tokens revoked', {
    userId,
    count: result.count,
  });
}

/**
 * Clean up expired refresh tokens (run periodically)
 */
export async function cleanupExpiredTokens(): Promise<number> {
  const result = await prisma.refreshToken.deleteMany({
    where: {
      expiresAt: {
        lt: new Date(),
      },
    },
  });

  logger.info('Cleaned up expired refresh tokens', {
    count: result.count,
  });

  return result.count;
}

/**
 * Get all active refresh tokens for a user (for session management)
 */
export async function getUserActiveSessions(userId: string): Promise<
  Array<{
    id: string;
    createdAt: Date;
    expiresAt: Date;
    userAgent: string | null;
    ipAddress: string | null;
  }>
> {
  const tokens = await prisma.refreshToken.findMany({
    where: {
      userId,
      revoked: false,
      expiresAt: {
        gt: new Date(),
      },
    },
    select: {
      id: true,
      createdAt: true,
      expiresAt: true,
      userAgent: true,
      ipAddress: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return tokens;
}

export default {
  generateTokenPair,
  refreshAccessToken,
  revokeRefreshToken,
  revokeAllUserTokens,
  cleanupExpiredTokens,
  getUserActiveSessions,
};
