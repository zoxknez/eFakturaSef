// Idempotency middleware for SEF operations
import { Request, Response, NextFunction } from 'express';
import { createClient, RedisClientType } from 'redis';
import { config } from '../config';
import { logger } from '../utils/logger';
import { getContext } from './requestContext';

// Redis client for idempotency
let redisClient: RedisClientType | null = null;
let isRedisConnected = false;

// In-memory fallback (for development without Redis)
const memoryCache = new Map<string, { statusCode: number; body: any; timestamp: number }>();

/**
 * Initialize Redis connection for idempotency
 */
export async function initIdempotencyRedis(): Promise<void> {
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
      logger.error('Idempotency Redis error', { error: err.message });
      isRedisConnected = false;
    });

    redisClient.on('connect', () => {
      logger.info('Idempotency Redis connected');
      isRedisConnected = true;
    });

    await redisClient.connect();
  } catch (error: any) {
    logger.warn('Failed to connect to Redis for idempotency, using in-memory fallback', {
      error: error.message,
    });
    isRedisConnected = false;
  }
}

/**
 * Close Redis connection
 */
export async function closeIdempotencyRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    logger.info('Idempotency Redis connection closed');
  }
}

/**
 * Store response in cache
 */
async function storeResponse(
  key: string,
  statusCode: number,
  body: any,
  ttl: number = 3600 // 1 hour default
): Promise<void> {
  const value = JSON.stringify({ statusCode, body, timestamp: Date.now() });

  if (isRedisConnected && redisClient) {
    try {
      await redisClient.setEx(key, ttl, value);
    } catch (error: any) {
      logger.error('Failed to store idempotency response in Redis', {
        error: error.message,
        key,
      });
      // Fallback to memory
      memoryCache.set(key, { statusCode, body, timestamp: Date.now() });
    }
  } else {
    // Use in-memory cache
    memoryCache.set(key, { statusCode, body, timestamp: Date.now() });
    
    // Cleanup old entries (older than TTL)
    const now = Date.now();
    for (const [k, v] of memoryCache.entries()) {
      if (now - v.timestamp > ttl * 1000) {
        memoryCache.delete(k);
      }
    }
  }
}

/**
 * Retrieve response from cache
 */
async function getResponse(
  key: string
): Promise<{ statusCode: number; body: any } | null> {
  if (isRedisConnected && redisClient) {
    try {
      const value = await redisClient.get(key);
      if (value) {
        const parsed = JSON.parse(value);
        return { statusCode: parsed.statusCode, body: parsed.body };
      }
    } catch (error: any) {
      logger.error('Failed to retrieve idempotency response from Redis', {
        error: error.message,
        key,
      });
    }
  }

  // Check in-memory cache
  const cached = memoryCache.get(key);
  if (cached) {
    return { statusCode: cached.statusCode, body: cached.body };
  }

  return null;
}

/**
 * Generate idempotency key
 */
function generateIdempotencyKey(req: Request, idempotencyKey: string): string {
  const userId = (req as any).user?.id || 'anonymous';
  const path = req.path;
  const method = req.method;
  
  // Include user ID, path, method, and idempotency key
  return `idempotency:${userId}:${method}:${path}:${idempotencyKey}`;
}

/**
 * Validate idempotency key format
 */
function isValidIdempotencyKey(key: string): boolean {
  // Must be UUID or alphanumeric string (min 16 chars)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const alphanumericRegex = /^[A-Za-z0-9\-_]{16,}$/;
  
  return uuidRegex.test(key) || alphanumericRegex.test(key);
}

/**
 * Idempotency middleware
 * Ensures that identical requests are not processed multiple times
 */
export const idempotency = (options: {
  ttl?: number; // Cache TTL in seconds (default: 1 hour)
  required?: boolean; // Whether Idempotency-Key header is required
} = {}) => {
  const { ttl = 3600, required = false } = options;

  return async (req: Request, res: Response, next: NextFunction) => {
    // Only apply to non-GET requests
    if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
      return next();
    }

    // Get idempotency key from header
    const idempotencyKey = req.get('Idempotency-Key') || req.get('idempotency-key');

    if (!idempotencyKey) {
      if (required) {
        return res.status(400).json({
          success: false,
          error: 'Idempotency-Key header is required',
        });
      }
      // If not required, proceed without idempotency
      return next();
    }

    // Validate idempotency key format
    if (!isValidIdempotencyKey(idempotencyKey)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid Idempotency-Key format (must be UUID or min 16 chars)',
      });
    }

    const context = getContext(req);
    const cacheKey = generateIdempotencyKey(req, idempotencyKey);

    try {
      // Check if we've seen this request before
      const cachedResponse = await getResponse(cacheKey);

      if (cachedResponse) {
        logger.info('Idempotent request detected, returning cached response', {
          requestId: context?.requestId,
          idempotencyKey,
          cachedStatusCode: cachedResponse.statusCode,
        });

        // Return cached response
        return res
          .status(cachedResponse.statusCode)
          .setHeader('X-Idempotent-Replay', 'true')
          .json(cachedResponse.body);
      }

      // Store original send function
      const originalSend = res.send;

      // Override send to cache the response
      res.send = function (data: any): Response {
        res.send = originalSend;

        // Only cache successful responses (2xx)
        if (res.statusCode >= 200 && res.statusCode < 300) {
          let body;
          try {
            body = typeof data === 'string' ? JSON.parse(data) : data;
          } catch {
            body = data;
          }

          // Store response asynchronously
          setImmediate(async () => {
            try {
              await storeResponse(cacheKey, res.statusCode, body, ttl);
              logger.debug('Cached idempotent response', {
                requestId: context?.requestId,
                idempotencyKey,
                statusCode: res.statusCode,
                ttl,
              });
            } catch (error: any) {
              logger.error('Failed to cache idempotent response', {
                error: error.message,
                idempotencyKey,
              });
            }
          });
        }

        return originalSend.call(this, data);
      };

      next();
    } catch (error: any) {
      logger.error('Idempotency middleware error', {
        error: error.message,
        requestId: context?.requestId,
        idempotencyKey,
      });
      
      // Don't block request on idempotency error
      next();
    }
  };
};

/**
 * Delete cached response (for manual cleanup)
 */
export async function deleteIdempotentResponse(
  userId: string,
  method: string,
  path: string,
  idempotencyKey: string
): Promise<void> {
  const key = `idempotency:${userId}:${method}:${path}:${idempotencyKey}`;

  if (isRedisConnected && redisClient) {
    try {
      await redisClient.del(key);
    } catch (error: any) {
      logger.error('Failed to delete idempotent response', {
        error: error.message,
        key,
      });
    }
  }

  memoryCache.delete(key);
}

/**
 * Clear all idempotent responses for a user (useful for testing)
 */
export async function clearUserIdempotency(userId: string): Promise<void> {
  const pattern = `idempotency:${userId}:*`;

  if (isRedisConnected && redisClient) {
    try {
      // Scan and delete matching keys
      const keys: string[] = [];
      for await (const key of redisClient.scanIterator({ MATCH: pattern })) {
        keys.push(key);
      }
      
      if (keys.length > 0) {
        await redisClient.del(keys);
      }
      
      logger.info('Cleared idempotent responses for user', { userId, count: keys.length });
    } catch (error: any) {
      logger.error('Failed to clear user idempotency', {
        error: error.message,
        userId,
      });
    }
  }

  // Clear from memory cache
  for (const key of memoryCache.keys()) {
    if (key.startsWith(`idempotency:${userId}:`)) {
      memoryCache.delete(key);
    }
  }
}

