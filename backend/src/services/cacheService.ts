// Caching service with Redis backend
import { createClient, RedisClientType } from 'redis';
import { config } from '../config';
import { logger } from '../utils/logger';

// Redis client for caching
let redisClient: RedisClientType | null = null;
let isRedisConnected = false;

// In-memory fallback cache
const memoryCache = new Map<string, { value: any; expiry: number }>();

/**
 * Initialize Redis connection for caching
 */
export async function initCacheRedis(): Promise<void> {
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
      logger.error('Cache Redis error', { error: err.message });
      isRedisConnected = false;
    });

    redisClient.on('connect', () => {
      logger.info('Cache Redis connected');
      isRedisConnected = true;
    });

    await redisClient.connect();
  } catch (error: any) {
    logger.warn('Failed to connect to Redis for caching, using in-memory fallback', {
      error: error.message,
    });
    isRedisConnected = false;
  }
}

/**
 * Close Redis connection
 */
export async function closeCacheRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    logger.info('Cache Redis connection closed');
  }
}

/**
 * Cache key prefixes for different data types
 */
export enum CachePrefix {
  DASHBOARD = 'dashboard',
  INVOICE = 'invoice',
  COMPANY = 'company',
  USER = 'user',
  STATS = 'stats',
  SEF_STATUS = 'sef_status',
  PARTNER = 'partner',
  PRODUCT = 'product',
}

/**
 * Generate cache key
 */
function generateKey(prefix: CachePrefix, identifier: string): string {
  return `cache:${prefix}:${identifier}`;
}

/**
 * Set value in cache
 */
export async function set(
  prefix: CachePrefix,
  identifier: string,
  value: any,
  ttl: number = 300 // 5 minutes default
): Promise<void> {
  const key = generateKey(prefix, identifier);
  const serialized = JSON.stringify(value);

  if (isRedisConnected && redisClient) {
    try {
      await redisClient.setEx(key, ttl, serialized);
      logger.debug('Cached value', { key, ttl });
    } catch (error: any) {
      logger.error('Failed to set cache value in Redis', {
        error: error.message,
        key,
      });
      // Fallback to memory
      memoryCache.set(key, { value, expiry: Date.now() + ttl * 1000 });
    }
  } else {
    // Use in-memory cache
    memoryCache.set(key, { value, expiry: Date.now() + ttl * 1000 });
    
    // Cleanup expired entries
    cleanupMemoryCache();
  }
}

/**
 * Get value from cache
 */
export async function get<T = any>(
  prefix: CachePrefix,
  identifier: string
): Promise<T | null> {
  const key = generateKey(prefix, identifier);

  if (isRedisConnected && redisClient) {
    try {
      const cached = await redisClient.get(key);
      if (cached) {
        logger.debug('Cache hit', { key });
        return JSON.parse(cached) as T;
      }
    } catch (error: any) {
      logger.error('Failed to get cache value from Redis', {
        error: error.message,
        key,
      });
    }
  }

  // Check in-memory cache
  const memoryCached = memoryCache.get(key);
  if (memoryCached && Date.now() < memoryCached.expiry) {
    logger.debug('Memory cache hit', { key });
    return memoryCached.value as T;
  }

  logger.debug('Cache miss', { key });
  return null;
}

/**
 * Delete value from cache
 */
export async function del(prefix: CachePrefix, identifier: string): Promise<void> {
  const key = generateKey(prefix, identifier);

  if (isRedisConnected && redisClient) {
    try {
      await redisClient.del(key);
      logger.debug('Deleted cache value', { key });
    } catch (error: any) {
      logger.error('Failed to delete cache value from Redis', {
        error: error.message,
        key,
      });
    }
  }

  memoryCache.delete(key);
}

/**
 * Invalidate cache by pattern
 */
export async function invalidatePattern(pattern: string): Promise<void> {
  if (isRedisConnected && redisClient) {
    try {
      const keys: string[] = [];
      for await (const key of redisClient.scanIterator({ MATCH: pattern })) {
        keys.push(key);
      }
      
      if (keys.length > 0) {
        await redisClient.del(keys);
        logger.info('Invalidated cache keys', { pattern, count: keys.length });
      }
    } catch (error: any) {
      logger.error('Failed to invalidate cache pattern', {
        error: error.message,
        pattern,
      });
    }
  }

  // Invalidate from memory cache
  for (const key of memoryCache.keys()) {
    if (key.includes(pattern.replace('*', ''))) {
      memoryCache.delete(key);
    }
  }
}

/**
 * Clear all cache
 */
export async function clearAll(): Promise<void> {
  if (isRedisConnected && redisClient) {
    try {
      await redisClient.flushDb();
      logger.info('Cleared all cache');
    } catch (error: any) {
      logger.error('Failed to clear all cache', { error: error.message });
    }
  }

  memoryCache.clear();
}

/**
 * Cleanup expired entries from memory cache
 */
function cleanupMemoryCache(): void {
  const now = Date.now();
  for (const [key, entry] of memoryCache.entries()) {
    if (now > entry.expiry) {
      memoryCache.delete(key);
    }
  }
  
  // Limit memory cache size
  if (memoryCache.size > 1000) {
    const firstKey = memoryCache.keys().next().value;
    if (firstKey !== undefined) {
      memoryCache.delete(firstKey);
    }
  }
}

/**
 * Get or set pattern (cache-aside strategy)
 */
export async function getOrSet<T = any>(
  prefix: CachePrefix,
  identifier: string,
  fetcher: () => Promise<T>,
  ttl: number = 300
): Promise<T> {
  // Try to get from cache
  const cached = await get<T>(prefix, identifier);
  if (cached !== null) {
    return cached;
  }

  // Fetch fresh data
  const fresh = await fetcher();

  // Store in cache
  await set(prefix, identifier, fresh, ttl);

  return fresh;
}

/**
 * Cache invalidation strategies
 */
export const invalidate = {
  /**
   * Invalidate dashboard cache for a company
   */
  async dashboard(companyId: string): Promise<void> {
    await invalidatePattern(`cache:${CachePrefix.DASHBOARD}:${companyId}:*`);
  },

  /**
   * Invalidate invoice cache
   */
  async invoice(invoiceId: string): Promise<void> {
    await del(CachePrefix.INVOICE, invoiceId);
  },

  /**
   * Invalidate company cache
   */
  async company(companyId: string): Promise<void> {
    await del(CachePrefix.COMPANY, companyId);
    await invalidatePattern(`cache:${CachePrefix.DASHBOARD}:${companyId}:*`);
  },

  /**
   * Invalidate all stats cache
   */
  async allStats(): Promise<void> {
    await invalidatePattern(`cache:${CachePrefix.STATS}:*`);
    await invalidatePattern(`cache:${CachePrefix.DASHBOARD}:*`);
  },

  /**
   * Invalidate SEF status cache
   */
  async sefStatus(sefId: string): Promise<void> {
    await del(CachePrefix.SEF_STATUS, sefId);
  },
};

/**
 * Cache middleware for Express routes
 */
export function cacheMiddleware(options: {
  prefix: CachePrefix;
  keyGenerator: (req: any) => string;
  ttl?: number;
}) {
  const { prefix, keyGenerator, ttl = 300 } = options;

  return async (req: any, res: any, next: any) => {
    const key = keyGenerator(req);
    
    try {
      // Try to get from cache
      const cached = await get(prefix, key);
      
      if (cached !== null) {
        res.setHeader('X-Cache', 'HIT');
        return res.json(cached);
      }

      // Cache miss - capture response
      res.setHeader('X-Cache', 'MISS');
      
      const originalJson = res.json.bind(res);
      res.json = function (data: any) {
        // Store in cache asynchronously
        setImmediate(async () => {
          try {
            await set(prefix, key, data, ttl);
          } catch (error: any) {
            logger.error('Failed to cache response', {
              error: error.message,
              key,
            });
          }
        });

        return originalJson(data);
      };

      next();
    } catch (error: any) {
      logger.error('Cache middleware error', {
        error: error.message,
        key,
      });
      // Continue without caching on error
      next();
    }
  };
}

export default {
  init: initCacheRedis,
  close: closeCacheRedis,
  set,
  get,
  del,
  invalidate,
  invalidatePattern,
  clearAll,
  getOrSet,
  cacheMiddleware,
  CachePrefix,
};

