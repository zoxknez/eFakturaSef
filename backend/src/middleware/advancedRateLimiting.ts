// Advanced rate limiting with per-user and per-role limits
import { Request, Response, NextFunction } from 'express';
import { createClient, RedisClientType } from 'redis';
import { config } from '../config';
import { logger } from '../utils/logger';
import { getContext } from './requestContext';

// Redis client for rate limiting
let redisClient: RedisClientType | null = null;
let isRedisConnected = false;

// In-memory fallback (for development without Redis)
const memoryStore = new Map<string, { count: number; resetTime: number }>();

/**
 * Initialize Redis connection for rate limiting
 */
export async function initRateLimitRedis(): Promise<void> {
  try {
    redisClient = createClient({
      url: config.REDIS_URL,
      socket: {
        host: config.redis.host,
        port: config.redis.port,
      },
      password: config.redis.password,
    });

    redisClient.on('error', (err) => {
      logger.error('Rate limit Redis error', { error: err.message });
      isRedisConnected = false;
    });

    redisClient.on('connect', () => {
      logger.info('Rate limit Redis connected');
      isRedisConnected = true;
    });

    await redisClient.connect();
  } catch (error: any) {
    logger.warn('Failed to connect to Redis for rate limiting, using in-memory fallback', {
      error: error.message,
    });
    isRedisConnected = false;
  }
}

/**
 * Close Redis connection
 */
export async function closeRateLimitRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    logger.info('Rate limit Redis connection closed');
  }
}

/**
 * Rate limit configuration by user role
 */
export enum UserRole {
  ADMIN = 'ADMIN',
  ACCOUNTANT = 'ACCOUNTANT',
  AUDITOR = 'AUDITOR',
  OPERATOR = 'OPERATOR',
  ANONYMOUS = 'ANONYMOUS',
}

export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  max: number; // Max requests per window
}

/**
 * Default rate limits by role
 */
const DEFAULT_ROLE_LIMITS: Record<UserRole, RateLimitConfig> = {
  [UserRole.ADMIN]: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // 1000 requests per 15 min
  },
  [UserRole.ACCOUNTANT]: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 500, // 500 requests per 15 min
  },
  [UserRole.AUDITOR]: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 300, // 300 requests per 15 min (read-only mostly)
  },
  [UserRole.OPERATOR]: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 200, // 200 requests per 15 min
  },
  [UserRole.ANONYMOUS]: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per 15 min
  },
};

/**
 * Get rate limit key for user
 */
function getRateLimitKey(userId: string, identifier: string): string {
  return `ratelimit:${identifier}:${userId}`;
}

/**
 * Increment counter in Redis or memory
 */
async function incrementCounter(key: string, windowMs: number): Promise<number> {
  if (isRedisConnected && redisClient) {
    try {
      const multi = redisClient.multi();
      multi.incr(key);
      multi.pExpire(key, windowMs);
      const results = await multi.exec();
      return results?.[0] as number || 1;
    } catch (error: any) {
      logger.error('Failed to increment rate limit counter in Redis', {
        error: error.message,
        key,
      });
    }
  }

  // Fallback to memory
  const now = Date.now();
  const stored = memoryStore.get(key);

  if (!stored || now > stored.resetTime) {
    // Create new window
    memoryStore.set(key, { count: 1, resetTime: now + windowMs });
    return 1;
  } else {
    // Increment existing window
    stored.count++;
    memoryStore.set(key, stored);
    return stored.count;
  }
}

// getCounter removed as it was unused

/**
 * Get TTL for key
 */
async function getTTL(key: string): Promise<number> {
  if (isRedisConnected && redisClient) {
    try {
      const ttl = await redisClient.pTTL(key);
      return ttl > 0 ? ttl : 0;
    } catch (error: any) {
      logger.error('Failed to get TTL from Redis', {
        error: error.message,
        key,
      });
    }
  }

  // Check memory
  const stored = memoryStore.get(key);
  if (!stored) return 0;
  const remaining = stored.resetTime - Date.now();
  return remaining > 0 ? remaining : 0;
}

/**
 * Advanced rate limiting middleware
 */
export const advancedRateLimit = (options: {
  identifier?: string; // Custom identifier (e.g., 'api', 'invoices', 'auth')
  roleLimits?: Partial<Record<UserRole, RateLimitConfig>>; // Override default limits
  keyGenerator?: (req: Request) => string; // Custom key generator
  skip?: (req: Request) => boolean; // Skip rate limiting for certain requests
  handler?: (req: Request, res: Response) => void; // Custom rate limit exceeded handler
} = {}) => {
  const {
    identifier = 'api',
    roleLimits = {},
    keyGenerator,
    skip,
    handler,
  } = options;

  return async (req: Request, res: Response, next: NextFunction) => {
    // Skip rate limiting if function returns true
    if (skip && skip(req)) {
      return next();
    }

    const context = getContext(req);
    const user = (req as any).user;
    
    // Determine user role
    const role = (user?.role || UserRole.ANONYMOUS) as UserRole;
    
    // Get rate limit config for role
    const limitConfig = roleLimits[role] || DEFAULT_ROLE_LIMITS[role] || DEFAULT_ROLE_LIMITS[UserRole.ANONYMOUS];
    
    // Generate rate limit key
    let key: string;
    if (keyGenerator) {
      key = keyGenerator(req);
    } else {
      const userId = user?.id || req.ip || 'anonymous';
      key = getRateLimitKey(userId, identifier);
    }

    try {
      // Increment counter
      const current = await incrementCounter(key, limitConfig.windowMs);
      
      // Get remaining time
      const ttl = await getTTL(key);
      const resetTime = Math.ceil(Date.now() + ttl);

      // Set rate limit headers
      res.setHeader('X-RateLimit-Limit', limitConfig.max.toString());
      res.setHeader('X-RateLimit-Remaining', Math.max(0, limitConfig.max - current).toString());
      res.setHeader('X-RateLimit-Reset', resetTime.toString());

      // Check if limit exceeded
      if (current > limitConfig.max) {
        logger.warn('Rate limit exceeded', {
          requestId: context?.requestId,
          userId: user?.id,
          role,
          identifier,
          current,
          limit: limitConfig.max,
        });

        // Use custom handler or default
        if (handler) {
          return handler(req, res);
        } else {
          return res.status(429).json({
            success: false,
            error: 'Too many requests',
            retryAfter: Math.ceil(ttl / 1000),
            limit: limitConfig.max,
            remaining: 0,
            resetTime,
          });
        }
      }

      next();
    } catch (error: any) {
      logger.error('Rate limiting error', {
        error: error.message,
        requestId: context?.requestId,
        key,
      });
      
      // Don't block request on rate limiting error
      next();
    }
  };
};

/**
 * Pre-configured rate limiters for common scenarios
 */
export const rateLimiters = {
  /**
   * General API rate limiter
   */
  api: advancedRateLimit({
    identifier: 'api',
  }),

  /**
   * Authentication endpoints (stricter limits in production)
   */
  auth: advancedRateLimit({
    identifier: 'auth',
    roleLimits: {
      [UserRole.ANONYMOUS]: { 
        windowMs: 15 * 60 * 1000, 
        max: process.env.NODE_ENV === 'development' ? 1000 : 10 
      },
    },
  }),

  /**
   * Invoice operations
   */
  invoices: advancedRateLimit({
    identifier: 'invoices',
    roleLimits: {
      [UserRole.ADMIN]: { windowMs: 15 * 60 * 1000, max: 500 },
      [UserRole.ACCOUNTANT]: { windowMs: 15 * 60 * 1000, max: 300 },
      [UserRole.OPERATOR]: { windowMs: 15 * 60 * 1000, max: 100 },
    },
  }),

  /**
   * SEF operations (very strict)
   */
  sef: advancedRateLimit({
    identifier: 'sef',
    roleLimits: {
      [UserRole.ADMIN]: { windowMs: 60 * 60 * 1000, max: 100 }, // 100 per hour
      [UserRole.ACCOUNTANT]: { windowMs: 60 * 60 * 1000, max: 50 }, // 50 per hour
      [UserRole.OPERATOR]: { windowMs: 60 * 60 * 1000, max: 20 }, // 20 per hour
    },
  }),

  /**
   * Dashboard/stats endpoints (lenient)
   */
  dashboard: advancedRateLimit({
    identifier: 'dashboard',
    roleLimits: {
      [UserRole.ADMIN]: { windowMs: 1 * 60 * 1000, max: 60 }, // 60 per minute
      [UserRole.ACCOUNTANT]: { windowMs: 1 * 60 * 1000, max: 30 },
      [UserRole.AUDITOR]: { windowMs: 1 * 60 * 1000, max: 30 },
    },
  }),
};

/**
 * Reset rate limit for user (useful for testing or manual intervention)
 */
export async function resetUserRateLimit(
  userId: string,
  identifier: string = 'api'
): Promise<void> {
  const key = getRateLimitKey(userId, identifier);

  if (isRedisConnected && redisClient) {
    try {
      await redisClient.del(key);
      logger.info('Reset rate limit for user', { userId, identifier });
    } catch (error: any) {
      logger.error('Failed to reset rate limit', {
        error: error.message,
        userId,
        identifier,
      });
    }
  }

  memoryStore.delete(key);
}

