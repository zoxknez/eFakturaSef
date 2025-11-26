// Enhanced webhook signature verification middleware
import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { createClient, RedisClientType } from 'redis';
import { config } from '../config';
import { logger } from '../utils/logger';

// Redis client for nonce storage
let redisClient: RedisClientType | null = null;
let redisConnected = false;

// Fallback: In-memory nonce storage (used when Redis is unavailable)
const nonceCache = new Map<string, number>();

// Initialize Redis connection
async function initRedis(): Promise<void> {
  try {
    redisClient = createClient({
      url: config.REDIS_URL,
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > 10) {
            logger.warn('Redis reconnection failed after 10 attempts, using in-memory fallback');
            return false;
          }
          return Math.min(retries * 100, 3000);
        },
      },
    });

    redisClient.on('error', (err) => {
      logger.warn('Redis connection error, using in-memory fallback:', err.message);
      redisConnected = false;
    });

    redisClient.on('connect', () => {
      logger.info('Redis connected for webhook nonce storage');
      redisConnected = true;
    });

    redisClient.on('disconnect', () => {
      logger.warn('Redis disconnected, using in-memory fallback');
      redisConnected = false;
    });

    await redisClient.connect();
  } catch (error) {
    logger.warn('Failed to initialize Redis for webhook nonces, using in-memory fallback:', error);
    redisClient = null;
    redisConnected = false;
  }
}

// Initialize Redis on module load
initRedis();

// Cleanup old nonces from in-memory cache periodically (every 5 minutes)
setInterval(() => {
  if (!redisConnected) {
    const now = Date.now();
    const FIVE_MINUTES = 5 * 60 * 1000;
    
    for (const [nonce, timestamp] of nonceCache.entries()) {
      if (now - timestamp > FIVE_MINUTES) {
        nonceCache.delete(nonce);
      }
    }
    
    if (nonceCache.size > 0) {
      logger.debug(`Cleaned up in-memory nonce cache, remaining: ${nonceCache.size}`);
    }
  }
}, 5 * 60 * 1000);

/**
 * Check if nonce exists (Redis or in-memory fallback)
 */
async function checkAndStoreNonce(nonce: string): Promise<boolean> {
  const nonceKey = `webhook:nonce:${nonce}`;
  
  // Try Redis first
  if (redisConnected && redisClient) {
    try {
      const exists = await redisClient.exists(nonceKey);
      
      if (exists) {
        return true; // Nonce already used
      }
      
      // Store nonce with 5-minute expiration
      await redisClient.setEx(nonceKey, 300, Date.now().toString());
      return false; // Nonce is new
    } catch (error) {
      logger.warn('Redis nonce check failed, falling back to in-memory:', error);
      // Fall through to in-memory
    }
  }
  
  // In-memory fallback
  if (nonceCache.has(nonce)) {
    return true; // Nonce already used
  }
  
  // Store nonce with timestamp
  nonceCache.set(nonce, Date.now());
  
  // Limit cache size (prevent memory exhaustion)
  if (nonceCache.size > 10000) {
    const firstKey = nonceCache.keys().next().value;
    if (firstKey !== undefined) {
      nonceCache.delete(firstKey);
    }
  }
  
  return false; // Nonce is new
}

export interface WebhookPayload {
  timestamp?: string | number;
  nonce?: string;
  [key: string]: any;
}

/**
 * Verify webhook signature with enhanced security
 * - Validates HMAC signature
 * - Checks timestamp to prevent replay attacks
 * - Tracks nonces to prevent duplicate processing
 */
export const verifyWebhookSignature = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const signatureHeader = req.get('X-SEF-Signature');
    const timestampHeader = req.get('X-SEF-Timestamp');
    const nonceHeader = req.get('X-SEF-Nonce');

    if (!config.WEBHOOK_SECRET) {
      logger.warn('WEBHOOK_SECRET not configured, skipping verification');
      return next();
    }

    // 1. Check signature presence
    if (!signatureHeader) {
      logger.warn('Webhook signature missing');
      return res.status(401).json({ 
        success: false, 
        error: 'Missing webhook signature' 
      });
    }

    // 2. Validate timestamp (must be within 5 minutes)
    const timestamp = timestampHeader || req.body.timestamp;
    if (timestamp) {
      const webhookTime = typeof timestamp === 'string' ? parseInt(timestamp) : timestamp;
      const now = Date.now();
      const MAX_TIMESTAMP_DIFF = 5 * 60 * 1000; // 5 minutes

      if (Math.abs(now - webhookTime) > MAX_TIMESTAMP_DIFF) {
        logger.warn('Webhook timestamp too old or in future', {
          webhookTime,
          now,
          diff: now - webhookTime,
        });
        return res.status(401).json({ 
          success: false, 
          error: 'Webhook timestamp expired or invalid' 
        });
      }
    } else {
      logger.warn('Webhook timestamp missing');
      // Optional: make this required in production
      // return res.status(401).json({ success: false, error: 'Missing timestamp' });
    }

    // 3. Check nonce for replay protection
    const nonce = nonceHeader || req.body.nonce;
    if (nonce) {
      const isDuplicate = await checkAndStoreNonce(nonce);
      
      if (isDuplicate) {
        logger.warn('Duplicate webhook nonce detected - possible replay attack', { nonce });
        return res.status(401).json({ 
          success: false, 
          error: 'Duplicate request detected' 
        });
      }
    }

    // 4. Verify HMAC signature
    const payloadString = JSON.stringify(req.body);
    const expectedSignature = crypto
      .createHmac('sha256', config.WEBHOOK_SECRET)
      .update(payloadString)
      .digest('hex');

    // Support both formats: "sha256=..." and raw hex
    const receivedSignature = signatureHeader.startsWith('sha256=')
      ? signatureHeader.substring(7)
      : signatureHeader;

    // Use timing-safe comparison to prevent timing attacks
    const isValid = crypto.timingSafeEqual(
      Buffer.from(expectedSignature, 'hex'),
      Buffer.from(receivedSignature, 'hex')
    );

    if (!isValid) {
      logger.warn('Invalid webhook signature', {
        received: receivedSignature.substring(0, 10) + '...',
        expected: expectedSignature.substring(0, 10) + '...',
      });
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid signature' 
      });
    }

    // Signature is valid
    logger.debug('Webhook signature verified successfully');
    next();
  } catch (error: any) {
    logger.error('Webhook verification error', {
      error: error.message,
      stack: error.stack,
    });
    return res.status(500).json({ 
      success: false, 
      error: 'Verification failed' 
    });
  }
};

/**
 * Graceful shutdown - close Redis connection
 */
export async function closeWebhookRedis(): Promise<void> {
  if (redisClient && redisConnected) {
    try {
      await redisClient.quit();
      logger.info('Webhook Redis connection closed');
    } catch (error) {
      logger.warn('Error closing webhook Redis connection:', error);
    }
  }
}

